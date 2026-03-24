# Manual de Implantación: Integración de Cortafuegos con Wazuh
## By Sistemas 127

---

## Índice
1. [Resumen general](#1-resumen-general)
2. [Requisitos previos](#2-requisitos-previos)
3. [Windows Defender Firewall](#3-windows-defender-firewall)
4. [OPNsense](#4-opnsense)
5. [pfSense](#5-pfsense)
6. [iptables / UFW (Linux)](#6-iptables--ufw)
7. [IDS Anti-Ransomware](#7-ids-anti-ransomware)
8. [Verificación y pruebas](#8-verificacion-y-pruebas)
9. [Solución de problemas](#9-solucion-de-problemas)

---

## 1. Resumen general

Este módulo configura **Wazuh** como plataforma central de monitorización de cortafuegos. Permite:
- Recibir y analizar logs de **Windows Defender**, **OPNsense**, **pfSense** e **iptables/UFW**
- Detectar escaneos de puertos, ataques DDoS, modificaciones en reglas y conexiones sospechosas
- Aislar automáticamente máquinas infectadas por ransomware (IDS Anti-Ransomware)

### Arquitectura

```
┌─────────────┐  syslog   ┌──────────────────┐
│  OPNsense   │──────────▶│                  │
│  pfSense    │           │   WAZUH SERVER   │
└─────────────┘           │                  │
                          │  - Reglas custom  │
┌─────────────┐  agente   │  - Decoders      │
│  Windows    │──────────▶│  - Active Resp.  │
│  Linux      │           │                  │
└─────────────┘           └──────────────────┘
```

---

## 2. Requisitos previos

### En el servidor Wazuh
| Requisito | Detalle |
|-----------|---------|
| **Wazuh Manager** | v4.x instalado y funcionando |
| **Puerto syslog** | 514/UDP abierto en el firewall del servidor |
| **Acceso root** | Para modificar ficheros de configuración |
| **Espacio en disco** | 10 GB libres mínimo para logs |

### Verificar que Wazuh funciona
```bash
systemctl status wazuh-manager
# Debe mostrar: active (running)

# Verificar versión
/var/ossec/bin/wazuh-control info
```

### Abrir puertos necesarios
```bash
# Puerto syslog para OPNsense/pfSense
sudo ufw allow 514/udp comment "Wazuh Syslog"

# Puerto de registro de agentes
sudo ufw allow 1514/tcp comment "Wazuh Agent Registration"
sudo ufw allow 1515/tcp comment "Wazuh Agent Enrollment"
```

---

## 3. Windows Defender Firewall

### 3.1 Funcionamiento
Windows Defender Firewall genera eventos en el visor de eventos de Windows. El agente Wazuh los recoge automáticamente y los envía al servidor para su análisis.

### 3.2 Instalar el agente Wazuh en Windows

#### Paso 1: Descargar el instalador
```powershell
# Desde PowerShell como Administrador
Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.0-1.msi" -OutFile "$env:TEMP\wazuh-agent.msi"
```

#### Paso 2: Instalar el agente
```powershell
msiexec.exe /i "$env:TEMP\wazuh-agent.msi" /q WAZUH_MANAGER="<IP_SERVIDOR_WAZUH>" WAZUH_AGENT_GROUP="firewalls"
```

#### Paso 3: Iniciar el servicio
```powershell
NET START WazuhSvc
```

### 3.3 EventIDs monitorizados

| EventID | Nivel | Descripción |
|---------|-------|-------------|
| 5156 | Info | Conexión de red permitida |
| 5157 | Medio | Conexión de red bloqueada |
| 5152 | Alto | Paquete descartado por WFP |
| 4946 | Medio | Regla añadida a excepciones |
| 4947 | Alto | Regla de seguridad eliminada |
| 4950 | Alto | Perfil del firewall modificado |
| 2003 | Crítico | Perfil de firewall desactivado |

### 3.4 Configuración centralizada (agent.conf)
El script configura automáticamente el fichero `/var/ossec/etc/shared/firewalls/agent.conf` en el servidor Wazuh para que los agentes Windows recojan los eventos del firewall sin intervención manual.

**Fichero:** `/var/ossec/etc/shared/firewalls/agent.conf`
```xml
<agent_config os="windows">
  <!-- Monitorizar eventos del Windows Defender Firewall -->
  <localfile>
    <location>Microsoft-Windows-Windows Firewall With Advanced Security/Firewall</location>
    <log_format>eventchannel</log_format>
  </localfile>

  <!-- Monitorizar cambios en la configuración del firewall -->
  <localfile>
    <location>Security</location>
    <log_format>eventchannel</log_format>
    <query>Event/System[EventID=4944 or EventID=4945 or EventID=4946 or EventID=4947 or EventID=4948 or EventID=4950 or EventID=4954 or EventID=4956 or EventID=4957 or EventID=4958]</query>
  </localfile>

  <!-- Auditoría de reglas del firewall via PowerShell -->
  <wodle name="command">
    <disabled>no</disabled>
    <tag>windows-firewall-rules</tag>
    <command>powershell.exe -ExecutionPolicy Bypass -Command "Get-NetFirewallRule | Where-Object {$_.Enabled -eq 'True'} | Select-Object DisplayName,Direction,Action,Profile | ConvertTo-Json"</command>
    <interval>1h</interval>
    <timeout>120</timeout>
    <run_on_start>yes</run_on_start>
  </wodle>
</agent_config>
```

### 3.5 Verificar que funciona
```bash
# En el servidor Wazuh, ver agentes del grupo firewalls
/var/ossec/bin/agent_groups -l -g firewalls

# Buscar eventos de Windows Firewall en los logs
grep "windows_firewall" /var/ossec/logs/alerts/alerts.json | tail -5
```

---

## 4. OPNsense

### 4.1 Funcionamiento
OPNsense envía sus logs de firewall al servidor Wazuh mediante syslog remoto. Wazuh usa decoders personalizados para interpretar el formato `filterlog`.

### 4.2 Configurar OPNsense

#### Paso 1: Acceder a la interfaz web
Abre `https://<IP_OPNSENSE>` en el navegador.

#### Paso 2: Configurar syslog remoto
1. Ve a **System → Settings → Logging / targets**
2. Haz clic en **"+"** para añadir un nuevo destino
3. Configura:
   - **Enabled:** ✅
   - **Transport:** UDP(4)
   - **Applications:** filterlog
   - **Levels:** Informational y superiores
   - **Hostname:** `<IP_SERVIDOR_WAZUH>`
   - **Port:** `514`
   - **Facility:** local0
4. Haz clic en **"Save"**
5. Haz clic en **"Apply"**

#### Paso 3: Verificar que OPNsense envía logs
```bash
# En el servidor Wazuh, verificar que llegan los logs
tcpdump -i any port 514 -n -c 10
```

### 4.3 Decoder personalizado
El script instala automáticamente el decoder `opnsense-filterlog` en:
```
/var/ossec/etc/decoders/firewall_custom_decoders.xml
```

### 4.4 Reglas de detección
| ID | Nivel | Descripción |
|----|-------|-------------|
| 100220 | 3 | Tráfico permitido |
| 100221 | 5 | Tráfico bloqueado |
| 100222 | 10 | Múltiples bloqueos (escaneo) |
| 100223 | 12 | Acceso bloqueado a puerto admin |

---

## 5. pfSense

### 5.1 Funcionamiento
Idéntico a OPNsense: envío por syslog remoto. Wazuh usa el decoder `pf` para interpretar los logs de packet filter.

### 5.2 Configurar pfSense

#### Paso 1: Acceder a la interfaz web
Abre `https://<IP_PFSENSE>` en el navegador.

#### Paso 2: Configurar syslog remoto
1. Ve a **Status → System Logs → Settings**
2. Marca **"Enable Remote Logging"**
3. En **"Remote log servers"**, añade: `<IP_SERVIDOR_WAZUH>:514`
4. En **"Remote Syslog Contents"**, marca:
   - ✅ Firewall Events
   - ✅ System Events (opcional)
5. Haz clic en **"Save"**

#### Paso 3: Verificar
```bash
# En el servidor Wazuh
tcpdump -i any port 514 -n -c 10
# Deberías ver paquetes desde la IP de pfSense
```

### 5.3 Reglas de detección
| ID | Nivel | Descripción |
|----|-------|-------------|
| 100230 | 3 | Tráfico permitido |
| 100231 | 5 | Tráfico bloqueado |
| 100232 | 10 | Múltiples bloqueos (escaneo) |
| 100233 | 12 | Acceso bloqueado a puerto admin |

---

## 6. iptables / UFW

### 6.1 Funcionamiento
En endpoints Linux, el agente Wazuh monitoriza los ficheros de log de iptables y UFW directamente, sin necesidad de configurar syslog remoto.

### 6.2 Instalar el agente Wazuh en Linux

```bash
# Descargar e instalar
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
apt-get update && apt-get install -y wazuh-agent

# Configurar el servidor
sed -i "s/MANAGER_IP/<IP_SERVIDOR_WAZUH>/" /var/ossec/etc/ossec.conf

# Iniciar
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

### 6.3 Habilitar logging de UFW
```bash
# Activar UFW si no está activo
sudo ufw enable

# Habilitar logging de nivel alto
sudo ufw logging high

# Verificar que se generan logs
tail -f /var/log/ufw.log
```

### 6.4 Configuración centralizada (agent.conf)
El script configura automáticamente:

**Fichero:** `/var/ossec/etc/shared/firewalls/agent.conf`
```xml
<agent_config os="linux">
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/ufw.log</location>
  </localfile>
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/kern.log</location>
  </localfile>
</agent_config>
```

### 6.5 Reglas de detección
| ID | Nivel | Descripción |
|----|-------|-------------|
| 100240 | 3 | Tráfico permitido |
| 100241 | 5 | Tráfico bloqueado (DROP/REJECT) |
| 100242 | 5 | UFW: Conexión bloqueada |
| 100243 | 8 | Conexión permitida a puerto admin |
| 100244 | 10 | Múltiples bloqueos (escaneo) |

---

## 7. IDS Anti-Ransomware

### 7.1 Qué hace
Detecta indicadores de infección por ransomware y **aísla automáticamente la máquina infectada** de la red, manteniendo solo la comunicación con el servidor Wazuh.

### 7.2 Indicadores de detección
- **50+ extensiones de ransomware** (.encrypted, .locked, .crypted, .wcry, .wncry, .locky, .cerber, .zepto, etc.)
- **Modificación masiva de ficheros:** 15+ cambios en 30 segundos
- **Notas de rescate:** README_TO_DECRYPT, DECRYPT_INSTRUCTIONS, HOW_TO_RECOVER, etc.
- **Eliminación de Shadow Copies:** `vssadmin delete shadows`, `wmic shadowcopy delete`
- **Eliminación de backups:** `wbadmin delete`, `bcdedit /set {default} recoveryenabled no`
- **Herramientas de borrado seguro:** cipher.exe /w, sdelete

### 7.3 Reglas de detección
| ID | Nivel | Descripción | MITRE |
|----|-------|-------------|-------|
| 100300 | 14 | Extensión de ransomware detectada | T1486 |
| 100301 | 14 | Modificación masiva de ficheros (15+ en 30s) | T1486 |
| 100302 | 14 | Nota de rescate creada | T1486 |
| 100303 | 15 | Eliminación de Shadow Copies/Backups | T1490 |
| 100304 | 14 | Herramienta anti-forense detectada | T1486 |

### 7.4 Aislamiento automático

#### ¿Cómo funciona?
Cuando se dispara una regla de ransomware, Wazuh ejecuta un **Active Response** que:

1. **En Linux:** Ejecuta `ransomware-isolate.sh`
   - Bloquea todo el tráfico con iptables
   - Permite solo la comunicación con el servidor Wazuh
   - Log en `/var/ossec/logs/active-responses.log`

2. **En Windows:** Ejecuta `ransomware-isolate.cmd`
   - Bloquea todo el tráfico con netsh
   - Permite solo la comunicación con el servidor Wazuh
   - Log en `C:\Program Files (x86)\ossec-agent\active-response\active-responses.log`

#### Timeout
- La máquina se aísla durante **1 hora** (3600 segundos)
- Pasado ese tiempo, las reglas se eliminan automáticamente
- Durante el aislamiento, **Wazuh sigue recibiendo datos** del agente

### 7.5 Desbloquear manualmente una máquina

#### Linux
```bash
# Ver las reglas de aislamiento
sudo iptables -L -n | grep -i "wazuh\|drop"

# Eliminar todas las reglas de aislamiento
sudo iptables -D INPUT -j DROP 2>/dev/null
sudo iptables -D OUTPUT -j DROP 2>/dev/null
sudo iptables -D INPUT -s <IP_WAZUH> -j ACCEPT 2>/dev/null
sudo iptables -D OUTPUT -d <IP_WAZUH> -j ACCEPT 2>/dev/null

# O más rápido: restaurar las reglas por defecto
sudo iptables -F
sudo iptables -P INPUT ACCEPT
sudo iptables -P OUTPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
```

#### Windows
```powershell
# Ver reglas de aislamiento
netsh advfirewall firewall show rule name="WAZUH_RANSOMWARE_ISOLATION"

# Eliminar las reglas
netsh advfirewall firewall delete rule name="WAZUH_RANSOMWARE_ISOLATION"

# O restaurar todo el firewall a su estado por defecto
netsh advfirewall reset
```

### 7.6 Ficheros de Active Response

**Linux:** `/var/ossec/active-response/bin/ransomware-isolate.sh`
```bash
#!/bin/bash
WAZUH_SERVER="<IP_SERVIDOR>"
ACTION=$1
if [ "$ACTION" = "add" ]; then
  iptables -I INPUT 1 -s $WAZUH_SERVER -j ACCEPT
  iptables -I OUTPUT 1 -d $WAZUH_SERVER -j ACCEPT
  iptables -A INPUT -j DROP
  iptables -A OUTPUT -j DROP
elif [ "$ACTION" = "delete" ]; then
  iptables -D INPUT -j DROP
  iptables -D OUTPUT -j DROP
  iptables -D INPUT -s $WAZUH_SERVER -j ACCEPT
  iptables -D OUTPUT -d $WAZUH_SERVER -j ACCEPT
fi
```

**Windows:** `C:\Program Files (x86)\ossec-agent\active-response\bin\ransomware-isolate.cmd`
```cmd
@echo off
set WAZUH_SERVER=<IP_SERVIDOR>
if "%1"=="add" (
  netsh advfirewall firewall add rule name="WAZUH_RANSOMWARE_ISOLATION" dir=out action=block
  netsh advfirewall firewall add rule name="WAZUH_RANSOMWARE_ISOLATION" dir=in action=block
  netsh advfirewall firewall add rule name="WAZUH_RANSOMWARE_ALLOW" dir=out action=allow remoteip=%WAZUH_SERVER%
  netsh advfirewall firewall add rule name="WAZUH_RANSOMWARE_ALLOW" dir=in action=allow remoteip=%WAZUH_SERVER%
)
if "%1"=="delete" (
  netsh advfirewall firewall delete rule name="WAZUH_RANSOMWARE_ISOLATION"
  netsh advfirewall firewall delete rule name="WAZUH_RANSOMWARE_ALLOW"
)
```

---

## 8. Verificación y pruebas

### 8.1 Verificar que las reglas están cargadas
```bash
# Verificar sintaxis
/var/ossec/bin/wazuh-analysisd -t

# Buscar reglas de cortafuegos
grep -c "100[2-3][0-9][0-9]" /var/ossec/etc/rules/firewall_custom_rules.xml
```

### 8.2 Probar con wazuh-logtest
```bash
/var/ossec/bin/wazuh-logtest
```

**Ejemplo de log UFW para probar:**
```
Mar  1 10:15:23 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC=00:11:22:33:44:55 SRC=192.168.1.100 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=64 ID=12345 PROTO=TCP SPT=54321 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0
```

**Ejemplo de log para probar ransomware:**
```
syscheck: File '/home/user/documents/important.encrypted' was added
```

### 8.3 Verificar agentes conectados
```bash
# Listar agentes del grupo firewalls
/var/ossec/bin/agent_groups -l -g firewalls

# Ver estado de todos los agentes
/var/ossec/bin/agent_control -l
```

### 8.4 Verificar logs de alertas
```bash
# Buscar alertas de cortafuegos
grep "firewall" /var/ossec/logs/alerts/alerts.json | tail -10

# Buscar alertas de ransomware
grep "ransomware" /var/ossec/logs/alerts/alerts.json | tail -5

# Ver alertas en tiempo real
tail -f /var/ossec/logs/alerts/alerts.json | grep -i "firewall\|ransomware"
```

---

## 9. Solución de problemas

### No llegan logs de OPNsense/pfSense
```bash
# 1. Verificar que el puerto está abierto
ss -ulnp | grep 514

# 2. Verificar con tcpdump
tcpdump -i any port 514 -n -c 5

# 3. Si no llegan paquetes, comprobar firewall del servidor
sudo ufw status | grep 514

# 4. Comprobar que OPNsense/pfSense apunta al servidor correcto
# (revisar la configuración de syslog en la interfaz web)
```

### El agente Windows no se conecta
```powershell
# Verificar estado del servicio
Get-Service WazuhSvc

# Ver logs del agente
Get-Content "C:\Program Files (x86)\ossec-agent\ossec.log" -Tail 20

# Verificar conectividad con el servidor
Test-NetConnection -ComputerName <IP_SERVIDOR_WAZUH> -Port 1514
```

### Las reglas no generan alertas
```bash
# 1. Verificar sintaxis
/var/ossec/bin/wazuh-analysisd -t

# 2. Verificar que las reglas están en el directorio correcto
ls -la /var/ossec/etc/rules/firewall_custom_rules.xml

# 3. Reiniciar Wazuh Manager
systemctl restart wazuh-manager

# 4. Probar manualmente con logtest
/var/ossec/bin/wazuh-logtest
```

### El aislamiento por ransomware no funciona
```bash
# Verificar que el script existe y tiene permisos
ls -la /var/ossec/active-response/bin/ransomware-isolate.sh
chmod 750 /var/ossec/active-response/bin/ransomware-isolate.sh
chown root:wazuh /var/ossec/active-response/bin/ransomware-isolate.sh

# Verificar la configuración de Active Response en ossec.conf
grep -A5 "ransomware" /var/ossec/etc/ossec.conf

# Probar el script manualmente (CUIDADO: aislará la máquina)
# /var/ossec/active-response/bin/ransomware-isolate.sh add
```

---

*Manual generado por SOC Automation - By Sistemas 127*
