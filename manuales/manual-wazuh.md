# Manual de Instalación: Wazuh SIEM 4.14
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Primer acceso al Dashboard](#3-primer-acceso)
4. [Registrar agentes](#4-registrar-agentes)
5. [Integrar con TheHive](#5-integrar-con-thehive)
6. [Integrar con Shuffle SOAR](#6-integrar-con-shuffle)
7. [Reglas personalizadas](#7-reglas-personalizadas)
8. [Solución de problemas](#8-solucion-problemas)

---

## 1. Requisitos previos

### Hardware mínimo
- **RAM:** 4 GB (recomendado 8 GB)
- **CPU:** 2 cores (recomendado 4)
- **Disco:** 50 GB libres
- **Sistema:** Ubuntu 24.04

---

## 2. Ejecutar el script

```bash
chmod +x install-wazuh-*.sh
sudo bash install-wazuh-*.sh
```

El script utiliza el instalador oficial de Wazuh (`wazuh-install.sh`). Descarga la versión 4.14 directamente desde packages.wazuh.com.

---

## 3. Primer acceso al Dashboard

### Paso 3.1: Abrir en el navegador
```
https://<IP_DEL_SERVIDOR>:443
```

> El certificado es autofirmado. Acepta el aviso de seguridad del navegador.

### Paso 3.2: Credenciales
- **Usuario:** admin
- **Contraseña:** <TU_CONTRASEÑA>

---

## 4. Registrar agentes

### Paso 4.1: Desde el Dashboard
1. Ve a **"Agents"** → **"Deploy new agent"**
2. Selecciona el sistema operativo del equipo donde instalar el agente
3. Introduce la IP del servidor Wazuh
4. Copia y ejecuta los comandos que se muestran

### Paso 4.2: Manualmente en Windows
```powershell
# Descargar el agente (PowerShell como Administrador)
Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14-1.msi -OutFile wazuh-agent.msi

# Instalar
msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="<IP_SERVIDOR_WAZUH>"

# Iniciar el servicio
NET START WazuhSvc
```

### Paso 4.3: Manualmente en Linux (Debian/Ubuntu)
```bash
# Añadir repositorio
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list

# Instalar
apt-get update
WAZUH_MANAGER="<IP_SERVIDOR_WAZUH>" apt-get install -y wazuh-agent

# Iniciar
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

---

## 5. Integrar con TheHive

### Qué fichero modificar
`/var/ossec/etc/ossec.conf` (en el servidor Wazuh)

### Paso 5.1: Editar ossec.conf
```bash
sudo nano /var/ossec/etc/ossec.conf
```

### Paso 5.2: Añadir la integración ANTES de la etiqueta `</ossec_config>`
Busca la última línea del fichero que dice `</ossec_config>` y justo ANTES de ella, pega:

```xml
<integration>
  <name>thehive</name>
  <hook_url>http://<IP_THEHIVE>:9000/api/alert</hook_url>
  <api_key><TU_THEHIVE_API_KEY></api_key>
  <alert_format>json</alert_format>
  <level>5</level>
</integration>
```

### Paso 5.3: Sustituir los valores
- `<IP_THEHIVE>`: la IP del servidor donde instalaste TheHive
- `<TU_THEHIVE_API_KEY>`: la API Key que creaste en TheHive (Admin → Users → API Key)

### Paso 5.4: Reiniciar Wazuh
```bash
sudo systemctl restart wazuh-manager
```

### Paso 5.5: Verificar
Genera una alerta de prueba y comprueba que aparece en TheHive:
```bash
# En un agente Wazuh, simula un login fallido:
logger -t sshd "Failed password for root from 192.168.1.100 port 22 ssh2"
```

---

## 6. Integrar con Shuffle SOAR

### Qué fichero modificar
`/var/ossec/etc/ossec.conf` (en el servidor Wazuh)

### Paso 6.1: Crear un Webhook en Shuffle
1. En Shuffle, crea un nuevo **Workflow**
2. Añade un **Trigger** de tipo **Webhook**
3. Copia la URL del webhook (ej: `http://<IP_SHUFFLE>:3001/api/v1/hooks/<ID>`)

### Paso 6.2: Añadir a ossec.conf
```bash
sudo nano /var/ossec/etc/ossec.conf
```

Añade ANTES de `</ossec_config>`:
```xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>3</level>
</integration>
```

### Paso 6.3: Reiniciar
```bash
sudo systemctl restart wazuh-manager
```

---

## 7. Reglas personalizadas

### Qué fichero modificar
`/var/ossec/etc/rules/local_rules.xml`

### Ejemplo: alerta por acceso SSH desde IP no autorizada
```bash
sudo nano /var/ossec/etc/rules/local_rules.xml
```

Añade:
```xml
<group name="custom_ssh,">
  <rule id="100001" level="12">
    <if_sid>5715</if_sid>
    <srcip>!192.168.1.0/24</srcip>
    <description>Acceso SSH desde IP fuera de la red local</description>
  </rule>
</group>
```

Reinicia:
```bash
sudo systemctl restart wazuh-manager
```

---

## 8. Solución de problemas

### El Dashboard no carga
```bash
# Verificar servicios
sudo systemctl status wazuh-manager
sudo systemctl status wazuh-indexer
sudo systemctl status wazuh-dashboard

# Reiniciar todo
sudo systemctl restart wazuh-indexer
sleep 15
sudo systemctl restart wazuh-manager
sudo systemctl restart wazuh-dashboard
```

### Un agente no aparece en el Dashboard
```bash
# En el agente, verificar que apunta al servidor correcto
cat /var/ossec/etc/ossec.conf | grep -A2 "<server>"

# Verificar que el servicio está activo
systemctl status wazuh-agent
```

### Logs del servidor
```bash
# Log principal
tail -f /var/ossec/logs/ossec.log

# Log de alertas
tail -f /var/ossec/logs/alerts/alerts.json
```

---

*Manual generado por SOC Automation - By Sistemas 127*
