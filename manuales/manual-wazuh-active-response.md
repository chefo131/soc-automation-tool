# Manual de Active Response: Wazuh
## By Sistemas 127

---

## Índice
1. [Qué es Active Response](#1-que-es-active-response)
2. [Arquitectura del sistema](#2-arquitectura)
3. [Scripts Windows / Windows Server](#3-scripts-windows)
4. [Scripts Linux](#4-scripts-linux)
5. [Reglas de disparo (Trigger Rules)](#5-reglas-de-disparo)
6. [Auto-despliegue a agentes](#6-auto-despliegue)
7. [Software necesario en los clientes](#7-software-necesario)
8. [Verificación y pruebas](#8-verificacion)
9. [Solución de problemas](#9-solucion-problemas)

---

## 1. Qué es Active Response

Active Response de Wazuh permite ejecutar **acciones automáticas** en los agentes cuando se detecta una amenaza. A diferencia de las alertas pasivas, Active Response **actúa** en tiempo real:

| Acción | Windows | Linux | Descripción |
|--------|---------|-------|-------------|
| Bloqueo de IP | ✅ Windows Firewall | ✅ iptables/nftables/firewalld | Bloquea IP atacante inbound+outbound |
| Deshabilitar usuario | ✅ Local + AD | ✅ usermod -L + chage | Bloquea cuentas comprometidas |
| Aislamiento de host | ✅ Firewall profiles | ✅ iptables DROP all | Aislamiento total excepto Wazuh |
| Matar proceso | ✅ Stop-Process | ✅ pkill -9 | Elimina procesos maliciosos |
| Recolección forense | ✅ PowerShell | ✅ Bash | Captura estado del sistema |

### Flujo de Active Response
```
Evento → Wazuh Decoder → Regla Level 12+ → Trigger Rule → Active Response → Script en Agente
```

---

## 2. Arquitectura del sistema

### Ficheros en el servidor Wazuh
```
/var/ossec/
├── etc/
│   ├── ossec.conf                          # Configuración de commands y active-response
│   ├── rules/
│   │   └── active_response_rules.xml       # Reglas de disparo (IDs 100400-100423)
│   └── shared/
│       └── default/
│           ├── agent.conf                  # Configuración auto-desplegada a agentes
│           ├── block-ip.ps1                # Script Windows: bloqueo IP
│           ├── disable-user.ps1            # Script Windows: deshabilitar usuario
│           ├── isolate-host.ps1            # Script Windows: aislamiento
│           ├── kill-process.ps1            # Script Windows: matar proceso
│           └── collect-forensics.ps1       # Script Windows: forense
├── active-response/
│   └── bin/
│       ├── linux-block-ip.sh              # Script Linux: bloqueo IP
│       ├── linux-disable-user.sh          # Script Linux: deshabilitar usuario
│       ├── linux-isolate-host.sh          # Script Linux: aislamiento
│       ├── linux-kill-process.sh          # Script Linux: matar proceso
│       └── linux-collect-forensics.sh     # Script Linux: forense
└── logs/
    ├── active-responses.log               # Log de todas las acciones AR
    └── alerts/
        └── alerts.json                    # Alertas que disparan AR
```

---

## 3. Scripts Windows / Windows Server

### 3.1 Bloqueo de IP (block-ip.ps1)
**Función:** Crea reglas en Windows Firewall para bloquear IPs atacantes.
- Bloquea tanto tráfico entrante como saliente
- Crea reglas con nombre `WazuhBlock_<IP>` para fácil identificación
- Soporta desbloqueo automático (timeout configurable)

**Se activa con:**
- Fuerza bruta SSH/RDP (EventID 4625 repetido)
- Port scan detectado
- Conexión desde nodo Tor
- Cryptominer detectado

### 3.2 Deshabilitar Usuario (disable-user.ps1)
**Función:** Deshabilita cuentas locales y de Active Directory comprometidas.
- Compatible con Windows 10/11, Windows Server 2016/2019/2022
- Detecta si existe Active Directory y usa `Disable-ADAccount`
- Para equipos sin AD, usa `Disable-LocalUser`
- Re-habilitación automática tras timeout

**Se activa con:**
- Múltiples fallos de login (EventID 4625)
- Intento de sudo no autorizado
- Lockout de cuenta (EventID 4740)

### 3.3 Aislamiento de Host (isolate-host.ps1)
**Función:** Aísla completamente el host de la red.
- Cambia perfil de firewall a Block All (Domain, Public, Private)
- Permite ÚNICAMENTE comunicación con el servidor Wazuh (puertos 1514/1515)
- Guarda backup del firewall en `C:\ProgramData\wazuh-fw-backup.wfw`
- Reversible: restaura el firewall original al desaislar

**⚠️ PELIGRO:** Esta acción corta TODA la conectividad de red excepto con Wazuh.

**Se activa con:**
- Ransomware detectado (Level 15)
- Rootkit detectado (Level 15)
- Reverse shell detectado (Level 15)

### 3.4 Matar Proceso (kill-process.ps1)
**Función:** Termina procesos maliciosos en ejecución.
- Recolecta información forense antes de matar (PID, ruta, línea de comandos)
- Usa `Stop-Process -Force`
- Registra toda la actividad en el log de AR

**Se activa con:**
- Reverse shell detectado
- Cryptominer detectado

### 3.5 Recolección Forense (collect-forensics.ps1)
**Función:** Captura un snapshot completo del estado del sistema.
- Conexiones de red activas (`Get-NetTCPConnection`)
- Procesos en ejecución con rutas
- Eventos de seguridad (últimos 200)
- Tareas programadas activas
- Servicios en ejecución
- Entradas de autorun (Run keys del registro)
- Cache DNS
- Tabla ARP

Los datos se guardan en `C:\ProgramData\wazuh-forensics\<timestamp>`

**Se activa con:** Cualquier evento crítico (Level 13+)

---

## 4. Scripts Linux

### 4.1 Bloqueo de IP (linux-block-ip.sh)
**Función:** Bloquea IPs atacantes usando el firewall disponible.
- Detecta automáticamente: iptables, nftables o firewalld
- Aplica reglas en TODOS los firewalls disponibles para máxima compatibilidad
- Soporta desbloqueo automático

### 4.2 Deshabilitar Usuario (linux-disable-user.sh)
**Función:** Bloquea cuentas de usuario comprometidas.
- `usermod -L`: bloquea la contraseña
- `chage -E 0`: expira la cuenta inmediatamente
- `pkill -u`: mata todas las sesiones activas del usuario
- **Protección:** Nunca deshabilita root, wazuh ni ossec

### 4.3 Aislamiento de Host (linux-isolate-host.sh)
**Función:** Aislamiento total de red vía iptables.
- Guarda backup de reglas actuales en `/var/ossec/tmp/iptables-backup.rules`
- DROP por defecto en INPUT, OUTPUT y FORWARD
- Permite loopback y comunicación con servidor Wazuh
- Permite DNS para resolución del servidor
- Mantiene conexiones establecidas

### 4.4 Matar Proceso (linux-kill-process.sh)
**Función:** Elimina procesos maliciosos con recolección forense.
- Lee `/proc/<pid>/cmdline` y `/proc/<pid>/exe` antes de matar
- Usa `pkill -9 -f` para terminación forzada
- **Protección:** Lista de procesos protegidos (wazuh, ossec, sshd, systemd, init)

### 4.5 Recolección Forense (linux-collect-forensics.sh)
**Función:** Captura completa del estado del sistema.
- `ss -tulnpa`: conexiones de red
- `ps auxwwf`: árbol de procesos
- `lsof -i`: ficheros de red abiertos
- `last/lastb`: logins recientes y fallidos
- Crontabs de todos los usuarios
- Timers de systemd
- Módulos del kernel cargados
- Tabla ARP
- Ficheros recientes en /tmp, /var/tmp, /dev/shm
- Logs de autenticación
- Usuarios con shell activa

Datos guardados en `/var/ossec/forensics/<timestamp>` con permisos 600.

---

## 5. Reglas de disparo (Trigger Rules)

### IDs 100400-100404: Windows
| ID | Level | Descripción | Acciones AR |
|----|-------|-------------|-------------|
| 100400 | 13 | Múltiples fallos de autenticación | Block IP |
| 100401 | 13 | Login fallido Windows repetido (4625) | Block IP + Disable User |
| 100402 | 14 | Account lockout Windows (4740) | Collect Forensics |
| 100403 | 15 | Ransomware detectado | **ISOLATE HOST** |
| 100404 | 12 | Servicio sospechoso instalado (7045) | Collect Forensics |

### IDs 100410-100415: Linux
| ID | Level | Descripción | Acciones AR |
|----|-------|-------------|-------------|
| 100410 | 13 | Brute force SSH | Block IP |
| 100411 | 14 | sudo no autorizado | Disable User + Forensics |
| 100412 | 15 | Rootkit detectado | **ISOLATE HOST** |
| 100413 | 15 | Reverse shell detectado | Kill Process + Isolate |
| 100414 | 13 | /etc/passwd modificado | Collect Forensics |
| 100415 | 14 | Cryptominer detectado | Kill Process + Block IP |

### IDs 100420-100423: Cross-Platform
| ID | Level | Descripción | Acciones AR |
|----|-------|-------------|-------------|
| 100420 | 12 | Port scan detectado | Block IP |
| 100421 | 13 | Conexión Tor exit node | Block IP + Forensics |
| 100422 | 13 | Firewall deshabilitado | Collect Forensics |
| 100423 | 14 | Windows Defender desactivado | Collect Forensics |

---

## 6. Auto-despliegue a agentes

### 6.1 Windows
Los scripts PowerShell se colocan en el **shared folder** de Wazuh:
```
/var/ossec/etc/shared/default/*.ps1
```

El `agent.conf` configurado incluye:
- EventChannel: Security, System, Sysmon, PowerShell, Windows Defender
- FIM: System32\drivers\etc, System32\config, Users
- Registry monitoring: Run keys, Services

Los agentes Windows descargan automáticamente el contenido del shared folder en cada check-in (por defecto cada 10 minutos).

### 6.2 Linux
Los scripts Bash se instalan en:
```
/var/ossec/active-response/bin/
```

El `agent.conf` configurado incluye:
- Syslog: auth.log, syslog
- Audit: audit.log
- FIM: /etc, /usr/bin, /usr/sbin, /bin, /sbin, /boot, /tmp, /var/tmp
- Rootcheck completo: files, trojans, dev, sys, pids, ports, interfaces

---

## 7. Software necesario en los clientes

### 7.1 Windows (Desktop y Server)

#### Requerido
- **Wazuh Agent** (`wazuh-agent-4.x-1.msi`)
  ```powershell
  # Instalación silenciosa
  msiexec /i wazuh-agent-4.14-1.msi /q WAZUH_MANAGER="IP_SERVIDOR" WAZUH_REGISTRATION_SERVER="IP_SERVIDOR" WAZUH_AGENT_GROUP="default"
  
  # Iniciar servicio
  NET START WazuhSvc
  ```

#### Recomendado
- **Sysmon** (Microsoft Sysinternals) - Monitorización avanzada de procesos
  ```powershell
  # Descargar Sysmon
  Invoke-WebRequest -Uri "https://download.sysinternals.com/files/Sysmon.zip" -OutFile "Sysmon.zip"
  Expand-Archive Sysmon.zip -DestinationPath C:\Sysmon
  
  # Instalar con configuración SwiftOnSecurity
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/SwiftOnSecurity/sysmon-config/master/sysmonconfig-export.xml" -OutFile "C:\Sysmon\sysmonconfig.xml"
  C:\Sysmon\Sysmon64.exe -accepteula -i C:\Sysmon\sysmonconfig.xml
  ```

- **PowerShell Script Block Logging**
  ```powershell
  # Habilitar logging avanzado de PowerShell
  New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Force
  Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 1
  ```

#### Solo Windows Server
- **Active Directory PowerShell Module** (si el servidor es DC)
  ```powershell
  Install-WindowsFeature RSAT-AD-PowerShell
  ```

### 7.2 Linux

#### Requerido
- **Wazuh Agent**
  ```bash
  # Ubuntu/Debian
  curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
  echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" > /etc/apt/sources.list.d/wazuh.list
  apt-get update && apt-get install -y wazuh-agent
  
  # Configurar servidor
  sed -i "s/MANAGER_IP/IP_SERVIDOR/" /var/ossec/etc/ossec.conf
  systemctl enable --now wazuh-agent
  
  # CentOS/RHEL/AlmaLinux
  rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
  cat > /etc/yum.repos.d/wazuh.repo << EOF
  [wazuh]
  gpgcheck=1
  gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
  enabled=1
  name=Wazuh repository
  baseurl=https://packages.wazuh.com/4.x/yum/
  protect=1
  EOF
  yum install -y wazuh-agent
  ```

#### Recomendado
- **auditd** - Auditoría del kernel
  ```bash
  apt-get install -y auditd audispd-plugins    # Debian/Ubuntu
  yum install -y audit audit-libs              # CentOS/RHEL
  
  # Reglas de auditoría recomendadas
  cat >> /etc/audit/rules.d/wazuh.rules << EOF
  # Monitorizar cambios en usuarios
  -w /etc/passwd -p wa -k identity
  -w /etc/shadow -p wa -k identity
  -w /etc/group -p wa -k identity
  -w /etc/sudoers -p wa -k actions
  
  # Monitorizar ejecuciones sospechosas
  -a always,exit -F arch=b64 -S execve -F path=/usr/bin/wget -k exec_download
  -a always,exit -F arch=b64 -S execve -F path=/usr/bin/curl -k exec_download
  -a always,exit -F arch=b64 -S execve -F path=/usr/bin/nc -k exec_netcat
  -a always,exit -F arch=b64 -S execve -F path=/usr/bin/ncat -k exec_netcat
  EOF
  
  systemctl restart auditd
  ```

- **iptables/nftables** (normalmente preinstalado)
  ```bash
  apt-get install -y iptables        # Debian/Ubuntu
  yum install -y iptables-services   # CentOS/RHEL
  ```

---

## 8. Verificación y pruebas

### 8.1 Verificar que AR funciona en el servidor
```bash
# Verificar sintaxis de reglas
/var/ossec/bin/wazuh-analysisd -t

# Ver las reglas AR cargadas
cat /var/ossec/etc/rules/active_response_rules.xml

# Ver configuración de AR en ossec.conf
grep -A5 "active-response" /var/ossec/etc/ossec.conf

# Ver scripts disponibles
ls -la /var/ossec/active-response/bin/linux-*.sh

# Monitorizar ejecuciones de AR en tiempo real
tail -f /var/ossec/logs/active-responses.log
```

### 8.2 Probar bloqueo de IP (SAFE)
```bash
# En el agente Linux, simular bloqueo
/var/ossec/active-response/bin/linux-block-ip.sh add - 10.10.10.99

# Verificar que la regla se creó
iptables -L -n | grep 10.10.10.99

# Desbloquear
/var/ossec/active-response/bin/linux-block-ip.sh delete - 10.10.10.99
```

### 8.3 Probar recolección forense (SAFE)
```bash
# En el agente Linux
/var/ossec/active-response/bin/linux-collect-forensics.sh add

# Ver los datos recolectados
ls -la /var/ossec/forensics/
cat /var/ossec/forensics/*/processes.txt | head -20
```

### 8.4 Verificar agentes Windows
```powershell
# Ver estado del servicio
Get-Service WazuhSvc

# Ver logs del agente
Get-Content "C:\Program Files (x86)\ossec-agent\ossec.log" -Tail 20

# Ver scripts desplegados
Get-ChildItem "C:\Program Files (x86)\ossec-agent\shared\*.ps1"

# Ver log de Active Response
Get-Content "C:\Program Files (x86)\ossec-agent\active-response\active-responses.log" -Tail 20
```

### 8.5 Simular ataque para probar (CONTROLADO)
```bash
# En un equipo de test, generar fallos de login SSH (disparará block-ip)
for i in {1..15}; do ssh baduser@TARGET_IP 2>/dev/null; done

# Verificar que se bloqueó en el agente
iptables -L -n | grep DROP

# Verificar la alerta en el servidor
grep "100410" /var/ossec/logs/alerts/alerts.json | tail -1
```

---

## 9. Solución de problemas

### Los scripts AR no se ejecutan
```bash
# 1. Verificar permisos
ls -la /var/ossec/active-response/bin/linux-*.sh
# Deben ser: -rwxr-x--- root wazuh

# 2. Corregir permisos
chmod 750 /var/ossec/active-response/bin/linux-*.sh
chown root:wazuh /var/ossec/active-response/bin/linux-*.sh

# 3. Verificar que AR está habilitado en ossec.conf
grep -A10 "active-response" /var/ossec/etc/ossec.conf

# 4. Verificar logs de error
grep "active-response" /var/ossec/logs/ossec.log | tail -20
```

### El aislamiento de host no revierte
```bash
# Linux - restaurar manualmente
iptables -F
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

# O restaurar desde backup
iptables-restore < /var/ossec/tmp/iptables-backup.rules
```

```powershell
# Windows - restaurar manualmente
netsh advfirewall import "C:\ProgramData\wazuh-fw-backup.wfw"
# O resetear
netsh advfirewall reset
Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction NotConfigured -DefaultOutboundAction NotConfigured
```

### Los scripts PS1 no llegan a los agentes Windows
```bash
# 1. Verificar que están en shared folder
ls -la /var/ossec/etc/shared/default/*.ps1

# 2. Verificar permisos
chown wazuh:wazuh /var/ossec/etc/shared/default/*.ps1

# 3. Forzar sync al agente
/var/ossec/bin/agent_control -r -u AGENT_ID

# 4. Verificar en el agente Windows
Get-ChildItem "C:\Program Files (x86)\ossec-agent\shared\"
```

### Error de sintaxis en las reglas
```bash
# 1. Test de sintaxis
/var/ossec/bin/wazuh-analysisd -t

# 2. Si falla, revisar el fichero
xmllint --noout /var/ossec/etc/rules/active_response_rules.xml

# 3. Restaurar backup
ls -la /var/ossec/etc/rules/active_response_rules.xml.bak.*
cp /var/ossec/etc/rules/active_response_rules.xml.bak.TIMESTAMP /var/ossec/etc/rules/active_response_rules.xml

# 4. Reiniciar
systemctl restart wazuh-manager
```

---

*Manual generado por SOC Automation - By Sistemas 127*
