# Manual de Instalación: OpenCTI
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Primer acceso](#3-primer-acceso)
4. [Conectar con MISP](#4-conectar-con-misp)
5. [Conectar con TheHive](#5-conectar-con-thehive)
6. [Añadir fuentes de inteligencia](#6-fuentes-inteligencia)
7. [Solución de problemas](#7-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 8 GB mínimo (recomendado 16 GB)
- **CPU:** 4 cores
- **Disco:** 50 GB libres
- **Sistema:** Ubuntu 22.04 o 24.04 LTS

> OpenCTI es una aplicación pesada. Con menos de 8 GB de RAM no funcionará correctamente.

---

## 2. Ejecutar el script

```bash
chmod +x install-opencti.sh
sudo bash install-opencti.sh
```

Tiempo estimado: 3-5 minutos. Los contenedores pueden tardar 2-3 minutos adicionales en estar listos.

---

## 3. Primer acceso

### Abrir en el navegador
```
http://<IP_DEL_SERVIDOR>:8080
```

### Credenciales
- **Email:** admin@opencti.local
- **Contraseña:** <TU_CONTRASEÑA>

### Paso 3.1: Verificar que funciona
Al iniciar sesión deberías ver el dashboard principal de OpenCTI con secciones como:
- Threats
- Arsenal
- Observations
- Activities

Si ves un error 502, espera 2-3 minutos más y recarga la página.

---

## 4. Conectar con MISP

### Paso 4.1: Obtener la API Key de MISP
En MISP → tu perfil → Auth key (ver manual de TheHive, sección 6.4)

### Paso 4.2: Añadir el conector MISP en OpenCTI
1. Ve a **"Data"** → **"Connectors"**
2. El conector MISP no viene preinstalado. Hay que añadirlo como contenedor adicional.

### Paso 4.3: Añadir el conector MISP al Docker Compose

Fichero a modificar: `/opt/opencti/docker-compose.yml`

```bash
sudo nano /opt/opencti/docker-compose.yml
```

Añade este servicio ANTES de la sección `volumes:`:

```yaml
  connector-misp:
    image: opencti/connector-misp:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=<TU_OPENCTI_ADMIN_TOKEN>
      - CONNECTOR_ID=<genera-un-uuid>
      - CONNECTOR_TYPE=EXTERNAL_IMPORT
      - CONNECTOR_NAME=MISP
      - CONNECTOR_SCOPE=misp
      - CONNECTOR_LOG_LEVEL=info
      - MISP_URL=https://<IP_MISP>:443
      - MISP_REFERENCE_URL=https://<IP_MISP>:443
      - MISP_KEY=<TU_MISP_API_KEY>
      - MISP_SSL_VERIFY=false
      - MISP_DATETIME_ATTRIBUTE=timestamp
      - MISP_CREATE_REPORTS=true
      - MISP_CREATE_INDICATORS=true
      - MISP_CREATE_OBSERVABLES=true
      - MISP_IMPORT_FROM_DATE=2024-01-01
      - MISP_INTERVAL=5
    depends_on:
      - opencti
    networks:
      - opencti-net
```

### Paso 4.4: Generar un UUID para el conector
```bash
# Ejecuta esto para generar un UUID
cat /proc/sys/kernel/random/uuid
```

### Paso 4.5: Obtener el token de admin de OpenCTI
Lo puedes encontrar en la salida del script de instalación, o en:
1. OpenCTI → Settings → Profile → API Access → API Key

### Paso 4.6: Reiniciar
```bash
cd /opt/opencti
docker compose up -d
```

---

## 5. Conectar con TheHive

### Paso 5.1: Añadir el conector TheHive
Igual que con MISP, hay que añadir un contenedor al docker-compose.yml.

Fichero: `/opt/opencti/docker-compose.yml`

```yaml
  connector-thehive:
    image: opencti/connector-thehive:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=<TU_OPENCTI_ADMIN_TOKEN>
      - CONNECTOR_ID=<genera-un-uuid>
      - CONNECTOR_TYPE=EXTERNAL_IMPORT
      - CONNECTOR_NAME=TheHive
      - CONNECTOR_SCOPE=thehive
      - CONNECTOR_LOG_LEVEL=info
      - THEHIVE_URL=http://<IP_THEHIVE>:9000
      - THEHIVE_API_KEY=<TU_THEHIVE_API_KEY>
      - THEHIVE_CHECK_SSL=false
      - THEHIVE_ORGANISATION_NAME=<TU_ORG>
      - THEHIVE_IMPORT_FROM_DATE=2024-01-01
      - THEHIVE_IMPORT_ONLY_TLPS=TLP:CLEAR,TLP:GREEN,TLP:AMBER,TLP:AMBER+STRICT,TLP:RED
    depends_on:
      - opencti
    networks:
      - opencti-net
```

### Paso 5.2: Reiniciar
```bash
cd /opt/opencti && docker compose up -d
```

---

## 6. Añadir fuentes de inteligencia gratuitas

OpenCTI soporta muchos conectores. Los más útiles y gratuitos:

### AlienVault OTX
```yaml
  connector-alienvault:
    image: opencti/connector-alienvault:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=<TOKEN>
      - CONNECTOR_ID=<UUID>
      - CONNECTOR_TYPE=EXTERNAL_IMPORT
      - CONNECTOR_NAME=AlienVault
      - CONNECTOR_SCOPE=alienvault
      - ALIENVAULT_BASE_URL=https://otx.alienvault.com
      - ALIENVAULT_API_KEY=<TU_OTX_API_KEY>
      - ALIENVAULT_TLP=TLP:CLEAR
      - ALIENVAULT_PULSE_START_TIMESTAMP=2024-01-01T00:00:00
      - ALIENVAULT_INTERVAL=360
    depends_on:
      - opencti
    networks:
      - opencti-net
```

### CVE (vulnerabilidades)
```yaml
  connector-cve:
    image: opencti/connector-cve:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=<TOKEN>
      - CONNECTOR_ID=<UUID>
      - CONNECTOR_TYPE=EXTERNAL_IMPORT
      - CONNECTOR_NAME=CVE
      - CONNECTOR_SCOPE=identity,vulnerability
      - CVE_INTERVAL=24
    depends_on:
      - opencti
    networks:
      - opencti-net
```

---

## 7. Solución de problemas

### OpenCTI no carga (error 502)
```bash
cd /opt/opencti
docker compose logs opencti | tail -20

# Verificar que Elasticsearch está bien
docker compose logs elasticsearch | tail -10

# El problema más común es memoria insuficiente
free -h
```

### Los workers se reinician constantemente
```bash
docker compose logs worker | tail -20

# Suele ser porque OpenCTI aún no está listo
# Espera 2-3 minutos y los workers se conectarán solos
```

---

*Manual generado por SOC Automation - By Sistemas 127*
