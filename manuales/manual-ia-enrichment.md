# Manual de Instalación: IA & Threat Intelligence
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Estructura de archivos](#3-estructura)
4. [Usar Ollama (LLM local)](#4-ollama)
5. [Usar VirusTotal](#5-virustotal)
6. [Usar AbuseIPDB](#6-abuseipdb)
7. [Usar OTX AlienVault](#7-otx)
8. [Integrar con Wazuh](#8-integrar-wazuh)
9. [Integrar con TheHive](#9-integrar-thehive)
10. [Solución de problemas](#10-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 4 GB mínimo (8 GB+ si usas Ollama con modelos grandes)
- **CPU:** 2 cores (GPU NVIDIA opcional para Ollama)
- **Disco:** 10 GB libres (+ 4-8 GB por modelo de IA)
- **Sistema:** Ubuntu 22.04 o 24.04 LTS
- **Internet:** necesario para consultar APIs externas

---

## 2. Ejecutar el script

```bash
chmod +x install-ai-enrichment.sh
sudo bash install-ai-enrichment.sh
```

---

## 3. Estructura de archivos creados

El script instala todo en `/opt/soc-enrichment/`:

| Fichero/Carpeta | Descripción |
|-----------------|-------------|
| `/opt/soc-enrichment/venv/` | Entorno virtual Python (aislado del sistema) |
| `/opt/soc-enrichment/scripts/` | Scripts de consulta a cada servicio |
| `/opt/soc-enrichment/logs/` | Logs de enriquecimiento |
| `/opt/soc-enrichment/config/` | Ficheros de configuración |
| `/opt/soc-enrichment/scripts/ollama_analyze.py` | Análisis de alertas con IA local |
| `/opt/soc-enrichment/scripts/virustotal_check.py` | Consulta hashes, IPs y URLs en VirusTotal |
| `/opt/soc-enrichment/scripts/abuseipdb_check.py` | Consulta reputación de IPs |
| `/opt/soc-enrichment/scripts/otx_check.py` | Consulta threat intelligence OTX |
| `/opt/soc-enrichment/scripts/wazuh_enrichment.py` | Enriquecimiento automático para Wazuh |

---

## 4. Usar Ollama (LLM local)

### ¿Qué es Ollama?
Ollama ejecuta modelos de IA (LLM) directamente en tu servidor, sin enviar datos a internet. Es completamente privado.

### Verificar que Ollama funciona
```bash
# Comprobar que el servicio está activo
systemctl status ollama

# Verificar que el modelo está descargado
ollama list

# Hacer una prueba rápida
ollama run llama3.2 "Hola, ¿funciona?"
```

### Analizar una alerta con IA
```bash
# Activar el entorno virtual
source /opt/soc-enrichment/venv/bin/activate

# Analizar un texto de alerta
python3 /opt/soc-enrichment/scripts/ollama_analyze.py "Failed password for root from 192.168.1.100 port 22 ssh2"

# También puede recibir entrada por pipe
echo "Suspicious process cmd.exe spawned by winword.exe" | python3 /opt/soc-enrichment/scripts/ollama_analyze.py
```

### Cambiar el modelo
```bash
# Descargar otro modelo
ollama pull mistral

# Editar el script para usar el nuevo modelo:
sudo nano /opt/soc-enrichment/scripts/ollama_analyze.py
# Cambia la línea MODEL = "llama3.2" por MODEL = "mistral"
```

### Si Ollama va lento
- Con CPU: es normal que tarde 10-30 segundos por consulta
- Con GPU NVIDIA: instala los drivers CUDA para acelerar 10x
```bash
# Instalar soporte NVIDIA (si tienes GPU)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
```

## 5. Usar VirusTotal

### Obtener API Key gratuita
1. Ve a https://www.virustotal.com
2. Regístrate con tu email
3. Ve a tu perfil → API Key
4. Copia la API Key

### Límites del plan gratuito
- 4 consultas por minuto
- 500 consultas por día
- 15.500 consultas por mes

### Usar el script
```bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar un hash de archivo
python3 /opt/soc-enrichment/scripts/virustotal_check.py hash 44d88612fea8a8f36de82e1278abb02f

# Consultar una IP
python3 /opt/soc-enrichment/scripts/virustotal_check.py ip 8.8.8.8

# Consultar una URL
python3 /opt/soc-enrichment/scripts/virustotal_check.py url "https://ejemplo-sospechoso.com"
```

### Si no configuraste la API Key durante la instalación
Edita el script:
```bash
sudo nano /opt/soc-enrichment/scripts/virustotal_check.py
# Busca la línea VT_API_KEY = "" y pega tu API key entre las comillas
```

## 6. Usar AbuseIPDB

### Obtener API Key gratuita
1. Ve a https://www.abuseipdb.com
2. Regístrate
3. Ve a tu cuenta → API → Key
4. Copia la API Key

### Límites del plan gratuito
- 1000 consultas por día

### Usar el script
```bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar reputación de una IP
python3 /opt/soc-enrichment/scripts/abuseipdb_check.py 185.220.101.1

# Reportar una IP (categoría 18 = brute force)
python3 /opt/soc-enrichment/scripts/abuseipdb_check.py 185.220.101.1 report 18 "Brute force SSH detectado"
```

### Si no configuraste la API Key
```bash
sudo nano /opt/soc-enrichment/scripts/abuseipdb_check.py
# Busca ABUSEIPDB_KEY = "" y pega tu key
```

## 7. Usar OTX AlienVault

### Obtener API Key gratuita
1. Ve a https://otx.alienvault.com
2. Regístrate
3. Ve a Settings → API Key
4. Copia la API Key

### Sin límite de consultas

### Usar el script
```bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar una IP
python3 /opt/soc-enrichment/scripts/otx_check.py ip 185.220.101.1

# Consultar un hash
python3 /opt/soc-enrichment/scripts/otx_check.py hash 44d88612fea8a8f36de82e1278abb02f

# Consultar un dominio
python3 /opt/soc-enrichment/scripts/otx_check.py domain malware-domain.com
```

## 8. Integrar con Wazuh (Active Response)

### Qué hace esta integración
Cuando Wazuh genera una alerta de nivel 7 o superior, automáticamente consulta AbuseIPDB, VirusTotal y OTX para la IP origen de la alerta.

### Qué fichero se modifica
`/var/ossec/etc/ossec.conf` (en el servidor Wazuh)

### Verificar que está configurado
```bash
# Buscar la integración en ossec.conf
grep -A5 "soc-enrichment" /var/ossec/etc/ossec.conf

# Verificar que el script de Active Response existe
ls -la /var/ossec/active-response/bin/wazuh-ar-enrich.sh
```

### Si no se configuró automáticamente
Significa que Wazuh no estaba instalado cuando ejecutaste el script de IA.

Fichero a modificar: `/var/ossec/etc/ossec.conf`

```bash
sudo nano /var/ossec/etc/ossec.conf
```

Añade ANTES de `</ossec_config>`:

```xml
<command>
  <name>soc-enrichment</name>
  <executable>wazuh-ar-enrich.sh</executable>
  <timeout_allowed>no</timeout_allowed>
</command>

<active-response>
  <command>soc-enrichment</command>
  <location>server</location>
  <level>7</level>
  <timeout>60</timeout>
</active-response>
```

Copia el script:
```bash
sudo cp /opt/soc-enrichment/scripts/wazuh-ar-enrich.sh /var/ossec/active-response/bin/
sudo chown root:wazuh /var/ossec/active-response/bin/wazuh-ar-enrich.sh
sudo chmod 750 /var/ossec/active-response/bin/wazuh-ar-enrich.sh
sudo systemctl restart wazuh-manager
```

---

## 9. Integrar con TheHive (Webhook)

### Qué hace esta integración
Un servicio escucha en el puerto 9500 y recibe alertas de TheHive por webhook. Cuando llega una alerta, enriquece automáticamente los observables (IPs, hashes, dominios).

### Verificar que está activo
```bash
systemctl status soc-enrichment-webhook

# Ver logs
journalctl -u soc-enrichment-webhook -f
```

### Configurar TheHive para enviar alertas al webhook

En TheHive (v5), ve a **Admin → Platform Management → Notifications**:
1. Haz clic en **"Add notifier"**
2. Tipo: **Webhook**
3. URL: `http://<IP_SERVIDOR>:9500`
4. Eventos: selecciona "Alert created", "Case created"
5. Guarda

---

## 10. Solución de problemas

### Los scripts no funcionan
```bash
# Verificar que el entorno virtual existe
ls /opt/soc-enrichment/venv/bin/python3

# Verificar que las dependencias están instaladas
/opt/soc-enrichment/venv/bin/pip list | grep requests
```

### Error "API key is missing"
Edita el script correspondiente y añade tu API key.

### Ollama no responde
```bash
systemctl restart ollama
sleep 5
ollama list
```

---

*Manual generado por SOC Automation - By Sistemas 127*
