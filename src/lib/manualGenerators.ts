// Detailed installation & integration manuals for each SOC tool
// Includes Wazuh custom rules manual
// Each manual specifies exact files, paths, and configuration sections

export function downloadManual(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// THEHIVE + CORTEX + MISP
// ============================================================================
export function getTheHiveManual(config: {
  thehivePort: string;
  cortexPort: string;
  mispPort: string;
  adminEmail: string;
  adminPassword: string;
  elasticPassword: string;
  cortexApiKey: string;
}): string {
  return `# Manual de Instalación: TheHive + Cortex + MISP
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script de instalación](#2-ejecutar-el-script)
3. [Verificar que los servicios funcionan](#3-verificar-servicios)
4. [Primer acceso a TheHive](#4-primer-acceso-thehive)
5. [Primer acceso a Cortex](#5-primer-acceso-cortex)
6. [Primer acceso a MISP](#6-primer-acceso-misp)
7. [Conectar TheHive con Cortex](#7-conectar-thehive-cortex)
8. [Conectar TheHive con MISP](#8-conectar-thehive-misp)
9. [Conectar Cortex con MISP](#9-conectar-cortex-misp)
10. [Solución de problemas](#10-solucion-problemas)

---

## 1. Requisitos previos

### Hardware mínimo
- **RAM:** 8 GB (recomendado 16 GB)
- **CPU:** 4 cores
- **Disco:** 50 GB libres
- **Red:** IP fija o conocida en la LAN

### Software
- **Sistema Operativo:** Ubuntu 22.04 o 24.04 LTS
- **Usuario:** root o usuario con sudo

### Verificar antes de empezar
\`\`\`bash
# Comprobar RAM disponible
free -h

# Comprobar espacio en disco
df -h /

# Comprobar tu IP en la red local
hostname -I
\`\`\`

---

## 2. Ejecutar el script de instalación

### Paso 2.1: Descargar el script
Descarga el archivo \`install-thehive-cortex-misp.sh\` desde la web del generador.

### Paso 2.2: Dar permisos de ejecución
\`\`\`bash
chmod +x install-thehive-cortex-misp.sh
\`\`\`

### Paso 2.3: Ejecutar como root
\`\`\`bash
sudo bash install-thehive-cortex-misp.sh
\`\`\`

### ¿Qué hace el script?
1. Instala Docker y Docker Compose si no están instalados
2. Crea la carpeta \`/opt/soc-automation/\` con la estructura necesaria
3. Genera el fichero \`/opt/soc-automation/docker/docker-compose.yml\`
4. Descarga las imágenes Docker de todos los servicios
5. Arranca los contenedores
6. Configura el firewall (UFW) para abrir los puertos necesarios

### Tiempo estimado
- Primera instalación: 5-15 minutos (depende de la velocidad de internet)
- El script mostrará un resumen final con todas las URLs y credenciales

---

## 3. Verificar que los servicios funcionan

### Paso 3.1: Ver el estado de los contenedores
\`\`\`bash
cd /opt/soc-automation/docker
docker compose ps
\`\`\`

Deberías ver algo así:
\`\`\`
NAME           STATUS         PORTS
cassandra      Up (healthy)   0.0.0.0:9042->9042/tcp
elasticsearch  Up             0.0.0.0:9200->9200/tcp
minio          Up             0.0.0.0:9002->9002/tcp
thehive        Up             0.0.0.0:${config.thehivePort}->9000/tcp
cortex         Up             0.0.0.0:${config.cortexPort}->9001/tcp
misp           Up             0.0.0.0:80->80/tcp, 0.0.0.0:${config.mispPort}->443/tcp
redis          Up
misp_mysql     Up
misp-modules   Up
\`\`\`

### Paso 3.2: Si algún servicio no arranca
\`\`\`bash
# Ver los logs de un servicio específico (ejemplo: thehive)
docker compose logs thehive

# Ver los logs de todos los servicios
docker compose logs -f

# Reiniciar un servicio
docker compose restart thehive
\`\`\`

### Paso 3.3: Si Elasticsearch no arranca
Esto es muy común. Ejecuta:
\`\`\`bash
# Comprobar que el parámetro del kernel está configurado
sysctl vm.max_map_count

# Si muestra un valor menor a 262144, ejecuta:
sudo sysctl -w vm.max_map_count=262144

# Hacerlo permanente:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Reiniciar Elasticsearch:
cd /opt/soc-automation/docker
docker compose restart elasticsearch
\`\`\`

---

## 4. Primer acceso a TheHive

### Paso 4.1: Abrir en el navegador
Desde cualquier equipo de tu red local, abre:
\`\`\`
http://<IP_DEL_SERVIDOR>:${config.thehivePort}
\`\`\`

### Paso 4.2: Credenciales por defecto
- **Usuario:** admin@thehive.local
- **Contraseña:** secret

### Paso 4.3: Cambiar la contraseña (IMPORTANTE)
1. Haz clic en tu nombre de usuario arriba a la derecha
2. Selecciona **"Settings"**
3. En la sección **"Change password"**, escribe la nueva contraseña
4. Haz clic en **"Save"**

### Paso 4.4: Crear tu organización
1. Ve a **Admin → Organizations**
2. Haz clic en **"+ Add organization"**
3. Escribe el nombre de tu organización
4. Haz clic en **"Confirm"**

### Paso 4.5: Crear un usuario para la organización
1. Dentro de la organización, ve a **"Users"**
2. Haz clic en **"+ Add user"**
3. Rellena: Login (email), Nombre, Perfil (org-admin para el primer usuario)
4. Haz clic en **"Confirm"**
5. Haz clic en **"Set password"** junto al usuario creado

---

## 5. Primer acceso a Cortex

### Paso 5.1: Abrir en el navegador
\`\`\`
http://<IP_DEL_SERVIDOR>:${config.cortexPort}
\`\`\`

### Paso 5.2: Configuración inicial
La primera vez que accedas, Cortex te pedirá que:
1. Haz clic en **"Update Database"** para crear las tablas
2. Crea el usuario admin: rellena email, nombre, y contraseña
3. Haz clic en **"Create"**

### Paso 5.3: Crear una organización
1. Inicia sesión con el admin que acabas de crear
2. Ve a **"Organizations"** en el menú lateral
3. Haz clic en **"Add organization"**
4. Pon el nombre de tu organización y haz clic en **"Save"**

### Paso 5.4: Crear la API Key de Cortex
1. Ve a **"Users"** dentro de tu organización
2. Crea un usuario con perfil **"orgadmin"**
3. Haz clic en **"Create API Key"** junto al usuario
4. **COPIA la API Key y guárdala** - la necesitarás para conectar con TheHive

### Paso 5.5: Activar Analyzers
1. Ve a **"Organization → Analyzers"**
2. Verás una lista de analizadores disponibles (VirusTotal, AbuseIPDB, etc.)
3. Haz clic en **"Enable"** en los que quieras usar
4. Configura las API keys si las necesitan (por ejemplo, VirusTotal)

---

## 6. Primer acceso a MISP

### Paso 6.1: Abrir en el navegador
\`\`\`
https://<IP_DEL_SERVIDOR>:${config.mispPort}
\`\`\`

> **Nota:** El certificado SSL es autofirmado. Tu navegador mostrará un aviso de seguridad.
> Haz clic en "Avanzado" → "Continuar" para aceptarlo.

### Paso 6.2: Credenciales por defecto
- **Usuario:** ${config.adminEmail}
- **Contraseña:** ${config.adminPassword}

### Paso 6.3: Cambiar la contraseña
MISP te pedirá cambiar la contraseña en el primer acceso.

### Paso 6.4: Obtener la API Key de MISP
1. Haz clic en tu email arriba a la derecha → **"My Profile"**
2. En la parte inferior verás **"Auth key"**
3. Si no hay ninguna, haz clic en **"Reset"** para generar una nueva
4. **COPIA la API Key** - la necesitarás para conectar con TheHive y Cortex

---

## 7. Conectar TheHive con Cortex

### Paso 7.1: Qué fichero modificar
Fichero: \`/opt/soc-automation/docker/docker-compose.yml\`

El script ya configura la conexión en la sección \`thehive.command\`:
\`\`\`yaml
command:
  - "--cortex-port"
  - "${config.cortexPort}"
  - "--cortex-keys"
  - "<CORTEX_API_KEY>"
\`\`\`

### Paso 7.2: Actualizar la API Key de Cortex
1. Obtén la API Key de Cortex (paso 5.4)
2. Edita el docker-compose.yml:
\`\`\`bash
sudo nano /opt/soc-automation/docker/docker-compose.yml
\`\`\`
3. Busca la línea \`"--cortex-keys"\` y en la línea siguiente, sustituye el valor por tu API Key real
4. Guarda el fichero (Ctrl+O, Enter, Ctrl+X)
5. Reinicia TheHive:
\`\`\`bash
cd /opt/soc-automation/docker
docker compose restart thehive
\`\`\`

### Paso 7.3: Verificar la conexión
1. En TheHive, ve a **Admin → Platform Management**
2. En la sección **"Cortex"**, deberías ver el servidor conectado con estado verde
3. Si no aparece, revisa los logs: \`docker compose logs thehive | grep -i cortex\`

---

## 8. Conectar TheHive con MISP

### Paso 8.1: Qué fichero modificar
Fichero: \`/opt/soc-automation/thehive/conf/application.conf\`

### Paso 8.2: Crear el fichero de configuración
\`\`\`bash
sudo nano /opt/soc-automation/thehive/conf/application.conf
\`\`\`

Añade al final del fichero:
\`\`\`
misp {
  interval: 1 hour
  servers: [
    {
      name = "MISP LOCAL"
      url = "https://misp:443"
      auth {
        type = key
        key = "<TU_MISP_API_KEY>"
      }
      wsConfig {
        ssl.loose.acceptAnyCertificate = true
      }
      tags = ["misp"]
      max-attributes = 1000
      max-size = 1 MiB
      max-age = 7 days
      exclusion {
        organisations = []
        tags = []
      }
    }
  ]
}
\`\`\`

### Paso 8.3: Sustituir la API Key
Sustituye \`<TU_MISP_API_KEY>\` por la API Key que obtuviste en el paso 6.4.

### Paso 8.4: Reiniciar TheHive
\`\`\`bash
cd /opt/soc-automation/docker
docker compose restart thehive
\`\`\`

### Paso 8.5: Verificar
- En TheHive, las alertas de MISP empezarán a aparecer al cabo de unos minutos
- Comprueba los logs si hay errores: \`docker compose logs thehive | grep -i misp\`

---

## 9. Conectar Cortex con MISP (Analyzers)

Cortex puede usar MISP como fuente de inteligencia para sus análisis.

### Paso 9.1: Activar el analyzer MISP en Cortex
1. En Cortex, ve a **Organization → Analyzers**
2. Busca **"MISP"** en la lista
3. Haz clic en **"Enable"**
4. Configura:
   - **url:** \`https://<IP_DEL_SERVIDOR>:${config.mispPort}\`
   - **key:** la API Key de MISP (paso 6.4)
   - **cert_check:** false (porque usamos certificado autofirmado)
5. Haz clic en **"Save"**

---

## 10. Solución de problemas

### Cassandra no arranca
\`\`\`bash
# Comprobar logs
docker compose logs cassandra

# Si dice "insufficient memory", ajusta el límite:
# Edita docker-compose.yml y cambia mem_limit de cassandra
# Reinicia: docker compose up -d cassandra
\`\`\`

### TheHive muestra "Service Unavailable"
Cassandra puede tardar 1-2 minutos en estar lista. Espera y recarga la página.
\`\`\`bash
# Comprobar que Cassandra responde
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES;"
\`\`\`

### MISP redirige a localhost
El script ya configura MISP con la IP correcta. Si aun así redirige:
\`\`\`bash
# Entra en el contenedor de MISP
docker exec -it misp bash

# Edita la configuración
nano /var/www/MISP/app/Config/bootstrap.php
# Busca "baseurl" y cámbialo a https://<TU_IP>

# Sal del contenedor y reinicia
exit
docker compose restart misp
\`\`\`

### Elasticsearch se corrompe
\`\`\`bash
# Parar Elasticsearch
docker compose stop elasticsearch

# Borrar datos (CUIDADO: perderás índices)
docker volume rm docker_elasticsearchdata

# Reiniciar
docker compose up -d elasticsearch

# Espera 30 segundos y reinicia TheHive y Cortex
sleep 30
docker compose restart thehive cortex
\`\`\`

### Reiniciar todo desde cero
\`\`\`bash
cd /opt/soc-automation/docker
docker compose down -v  # -v borra también los volúmenes (datos)
docker compose up -d
\`\`\`

### Comandos útiles
\`\`\`bash
# Ver estado de todos los contenedores
docker compose ps

# Ver uso de recursos
docker stats

# Ver logs en tiempo real
docker compose logs -f

# Parar todo
docker compose down

# Arrancar todo
docker compose up -d
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// WAZUH
// ============================================================================
export function getWazuhManual(config: {
  distro: string;
  wazuhVersion: string;
  adminPassword: string;
  apiPort: string;
  dashboardPort: string;
}): string {
  return `# Manual de Instalación: Wazuh SIEM ${config.wazuhVersion}
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
- **Sistema:** ${config.distro}

---

## 2. Ejecutar el script

\`\`\`bash
chmod +x install-wazuh-*.sh
sudo bash install-wazuh-*.sh
\`\`\`

El script utiliza el instalador oficial de Wazuh (\`wazuh-install.sh\`). Descarga la versión ${config.wazuhVersion} directamente desde packages.wazuh.com.

---

## 3. Primer acceso al Dashboard

### Paso 3.1: Abrir en el navegador
\`\`\`
https://<IP_DEL_SERVIDOR>:${config.dashboardPort}
\`\`\`

> El certificado es autofirmado. Acepta el aviso de seguridad del navegador.

### Paso 3.2: Credenciales
- **Usuario:** admin
- **Contraseña:** ${config.adminPassword}

---

## 4. Registrar agentes

### Paso 4.1: Desde el Dashboard
1. Ve a **"Agents"** → **"Deploy new agent"**
2. Selecciona el sistema operativo del equipo donde instalar el agente
3. Introduce la IP del servidor Wazuh
4. Copia y ejecuta los comandos que se muestran

### Paso 4.2: Manualmente en Windows
\`\`\`powershell
# Descargar el agente (PowerShell como Administrador)
Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-${config.wazuhVersion}-1.msi -OutFile wazuh-agent.msi

# Instalar
msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="<IP_SERVIDOR_WAZUH>"

# Iniciar el servicio
NET START WazuhSvc
\`\`\`

### Paso 4.3: Manualmente en Linux (Debian/Ubuntu)
\`\`\`bash
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
\`\`\`

---

## 5. Integrar con TheHive

### Qué fichero modificar
\`/var/ossec/etc/ossec.conf\` (en el servidor Wazuh)

### Paso 5.1: Editar ossec.conf
\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

### Paso 5.2: Añadir la integración ANTES de la etiqueta \`</ossec_config>\`
Busca la última línea del fichero que dice \`</ossec_config>\` y justo ANTES de ella, pega:

\`\`\`xml
<integration>
  <name>thehive</name>
  <hook_url>http://<IP_THEHIVE>:9000/api/alert</hook_url>
  <api_key><TU_THEHIVE_API_KEY></api_key>
  <alert_format>json</alert_format>
  <level>5</level>
</integration>
\`\`\`

### Paso 5.3: Sustituir los valores
- \`<IP_THEHIVE>\`: la IP del servidor donde instalaste TheHive
- \`<TU_THEHIVE_API_KEY>\`: la API Key que creaste en TheHive (Admin → Users → API Key)

### Paso 5.4: Reiniciar Wazuh
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

### Paso 5.5: Verificar
Genera una alerta de prueba y comprueba que aparece en TheHive:
\`\`\`bash
# En un agente Wazuh, simula un login fallido:
logger -t sshd "Failed password for root from 192.168.1.100 port 22 ssh2"
\`\`\`

---

## 6. Integrar con Shuffle SOAR

### Qué fichero modificar
\`/var/ossec/etc/ossec.conf\` (en el servidor Wazuh)

### Paso 6.1: Crear un Webhook en Shuffle
1. En Shuffle, crea un nuevo **Workflow**
2. Añade un **Trigger** de tipo **Webhook**
3. Copia la URL del webhook (ej: \`http://<IP_SHUFFLE>:3001/api/v1/hooks/<ID>\`)

### Paso 6.2: Añadir a ossec.conf
\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

Añade ANTES de \`</ossec_config>\`:
\`\`\`xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>3</level>
</integration>
\`\`\`

### Paso 6.3: Reiniciar
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

---

## 7. Reglas personalizadas

### Qué fichero modificar
\`/var/ossec/etc/rules/local_rules.xml\`

### Ejemplo: alerta por acceso SSH desde IP no autorizada
\`\`\`bash
sudo nano /var/ossec/etc/rules/local_rules.xml
\`\`\`

Añade:
\`\`\`xml
<group name="custom_ssh,">
  <rule id="100001" level="12">
    <if_sid>5715</if_sid>
    <srcip>!192.168.1.0/24</srcip>
    <description>Acceso SSH desde IP fuera de la red local</description>
  </rule>
</group>
\`\`\`

Reinicia:
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

---

## 8. Solución de problemas

### El Dashboard no carga
\`\`\`bash
# Verificar servicios
sudo systemctl status wazuh-manager
sudo systemctl status wazuh-indexer
sudo systemctl status wazuh-dashboard

# Reiniciar todo
sudo systemctl restart wazuh-indexer
sleep 15
sudo systemctl restart wazuh-manager
sudo systemctl restart wazuh-dashboard
\`\`\`

### Un agente no aparece en el Dashboard
\`\`\`bash
# En el agente, verificar que apunta al servidor correcto
cat /var/ossec/etc/ossec.conf | grep -A2 "<server>"

# Verificar que el servicio está activo
systemctl status wazuh-agent
\`\`\`

### Logs del servidor
\`\`\`bash
# Log principal
tail -f /var/ossec/logs/ossec.log

# Log de alertas
tail -f /var/ossec/logs/alerts/alerts.json
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// SHUFFLE SOAR
// ============================================================================
export function getShuffleManual(config: {
  adminPassword: string;
  port: string;
}): string {
  return `# Manual de Instalación: Shuffle SOAR
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Primer acceso](#3-primer-acceso)
4. [Crear tu primer Workflow](#4-crear-workflow)
5. [Integrar con TheHive](#5-integrar-con-thehive)
6. [Integrar con Wazuh](#6-integrar-con-wazuh)
7. [Integrar con VirusTotal](#7-integrar-con-virustotal)
8. [Solución de problemas](#8-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 4 GB mínimo
- **CPU:** 2 cores
- **Disco:** 20 GB libres
- **Sistema:** Ubuntu 22.04 o 24.04 LTS

---

## 2. Ejecutar el script

\`\`\`bash
chmod +x install-shuffle-soar.sh
sudo bash install-shuffle-soar.sh
\`\`\`

---

## 3. Primer acceso

### Abrir en el navegador
\`\`\`
http://<IP_DEL_SERVIDOR>:${config.port}
\`\`\`

### Credenciales
- **Usuario:** admin
- **Contraseña:** ${config.adminPassword}

---

## 4. Crear tu primer Workflow

### Paso 4.1: Crear Workflow
1. Haz clic en **"Workflows"** en el menú lateral
2. Haz clic en **"New Workflow"** (botón + arriba a la derecha)
3. Pon un nombre: ej. "Enriquecimiento de alertas"

### Paso 4.2: Añadir un Trigger
1. En la barra lateral izquierda del editor, arrastra **"Webhook"** al canvas
2. Haz clic en el webhook y copia la **Webhook URL**
3. Esta URL es la que configurarás en TheHive o Wazuh

### Paso 4.3: Añadir una acción
1. Arrastra una **App** al canvas (ej: "TheHive", "VirusTotal")
2. Conecta el Webhook con la App arrastrando una línea entre ambos
3. Configura los parámetros de la acción (API key, etc.)

### Paso 4.4: Guardar y activar
1. Haz clic en **"Save"**
2. Haz clic en el botón de **Play** para activar el workflow

---

## 5. Integrar con TheHive

### Paso 5.1: Crear un Webhook en Shuffle
Sigue el paso 4.2 y copia la URL del webhook.

### Paso 5.2: Configurar TheHive para enviar alertas
Hay dos opciones:

**Opción A: Desde la interfaz de TheHive (v5+)**
1. En TheHive, ve a **Admin → Platform Management → Notifications**
2. Haz clic en **"Add notifier"**
3. Selecciona tipo **"Webhook"**
4. URL: pega la URL del webhook de Shuffle
5. Selecciona los eventos que quieres enviar (ej: "Alert created")
6. Guarda

**Opción B: Mediante application.conf**

Fichero a modificar: \`/opt/soc-automation/thehive/conf/application.conf\`

\`\`\`bash
sudo nano /opt/soc-automation/thehive/conf/application.conf
\`\`\`

Añade:
\`\`\`
notification.webhook.endpoints = [
  {
    name: "Shuffle"
    url: "http://<IP_SHUFFLE>:${config.port}/api/v1/hooks/<WEBHOOK_ID>"
    version: 0
    wsConfig {}
    auth {
      type: none
    }
    includedTheHiveOrganisations: ["*"]
    excludedTheHiveOrganisations: []
  }
]
\`\`\`

Reinicia TheHive:
\`\`\`bash
cd /opt/soc-automation/docker && docker compose restart thehive
\`\`\`

---

## 6. Integrar con Wazuh

### Qué fichero modificar
\`/var/ossec/etc/ossec.conf\` (en el servidor Wazuh)

### Paso 6.1: Añadir integración
\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

Añade ANTES de \`</ossec_config>\`:
\`\`\`xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:${config.port}/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>3</level>
</integration>
\`\`\`

### Paso 6.2: Reiniciar Wazuh
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

---

## 7. Integrar con VirusTotal

### Paso 7.1: Instalar la App de VirusTotal en Shuffle
1. Ve a **"Apps"** en el menú lateral
2. Busca **"VirusTotal"**
3. Si no aparece, haz clic en **"Search more apps"** → busca "VirusTotal"
4. La app se descargará automáticamente

### Paso 7.2: Usar en un Workflow
1. En tu workflow, arrastra la app **"VirusTotal"** al canvas
2. Conecta la salida del Webhook → VirusTotal
3. Configura:
   - **Action:** Get a hash report / Get an IP report
   - **Apikey:** tu API key de VirusTotal (regístrate gratis en virustotal.com)
   - **Hash/IP:** usa la variable del webhook, ej: \`$exec.all_fields.data.srcip\`

---

## 8. Solución de problemas

### Shuffle no arranca
\`\`\`bash
cd /opt/shuffle
docker compose ps
docker compose logs shuffle-backend
\`\`\`

### Los workflows no se ejecutan
\`\`\`bash
# Verificar que orborus está corriendo (es el ejecutor de workflows)
docker compose logs shuffle-orborus

# Reiniciar orborus
docker compose restart shuffle-orborus
\`\`\`

### Limpiar y reinstalar
\`\`\`bash
cd /opt/shuffle
docker compose down -v
docker compose up -d
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// OPENCTI
// ============================================================================
export function getOpenCTIManual(config: {
  adminEmail: string;
  adminPassword: string;
  port: string;
}): string {
  return `# Manual de Instalación: OpenCTI
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

\`\`\`bash
chmod +x install-opencti.sh
sudo bash install-opencti.sh
\`\`\`

Tiempo estimado: 3-5 minutos. Los contenedores pueden tardar 2-3 minutos adicionales en estar listos.

---

## 3. Primer acceso

### Abrir en el navegador
\`\`\`
http://<IP_DEL_SERVIDOR>:${config.port}
\`\`\`

### Credenciales
- **Email:** ${config.adminEmail}
- **Contraseña:** ${config.adminPassword}

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

Fichero a modificar: \`/opt/opencti/docker-compose.yml\`

\`\`\`bash
sudo nano /opt/opencti/docker-compose.yml
\`\`\`

Añade este servicio ANTES de la sección \`volumes:\`:

\`\`\`yaml
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
\`\`\`

### Paso 4.4: Generar un UUID para el conector
\`\`\`bash
# Ejecuta esto para generar un UUID
cat /proc/sys/kernel/random/uuid
\`\`\`

### Paso 4.5: Obtener el token de admin de OpenCTI
Lo puedes encontrar en la salida del script de instalación, o en:
1. OpenCTI → Settings → Profile → API Access → API Key

### Paso 4.6: Reiniciar
\`\`\`bash
cd /opt/opencti
docker compose up -d
\`\`\`

---

## 5. Conectar con TheHive

### Paso 5.1: Añadir el conector TheHive
Igual que con MISP, hay que añadir un contenedor al docker-compose.yml.

Fichero: \`/opt/opencti/docker-compose.yml\`

\`\`\`yaml
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
\`\`\`

### Paso 5.2: Reiniciar
\`\`\`bash
cd /opt/opencti && docker compose up -d
\`\`\`

---

## 6. Añadir fuentes de inteligencia gratuitas

OpenCTI soporta muchos conectores. Los más útiles y gratuitos:

### AlienVault OTX
\`\`\`yaml
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
\`\`\`

### CVE (vulnerabilidades)
\`\`\`yaml
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
\`\`\`

---

## 7. Solución de problemas

### OpenCTI no carga (error 502)
\`\`\`bash
cd /opt/opencti
docker compose logs opencti | tail -20

# Verificar que Elasticsearch está bien
docker compose logs elasticsearch | tail -10

# El problema más común es memoria insuficiente
free -h
\`\`\`

### Los workers se reinician constantemente
\`\`\`bash
docker compose logs worker | tail -20

# Suele ser porque OpenCTI aún no está listo
# Espera 2-3 minutos y los workers se conectarán solos
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// VELOCIRAPTOR
// ============================================================================
export function getVelociraptorManual(config: {
  adminPassword: string;
  guiPort: string;
  frontendPort: string;
}): string {
  return `# Manual de Instalación: Velociraptor
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Primer acceso a la GUI](#3-primer-acceso)
4. [Desplegar agentes en endpoints](#4-desplegar-agentes)
5. [Recoger artefactos forenses](#5-artefactos)
6. [Integrar con TheHive](#6-integrar-con-thehive)
7. [Solución de problemas](#7-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 2 GB mínimo
- **CPU:** 2 cores
- **Disco:** 20 GB libres
- **Sistema:** Ubuntu 22.04 o 24.04 LTS

---

## 2. Ejecutar el script

\`\`\`bash
chmod +x install-velociraptor.sh
sudo bash install-velociraptor.sh
\`\`\`

El script descarga Velociraptor como binario nativo (no usa Docker), genera la configuración y crea un servicio systemd.

### Ficheros que crea el script
| Fichero | Descripción |
|---------|-------------|
| \`/opt/velociraptor/velociraptor\` | Binario ejecutable |
| \`/opt/velociraptor/server.config.yaml\` | Configuración del servidor |
| \`/opt/velociraptor/client.config.yaml\` | Configuración para los agentes |
| \`/etc/systemd/system/velociraptor.service\` | Servicio systemd |
| \`/opt/velociraptor/clients/\` | Instaladores empaquetados para agentes |

---

## 3. Primer acceso a la GUI

### Abrir en el navegador
\`\`\`
https://<IP_DEL_SERVIDOR>:${config.guiPort}
\`\`\`

> Certificado autofirmado. Acepta el aviso del navegador.

### Credenciales
- **Usuario:** admin
- **Contraseña:** ${config.adminPassword}

---

## 4. Desplegar agentes en endpoints

### 4.1 Obtener la configuración del agente
El fichero que necesitas copiar al endpoint es:
\`\`\`
/opt/velociraptor/client.config.yaml
\`\`\`

### 4.2 En Linux (endpoint)
\`\`\`bash
# Copiar el binario y la config al endpoint
scp usuario@<IP_SERVIDOR>:/opt/velociraptor/velociraptor ./
scp usuario@<IP_SERVIDOR>:/opt/velociraptor/client.config.yaml ./

# Ejecutar como agente
sudo ./velociraptor --config client.config.yaml client -v

# Para dejarlo como servicio:
sudo ./velociraptor --config client.config.yaml service install
\`\`\`

### 4.3 En Windows (endpoint)
1. Copia \`velociraptor.exe\` (descárgalo de GitHub para Windows) y \`client.config.yaml\` al PC
2. Abre CMD como Administrador:
\`\`\`cmd
velociraptor.exe --config client.config.yaml service install
\`\`\`

### 4.4 Verificar que el agente se conecta
1. En la GUI de Velociraptor, ve a la pantalla principal
2. El nuevo endpoint debería aparecer en la lista de clientes
3. Si no aparece, haz clic en el icono de búsqueda y busca por hostname

---

## 5. Recoger artefactos forenses

### 5.1 Crear una recolección (Hunt)
1. Ve a **"Hunt Manager"** en el menú lateral
2. Haz clic en **"New Hunt"** (botón +)
3. Selecciona el artefacto que quieres recoger, por ejemplo:
   - \`Windows.EventLogs.Evtx\` - Logs de eventos de Windows
   - \`Linux.Sys.Users\` - Usuarios del sistema Linux
   - \`Generic.Client.Info\` - Información general del endpoint
4. Selecciona los endpoints objetivo
5. Haz clic en **"Launch"**

### 5.2 Ver resultados
1. Haz clic en el Hunt que acabas de lanzar
2. Ve a la pestaña **"Results"**
3. Los datos se muestran en formato tabla

---

## 6. Integrar con TheHive

### Paso 6.1: Configurar Server Monitoring en Velociraptor

Fichero a modificar: \`/opt/velociraptor/server.config.yaml\`

\`\`\`bash
sudo nano /opt/velociraptor/server.config.yaml
\`\`\`

No es necesario modificar este fichero directamente. La integración se hace desde la GUI.

### Paso 6.2: Usar Shuffle como intermediario (recomendado)
1. En Velociraptor GUI, ve a **"Server Artifacts"** → **"Server.Monitor.Health"**
2. Configura un evento personalizado que envíe datos a un webhook
3. En Shuffle SOAR, crea un workflow:
   - Trigger: Webhook (recibe datos de Velociraptor)
   - Acción: crear alerta en TheHive con los datos recibidos

### Paso 6.3: Script directo con API de TheHive
Crea un script en el servidor Velociraptor:

\`\`\`bash
sudo nano /opt/velociraptor/thehive-alert.sh
\`\`\`

\`\`\`bash
#!/bin/bash
# Enviar alerta a TheHive
curl -X POST "http://<IP_THEHIVE>:9000/api/alert" \\
  -H "Authorization: Bearer <THEHIVE_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "velociraptor",
    "source": "Velociraptor",
    "sourceRef": "'"$(date +%s)"'",
    "title": "Alerta Velociraptor: '"$1"'",
    "description": "'"$2"'",
    "severity": 2,
    "tlp": 2
  }'
\`\`\`

---

## 7. Solución de problemas

### El servicio no arranca
\`\`\`bash
sudo systemctl status velociraptor
sudo journalctl -u velociraptor -f

# Verificar que el puerto no está ocupado
ss -tlnp | grep ${config.guiPort}
\`\`\`

### No puedo acceder desde otro equipo
\`\`\`bash
# Verificar que escucha en 0.0.0.0
ss -tlnp | grep ${config.guiPort}

# Si dice 127.0.0.1, edita la configuración:
sudo nano /opt/velociraptor/server.config.yaml
# Busca "bind_address" y cámbialo a "0.0.0.0"
sudo systemctl restart velociraptor
\`\`\`

### El agente no conecta
Verifica que:
1. El puerto ${config.frontendPort} está abierto en el firewall del servidor
2. El endpoint puede alcanzar la IP del servidor
3. El fichero client.config.yaml tiene la IP correcta

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// GRR RAPID RESPONSE
// ============================================================================
export function getGRRManual(config: {
  adminPassword: string;
  guiPort: string;
}): string {
  return `# Manual de Instalación: GRR Rapid Response
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Primer acceso](#3-primer-acceso)
4. [Desplegar agentes](#4-desplegar-agentes)
5. [Crear un Hunt](#5-crear-hunt)
6. [Solución de problemas](#6-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 4 GB mínimo
- **CPU:** 2 cores
- **Disco:** 30 GB libres
- **Sistema:** Ubuntu 22.04 o 24.04 LTS

---

## 2. Ejecutar el script

\`\`\`bash
chmod +x install-grr.sh
sudo bash install-grr.sh
\`\`\`

El script despliega GRR usando Docker con MySQL 8.0 como base de datos.

### Ficheros que crea el script
| Fichero | Descripción |
|---------|-------------|
| \`/opt/grr/docker-compose.yml\` | Docker Compose con GRR y MySQL |

---

## 3. Primer acceso

### Abrir en el navegador
\`\`\`
http://<IP_DEL_SERVIDOR>:${config.guiPort}
\`\`\`

### Credenciales
- **Usuario:** admin
- **Contraseña:** ${config.adminPassword}

---

## 4. Desplegar agentes

### Paso 4.1: Descargar los instaladores de agente
1. En la Admin UI, ve a **"Manage Binaries"** (menú superior)
2. Busca los binarios de agente para tu sistema operativo
3. Descarga el instalador correspondiente

### Paso 4.2: Instalar agente en Windows
1. Copia el archivo MSI al equipo Windows
2. Ejecuta como Administrador:
\`\`\`cmd
msiexec /i grr-agent.msi /quiet FLEETSPEAK_SERVER=<IP_SERVIDOR_GRR>:8080
\`\`\`

### Paso 4.3: Instalar agente en Linux
\`\`\`bash
sudo dpkg -i grr-agent.deb
# O si es RPM:
sudo rpm -i grr-agent.rpm
\`\`\`

### Paso 4.4: Verificar
El agente debería aparecer en la Admin UI → Search (barra de búsqueda superior)

---

## 5. Crear un Hunt

### Paso 5.1: Ir a Hunts
1. En el menú superior, haz clic en **"Hunt Manager"**
2. Haz clic en **"New Hunt"** (botón +)

### Paso 5.2: Seleccionar artefactos
Elige qué quieres recoger de los endpoints:
- **Filesystem:** buscar archivos por nombre, hash o contenido
- **Registry:** consultar claves del registro (Windows)
- **Network:** conexiones activas, puertos abiertos
- **Process:** procesos en ejecución

### Paso 5.3: Lanzar
1. Configura los parámetros
2. Haz clic en **"Run Hunt"**
3. Los resultados aparecerán conforme los agentes respondan

---

## 6. Solución de problemas

### GRR no arranca
\`\`\`bash
cd /opt/grr
docker compose ps
docker compose logs grr-server
\`\`\`

### MySQL no está listo
GRR espera a que MySQL pase el healthcheck. Si falla:
\`\`\`bash
docker compose logs grr-mysql
# Espera 1-2 minutos y reinicia
docker compose restart grr-server
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// AI ENRICHMENT
// ============================================================================
export function getAIEnrichmentManual(config: {
  enableOllama: boolean;
  ollamaModel: string;
  ollamaPort: string;
  enableVirusTotal: boolean;
  enableAbuseIPDB: boolean;
  enableOTX: boolean;
}): string {
  return `# Manual de Instalación: IA & Threat Intelligence
## By Sistemas 127

---

## Índice
1. [Requisitos previos](#1-requisitos-previos)
2. [Ejecutar el script](#2-ejecutar-el-script)
3. [Estructura de archivos](#3-estructura)
${config.enableOllama ? '4. [Usar Ollama (LLM local)](#4-ollama)\n' : ''}${config.enableVirusTotal ? '5. [Usar VirusTotal](#5-virustotal)\n' : ''}${config.enableAbuseIPDB ? '6. [Usar AbuseIPDB](#6-abuseipdb)\n' : ''}${config.enableOTX ? '7. [Usar OTX AlienVault](#7-otx)\n' : ''}8. [Integrar con Wazuh](#8-integrar-wazuh)
9. [Integrar con TheHive](#9-integrar-thehive)
10. [Solución de problemas](#10-solucion-problemas)

---

## 1. Requisitos previos

- **RAM:** 4 GB mínimo${config.enableOllama ? ' (8 GB+ si usas Ollama con modelos grandes)' : ''}
- **CPU:** 2 cores${config.enableOllama ? ' (GPU NVIDIA opcional para Ollama)' : ''}
- **Disco:** 10 GB libres${config.enableOllama ? ' (+ 4-8 GB por modelo de IA)' : ''}
- **Sistema:** Ubuntu 22.04 o 24.04 LTS
- **Internet:** necesario para consultar APIs externas

---

## 2. Ejecutar el script

\`\`\`bash
chmod +x install-ai-enrichment.sh
sudo bash install-ai-enrichment.sh
\`\`\`

---

## 3. Estructura de archivos creados

El script instala todo en \`/opt/soc-enrichment/\`:

| Fichero/Carpeta | Descripción |
|-----------------|-------------|
| \`/opt/soc-enrichment/venv/\` | Entorno virtual Python (aislado del sistema) |
| \`/opt/soc-enrichment/scripts/\` | Scripts de consulta a cada servicio |
| \`/opt/soc-enrichment/logs/\` | Logs de enriquecimiento |
| \`/opt/soc-enrichment/config/\` | Ficheros de configuración |
${config.enableOllama ? '| `/opt/soc-enrichment/scripts/ollama_analyze.py` | Análisis de alertas con IA local |\n' : ''}${config.enableVirusTotal ? '| `/opt/soc-enrichment/scripts/virustotal_check.py` | Consulta hashes, IPs y URLs en VirusTotal |\n' : ''}${config.enableAbuseIPDB ? '| `/opt/soc-enrichment/scripts/abuseipdb_check.py` | Consulta reputación de IPs |\n' : ''}${config.enableOTX ? '| `/opt/soc-enrichment/scripts/otx_check.py` | Consulta threat intelligence OTX |\n' : ''}| \`/opt/soc-enrichment/scripts/wazuh_enrichment.py\` | Enriquecimiento automático para Wazuh |

---

${config.enableOllama ? `## 4. Usar Ollama (LLM local)

### ¿Qué es Ollama?
Ollama ejecuta modelos de IA (LLM) directamente en tu servidor, sin enviar datos a internet. Es completamente privado.

### Verificar que Ollama funciona
\`\`\`bash
# Comprobar que el servicio está activo
systemctl status ollama

# Verificar que el modelo está descargado
ollama list

# Hacer una prueba rápida
ollama run ${config.ollamaModel} "Hola, ¿funciona?"
\`\`\`

### Analizar una alerta con IA
\`\`\`bash
# Activar el entorno virtual
source /opt/soc-enrichment/venv/bin/activate

# Analizar un texto de alerta
python3 /opt/soc-enrichment/scripts/ollama_analyze.py "Failed password for root from 192.168.1.100 port 22 ssh2"

# También puede recibir entrada por pipe
echo "Suspicious process cmd.exe spawned by winword.exe" | python3 /opt/soc-enrichment/scripts/ollama_analyze.py
\`\`\`

### Cambiar el modelo
\`\`\`bash
# Descargar otro modelo
ollama pull mistral

# Editar el script para usar el nuevo modelo:
sudo nano /opt/soc-enrichment/scripts/ollama_analyze.py
# Cambia la línea MODEL = "${config.ollamaModel}" por MODEL = "mistral"
\`\`\`

### Si Ollama va lento
- Con CPU: es normal que tarde 10-30 segundos por consulta
- Con GPU NVIDIA: instala los drivers CUDA para acelerar 10x
\`\`\`bash
# Instalar soporte NVIDIA (si tienes GPU)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
\`\`\`

` : ''}${config.enableVirusTotal ? `## 5. Usar VirusTotal

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
\`\`\`bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar un hash de archivo
python3 /opt/soc-enrichment/scripts/virustotal_check.py hash 44d88612fea8a8f36de82e1278abb02f

# Consultar una IP
python3 /opt/soc-enrichment/scripts/virustotal_check.py ip 8.8.8.8

# Consultar una URL
python3 /opt/soc-enrichment/scripts/virustotal_check.py url "https://ejemplo-sospechoso.com"
\`\`\`

### Si no configuraste la API Key durante la instalación
Edita el script:
\`\`\`bash
sudo nano /opt/soc-enrichment/scripts/virustotal_check.py
# Busca la línea VT_API_KEY = "" y pega tu API key entre las comillas
\`\`\`

` : ''}${config.enableAbuseIPDB ? `## 6. Usar AbuseIPDB

### Obtener API Key gratuita
1. Ve a https://www.abuseipdb.com
2. Regístrate
3. Ve a tu cuenta → API → Key
4. Copia la API Key

### Límites del plan gratuito
- 1000 consultas por día

### Usar el script
\`\`\`bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar reputación de una IP
python3 /opt/soc-enrichment/scripts/abuseipdb_check.py 185.220.101.1

# Reportar una IP (categoría 18 = brute force)
python3 /opt/soc-enrichment/scripts/abuseipdb_check.py 185.220.101.1 report 18 "Brute force SSH detectado"
\`\`\`

### Si no configuraste la API Key
\`\`\`bash
sudo nano /opt/soc-enrichment/scripts/abuseipdb_check.py
# Busca ABUSEIPDB_KEY = "" y pega tu key
\`\`\`

` : ''}${config.enableOTX ? `## 7. Usar OTX AlienVault

### Obtener API Key gratuita
1. Ve a https://otx.alienvault.com
2. Regístrate
3. Ve a Settings → API Key
4. Copia la API Key

### Sin límite de consultas

### Usar el script
\`\`\`bash
source /opt/soc-enrichment/venv/bin/activate

# Consultar una IP
python3 /opt/soc-enrichment/scripts/otx_check.py ip 185.220.101.1

# Consultar un hash
python3 /opt/soc-enrichment/scripts/otx_check.py hash 44d88612fea8a8f36de82e1278abb02f

# Consultar un dominio
python3 /opt/soc-enrichment/scripts/otx_check.py domain malware-domain.com
\`\`\`

` : ''}## 8. Integrar con Wazuh (Active Response)

### Qué hace esta integración
Cuando Wazuh genera una alerta de nivel 7 o superior, automáticamente consulta AbuseIPDB, VirusTotal y OTX para la IP origen de la alerta.

### Qué fichero se modifica
\`/var/ossec/etc/ossec.conf\` (en el servidor Wazuh)

### Verificar que está configurado
\`\`\`bash
# Buscar la integración en ossec.conf
grep -A5 "soc-enrichment" /var/ossec/etc/ossec.conf

# Verificar que el script de Active Response existe
ls -la /var/ossec/active-response/bin/wazuh-ar-enrich.sh
\`\`\`

### Si no se configuró automáticamente
Significa que Wazuh no estaba instalado cuando ejecutaste el script de IA.

Fichero a modificar: \`/var/ossec/etc/ossec.conf\`

\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

Añade ANTES de \`</ossec_config>\`:

\`\`\`xml
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
\`\`\`

Copia el script:
\`\`\`bash
sudo cp /opt/soc-enrichment/scripts/wazuh-ar-enrich.sh /var/ossec/active-response/bin/
sudo chown root:wazuh /var/ossec/active-response/bin/wazuh-ar-enrich.sh
sudo chmod 750 /var/ossec/active-response/bin/wazuh-ar-enrich.sh
sudo systemctl restart wazuh-manager
\`\`\`

---

## 9. Integrar con TheHive (Webhook)

### Qué hace esta integración
Un servicio escucha en el puerto 9500 y recibe alertas de TheHive por webhook. Cuando llega una alerta, enriquece automáticamente los observables (IPs, hashes, dominios).

### Verificar que está activo
\`\`\`bash
systemctl status soc-enrichment-webhook

# Ver logs
journalctl -u soc-enrichment-webhook -f
\`\`\`

### Configurar TheHive para enviar alertas al webhook

En TheHive (v5), ve a **Admin → Platform Management → Notifications**:
1. Haz clic en **"Add notifier"**
2. Tipo: **Webhook**
3. URL: \`http://<IP_SERVIDOR>:9500\`
4. Eventos: selecciona "Alert created", "Case created"
5. Guarda

---

## 10. Solución de problemas

### Los scripts no funcionan
\`\`\`bash
# Verificar que el entorno virtual existe
ls /opt/soc-enrichment/venv/bin/python3

# Verificar que las dependencias están instaladas
/opt/soc-enrichment/venv/bin/pip list | grep requests
\`\`\`

### Error "API key is missing"
Edita el script correspondiente y añade tu API key.

### Ollama no responde
\`\`\`bash
systemctl restart ollama
sleep 5
ollama list
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// WAZUH CUSTOM RULES
// ============================================================================
export function getWazuhRulesManual(): string {
  return `# Manual: Reglas Personalizadas de Wazuh (Level 12+)
## By Sistemas 127

---

## Índice
1. [¿Qué son las reglas personalizadas?](#1-que-son)
2. [Ejecutar el script](#2-ejecutar-script)
3. [Estructura de reglas instaladas](#3-estructura)
4. [Detalle de cada grupo de reglas](#4-detalle)
5. [Integración con TheHive y Shuffle](#5-integracion)
6. [Personalizar reglas](#6-personalizar)
7. [Gestionar reglas](#7-gestionar)
8. [Solución de problemas](#8-problemas)

---

## 1. ¿Qué son las reglas personalizadas?

Wazuh viene con miles de reglas predefinidas, pero para un SOC profesional necesitas reglas adicionales que detecten amenazas específicas con nivel de severidad alto (12-15).

### Niveles de severidad en Wazuh
| Nivel | Significado | Acción recomendada |
|-------|-----------|-------------------|
| 0-4 | Informativo | Solo log |
| 5-7 | Bajo | Monitorizar |
| 8-11 | Medio | Revisar |
| **12-13** | **Alto** | **Investigar inmediatamente** |
| **14-15** | **Crítico** | **Respuesta inmediata** |

Este script instala reglas de nivel 12-15 que cubren las amenazas más importantes.

---

## 2. Ejecutar el script

### Requisitos
- Wazuh Manager ya instalado y funcionando
- Acceso root al servidor

### Ejecución
\`\`\`bash
chmod +x install-wazuh-rules.sh
sudo bash install-wazuh-rules.sh
\`\`\`

### ¿Qué hace el script?
1. Verifica que Wazuh está instalado en \`/var/ossec\`
2. Crea un backup del fichero de reglas existente
3. Añade las reglas seleccionadas a \`/var/ossec/etc/rules/local_rules.xml\`
4. Verifica la sintaxis con \`wazuh-analysisd -t\`
5. Si hay errores de sintaxis, restaura el backup automáticamente
6. Reinicia Wazuh Manager para aplicar las reglas
7. Opcionalmente configura integraciones con TheHive y Shuffle

---

## 3. Estructura de reglas instaladas

### Fichero principal
\`\`\`
/var/ossec/etc/rules/local_rules.xml
\`\`\`

### IDs de reglas utilizados (rango 100010-100095)
| Rango | Categoría |
|-------|----------|
| 100010-100014 | Fuerza bruta (SSH, RDP, Web) |
| 100020-100023 | Rootkits y troyanos |
| 100030-100037 | Integridad de ficheros críticos |
| 100040-100045 | Escalada de privilegios |
| 100050-100056 | Malware y ejecución sospechosa |
| 100060-100064 | Amenazas de red |
| 100070-100075 | Cumplimiento y auditoría |
| 100080-100095 | Active Directory y Windows Server |

> **Nota:** Los IDs de reglas personalizadas deben ser 100000 o superiores para no interferir con las reglas oficiales de Wazuh.

---

## 4. Detalle de cada grupo de reglas

### 4.1 Fuerza Bruta (100010-100014)

**Regla 100010** - SSH Brute Force (Level 12)
- Detecta 10+ intentos fallidos de SSH en 2 minutos
- Se basa en la regla padre 5710 (SSH failed login)
- MITRE ATT&CK: T1110 (Brute Force)

**Regla 100011** - SSH Brute Force Crítico (Level 14)
- 20+ intentos fallidos en 2 minutos
- Indica un ataque activo en curso

**Regla 100012** - Login tras Brute Force (Level 15) ⚠️
- Login SSH exitoso DESPUÉS de un ataque de fuerza bruta detectado
- **Esta es la regla más crítica**: significa que el atacante ha conseguido acceso
- Requiere respuesta inmediata: cambiar contraseña, revisar actividad

**Regla 100013** - RDP Brute Force (Level 12)
- 8+ intentos fallidos de RDP en Windows

**Regla 100014** - Web Login Brute Force (Level 12)
- 15+ errores HTTP 401 en 1 minuto

### 4.2 Rootkits (100020-100023)

**Regla 100020** - Rootkit Detectado (Level 14)
- Activada por el módulo Rootcheck de Wazuh
- Indica la presencia de un rootkit conocido

**Regla 100021** - Proceso Oculto (Level 14)
- Proceso que no aparece con \`ps\` pero existe en /proc
- Técnica habitual de rootkits

**Regla 100022** - Puerto Oculto (Level 13)
- Puerto de red que escucha pero no aparece en \`netstat\`
- Posible backdoor

### 4.3 Integridad de Ficheros (100030-100037)

Para que estas reglas funcionen, Syscheck (FIM) debe estar habilitado.

**Verificar que Syscheck está activo:**
\`\`\`bash
grep -A10 "<syscheck>" /var/ossec/etc/ossec.conf
\`\`\`

**Debe incluir los directorios críticos:**
\`\`\`xml
<syscheck>
  <directories realtime="yes">/etc,/usr/bin,/usr/sbin,/bin,/sbin</directories>
  <directories realtime="yes">/tmp,/var/tmp</directories>
</syscheck>
\`\`\`

**Si no están, añádelos:**

Fichero: \`/var/ossec/etc/ossec.conf\`
\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

Busca la sección \`<syscheck>\` y añade las líneas de \`<directories>\` dentro.

**Regla 100032** - /etc/sudoers modificado (Level 15)
- Alguien ha cambiado los permisos de sudo
- Verificar inmediatamente quién y por qué

**Regla 100035** - Binario del sistema modificado (Level 14)
- Un ejecutable en /usr/bin, /bin, etc. ha sido modificado
- Posible trojanización de comandos del sistema

### 4.4 Escalada de Privilegios (100040-100045)

**Regla 100042** - Múltiples sudo fallidos (Level 14)
- 5+ intentos fallidos de sudo en 1 minuto
- Alguien está intentando escalar privilegios

**Regla 100044** - Usuario añadido a grupo admin (Level 14)
- Un usuario ha sido añadido al grupo sudo/wheel/admin
- Verificar que es legítimo

### 4.5 Malware (100050-100056)

**Regla 100052** - Reverse Shell (Level 15) ⚠️
- Detecta patrones de reverse shell: bash -i, nc -e, python socket
- **Respuesta inmediata**: aislar el equipo de la red

**Regla 100054** - PowerShell Encoded (Level 14)
- PowerShell con \`-EncodedCommand\` o \`-WindowStyle Hidden\`
- Técnica muy común en malware para Windows

**Regla 100056** - Cryptominer (Level 14)
- Detecta xmrig, stratum+tcp y otros indicadores de minería

### 4.6 Red (100060-100064)

**Regla 100060** - Port Scan (Level 12)
- 15+ conexiones rechazadas en 30 segundos desde la misma IP

### 4.7 Cumplimiento (100070-100075)

**Regla 100071** - Borrado de Logs (Level 14)
- Detecta \`rm /var/log\`, \`truncate\`, \`shred\`
- Anti-forense: alguien intenta borrar evidencias

**Regla 100074** - Firewall Desactivado (Level 14)
- \`ufw disable\`, \`iptables -F\`, etc.
- El sistema queda expuesto

### 4.8 Active Directory y Windows Server (100080-100095)

**Requisitos:** Estas reglas requieren que los Domain Controllers envíen sus logs al Wazuh Manager a través del agente de Wazuh. Los EventIDs clave son: 4662, 4768, 4769, 4741, 4742, 5136, 7045.

**Configurar la auditoría avanzada en el DC:**
\\\`\\\`\\\`powershell
# Habilitar auditoría de Directory Service Access
auditpol /set /subcategory:"Directory Service Access" /success:enable /failure:enable
# Habilitar auditoría de cambios en Directory Service
auditpol /set /subcategory:"Directory Service Changes" /success:enable /failure:enable
# Habilitar auditoría de Kerberos
auditpol /set /subcategory:"Kerberos Authentication Service" /success:enable /failure:enable
auditpol /set /subcategory:"Kerberos Service Ticket Operations" /success:enable /failure:enable
\\\`\\\`\\\`

**Regla 100080** - DCSync (Level 15) ⚠️ CRÍTICA
- Detecta replicación de directorio no autorizada
- MITRE: T1003.006 (OS Credential Dumping: DCSync)
- Un atacante con permisos DCSync puede extraer TODOS los hashes NTLM del dominio
- **Respuesta:** Aislar el equipo, revocar credenciales, buscar cuentas comprometidas

**Regla 100081** - Golden Ticket (Level 15) ⚠️ CRÍTICA
- Detecta solicitudes Kerberos TGS anómalas (EventID 4769)
- MITRE: T1558.001 (Steal or Forge Kerberos Tickets: Golden Ticket)
- Un Golden Ticket da acceso TOTAL al dominio durante 10 años por defecto
- **Respuesta:** Reset de la cuenta krbtgt (2 veces), auditar todos los accesos

**Regla 100082** - Silver Ticket (Level 14)
- Detecta tickets Kerberos con cifrado RC4 (0x17) — débil y sospechoso
- MITRE: T1558.002 (Silver Ticket)
- Permite acceso a un servicio específico sin autenticación real

**Regla 100083** - Pass-the-Hash (Level 14)
- Logon tipo 9 (NewCredentials) indica uso de hash NTLM robado
- MITRE: T1550.002 (Use Alternate Authentication Material: PtH)
- **Respuesta:** Identificar origen, cambiar contraseñas afectadas

**Regla 100084** - Pass-the-Ticket (Level 14)
- Solicitudes TGT desde hosts inusuales
- MITRE: T1550.003 (Pass the Ticket)

**Regla 100085** - Kerberoasting (Level 14) — Frecuencia
- 10+ solicitudes TGS en 1 minuto desde la misma IP
- MITRE: T1558.003 (Kerberoasting)
- El atacante solicita tickets para luego crackear offline los hashes de servicio
- **Respuesta:** Identificar cuentas de servicio con SPN, rotar contraseñas

**Regla 100086** - AS-REP Roasting (Level 13)
- Cuentas sin pre-autenticación Kerberos habilitada
- MITRE: T1558.004 (AS-REP Roasting)
- **Prevención:** Asegurar que TODAS las cuentas tienen pre-autenticación

**Regla 100087** - Cuenta de equipo sospechosa (Level 13)
- Nueva cuenta de equipo creada en AD (EventID 4741)
- Verificar si es legítima o un intento de persistencia

**Regla 100088** - Modificación de GPO (Level 14)
- Cambios en Group Policy Objects (EventID 5136)
- MITRE: T1484.001 (Domain Policy Modification)
- Las GPO controlan configuración de seguridad de todo el dominio

**Regla 100089** - Grupo de Domain Admins modificado (Level 15) ⚠️ CRÍTICA
- Usuario añadido a Domain Admins, Enterprise Admins o Schema Admins
- MITRE: T1078.002 (Valid Accounts: Domain Accounts)
- **Respuesta inmediata:** Verificar legitimidad, si no es autorizado → revocar

**Regla 100090** - Reconocimiento LDAP (Level 13)
- Consultas LDAP amplias que pueden indicar enumeración de AD
- MITRE: T1018 (Remote System Discovery)
- Herramientas como BloodHound, ADRecon generan este tipo de queries

**Regla 100091** - Skeleton Key / Mimikatz (Level 15) ⚠️ CRÍTICA
- Detecta referencias a mimidrv, mimilib o mimikatz
- MITRE: T1556.001 (Modify Authentication Process)
- Skeleton Key permite login con cualquier contraseña en TODOS los equipos

**Regla 100092** - Acceso a NTDS.dit (Level 15) ⚠️ CRÍTICA
- Acceso al fichero de base de datos de Active Directory
- MITRE: T1003.003 (OS Credential Dumping: NTDS)
- Contiene TODOS los hashes de contraseñas del dominio

**Regla 100093** - DCShadow (Level 15) ⚠️ CRÍTICA
- Registro de un Domain Controller falso
- MITRE: T1207 (Rogue Domain Controller)
- Permite modificar objetos AD sin ser detectado por logs normales

**Regla 100094** - Movimiento lateral WMI/PSExec/WinRM (Level 13)
- Ejecución remota detectada
- MITRE: T1047 (Windows Management Instrumentation), T1021.006 (WinRM)

**Regla 100095** - Windows Defender desactivado (Level 14)
- Desactivación de antivirus — posible preparación para ataque
- MITRE: T1562.001 (Impair Defenses)

---

## 5. Integración con TheHive y Shuffle

### Configurar envío a TheHive

El script puede configurar automáticamente la integración. Si lo haces manualmente:

Fichero: \`/var/ossec/etc/ossec.conf\`

\`\`\`bash
sudo nano /var/ossec/etc/ossec.conf
\`\`\`

Añade ANTES de \`</ossec_config>\`:
\`\`\`xml
<integration>
  <name>thehive</name>
  <hook_url>http://<IP_THEHIVE>:9000/api/alert</hook_url>
  <api_key><TU_API_KEY></api_key>
  <alert_format>json</alert_format>
  <level>12</level>
</integration>
\`\`\`

> Con \`<level>12</level>\`, solo se envían a TheHive las alertas de nivel 12 o superior (las reglas que acabamos de instalar).

### Configurar envío a Shuffle SOAR

\`\`\`xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>12</level>
</integration>
\`\`\`

Reinicia después:
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

---

## 6. Personalizar reglas

### Añadir una nueva regla

Fichero: \`/var/ossec/etc/rules/local_rules.xml\`

\`\`\`bash
sudo nano /var/ossec/etc/rules/local_rules.xml
\`\`\`

Ejemplo: detectar acceso SSH desde un país específico (requiere GeoIP):
\`\`\`xml
<rule id="100080" level="13">
  <if_sid>5715</if_sid>
  <geoip_srcip>CN|RU|KP</geoip_srcip>
  <description>Login SSH desde país de alto riesgo</description>
  <group>ssh,geolocation,</group>
</rule>
\`\`\`

### Modificar el nivel de una regla existente
\`\`\`xml
<!-- Subir la regla 5710 de nivel 5 a nivel 8 -->
<rule id="100081" level="8">
  <if_sid>5710</if_sid>
  <description>SSH: intento de login fallido (nivel aumentado)</description>
</rule>
\`\`\`

### Verificar sintaxis SIEMPRE antes de reiniciar
\`\`\`bash
/var/ossec/bin/wazuh-analysisd -t
\`\`\`

Si la salida dice "Configuration OK", reinicia:
\`\`\`bash
sudo systemctl restart wazuh-manager
\`\`\`

---

## 7. Gestionar reglas

### Ver todas las reglas personalizadas
\`\`\`bash
cat /var/ossec/etc/rules/local_rules.xml
\`\`\`

### Buscar una regla específica
\`\`\`bash
grep -A5 "100012" /var/ossec/etc/rules/local_rules.xml
\`\`\`

### Ver alertas en tiempo real
\`\`\`bash
# Alertas en formato JSON
tail -f /var/ossec/logs/alerts/alerts.json | jq .

# Solo alertas nivel 12+
tail -f /var/ossec/logs/alerts/alerts.json | jq 'select(.rule.level >= 12)'
\`\`\`

### Desactivar una regla temporalmente
Añade al fichero local_rules.xml:
\`\`\`xml
<rule id="100010" level="0">
  <if_sid>5710</if_sid>
  <description>Regla desactivada temporalmente</description>
</rule>
\`\`\`

### Restaurar reglas originales
\`\`\`bash
# Ver backups disponibles
ls -la /var/ossec/etc/rules/local_rules.xml.bak.*

# Restaurar el último backup
cp /var/ossec/etc/rules/local_rules.xml.bak.<FECHA> /var/ossec/etc/rules/local_rules.xml
systemctl restart wazuh-manager
\`\`\`

---

## 8. Solución de problemas

### Error de sintaxis al reiniciar
\`\`\`bash
# Ver el error exacto
/var/ossec/bin/wazuh-analysisd -t 2>&1

# Errores comunes:
# - Falta cerrar una etiqueta XML
# - ID de regla duplicado
# - if_sid referencia una regla que no existe
\`\`\`

### Las reglas no generan alertas
\`\`\`bash
# Verificar que las reglas están cargadas
/var/ossec/bin/wazuh-analysisd -t 2>&1 | grep "100010"

# Simular una alerta
/var/ossec/bin/wazuh-logtest
# Pega un log de ejemplo y verifica qué regla dispara
\`\`\`

### Probar una regla con wazuh-logtest
\`\`\`bash
/var/ossec/bin/wazuh-logtest
\`\`\`

Pega este ejemplo para probar la regla de fuerza bruta SSH:
\`\`\`
Dec 10 12:00:00 server sshd[12345]: Failed password for root from 192.168.1.100 port 22 ssh2
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// INTEGRACIÓN CORTAFUEGOS CON WAZUH
// ============================================================================
export function getFirewallIntegrationManual(): string {
  return `# Manual de Implantación: Integración de Cortafuegos con Wazuh
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

\`\`\`
┌─────────────┐  syslog   ┌──────────────────┐
│  OPNsense   │──────────▶│                  │
│  pfSense    │           │   WAZUH SERVER   │
└─────────────┘           │                  │
                          │  - Reglas custom  │
┌─────────────┐  agente   │  - Decoders      │
│  Windows    │──────────▶│  - Active Resp.  │
│  Linux      │           │                  │
└─────────────┘           └──────────────────┘
\`\`\`

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
\`\`\`bash
systemctl status wazuh-manager
# Debe mostrar: active (running)

# Verificar versión
/var/ossec/bin/wazuh-control info
\`\`\`

### Abrir puertos necesarios
\`\`\`bash
# Puerto syslog para OPNsense/pfSense
sudo ufw allow 514/udp comment "Wazuh Syslog"

# Puerto de registro de agentes
sudo ufw allow 1514/tcp comment "Wazuh Agent Registration"
sudo ufw allow 1515/tcp comment "Wazuh Agent Enrollment"
\`\`\`

---

## 3. Windows Defender Firewall

### 3.1 Funcionamiento
Windows Defender Firewall genera eventos en el visor de eventos de Windows. El agente Wazuh los recoge automáticamente y los envía al servidor para su análisis.

### 3.2 Instalar el agente Wazuh en Windows

#### Paso 1: Descargar el instalador
\`\`\`powershell
# Desde PowerShell como Administrador
Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.0-1.msi" -OutFile "$env:TEMP\\wazuh-agent.msi"
\`\`\`

#### Paso 2: Instalar el agente
\`\`\`powershell
msiexec.exe /i "$env:TEMP\\wazuh-agent.msi" /q WAZUH_MANAGER="<IP_SERVIDOR_WAZUH>" WAZUH_AGENT_GROUP="firewalls"
\`\`\`

#### Paso 3: Iniciar el servicio
\`\`\`powershell
NET START WazuhSvc
\`\`\`

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
El script configura automáticamente el fichero \`/var/ossec/etc/shared/firewalls/agent.conf\` en el servidor Wazuh para que los agentes Windows recojan los eventos del firewall sin intervención manual.

**Fichero:** \`/var/ossec/etc/shared/firewalls/agent.conf\`
\`\`\`xml
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
\`\`\`

### 3.5 Verificar que funciona
\`\`\`bash
# En el servidor Wazuh, ver agentes del grupo firewalls
/var/ossec/bin/agent_groups -l -g firewalls

# Buscar eventos de Windows Firewall en los logs
grep "windows_firewall" /var/ossec/logs/alerts/alerts.json | tail -5
\`\`\`

---

## 4. OPNsense

### 4.1 Funcionamiento
OPNsense envía sus logs de firewall al servidor Wazuh mediante syslog remoto. Wazuh usa decoders personalizados para interpretar el formato \`filterlog\`.

### 4.2 Configurar OPNsense

#### Paso 1: Acceder a la interfaz web
Abre \`https://<IP_OPNSENSE>\` en el navegador.

#### Paso 2: Configurar syslog remoto
1. Ve a **System → Settings → Logging / targets**
2. Haz clic en **"+"** para añadir un nuevo destino
3. Configura:
   - **Enabled:** ✅
   - **Transport:** UDP(4)
   - **Applications:** filterlog
   - **Levels:** Informational y superiores
   - **Hostname:** \`<IP_SERVIDOR_WAZUH>\`
   - **Port:** \`514\`
   - **Facility:** local0
4. Haz clic en **"Save"**
5. Haz clic en **"Apply"**

#### Paso 3: Verificar que OPNsense envía logs
\`\`\`bash
# En el servidor Wazuh, verificar que llegan los logs
tcpdump -i any port 514 -n -c 10
\`\`\`

### 4.3 Decoder personalizado
El script instala automáticamente el decoder \`opnsense-filterlog\` en:
\`\`\`
/var/ossec/etc/decoders/firewall_custom_decoders.xml
\`\`\`

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
Idéntico a OPNsense: envío por syslog remoto. Wazuh usa el decoder \`pf\` para interpretar los logs de packet filter.

### 5.2 Configurar pfSense

#### Paso 1: Acceder a la interfaz web
Abre \`https://<IP_PFSENSE>\` en el navegador.

#### Paso 2: Configurar syslog remoto
1. Ve a **Status → System Logs → Settings**
2. Marca **"Enable Remote Logging"**
3. En **"Remote log servers"**, añade: \`<IP_SERVIDOR_WAZUH>:514\`
4. En **"Remote Syslog Contents"**, marca:
   - ✅ Firewall Events
   - ✅ System Events (opcional)
5. Haz clic en **"Save"**

#### Paso 3: Verificar
\`\`\`bash
# En el servidor Wazuh
tcpdump -i any port 514 -n -c 10
# Deberías ver paquetes desde la IP de pfSense
\`\`\`

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

\`\`\`bash
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
\`\`\`

### 6.3 Habilitar logging de UFW
\`\`\`bash
# Activar UFW si no está activo
sudo ufw enable

# Habilitar logging de nivel alto
sudo ufw logging high

# Verificar que se generan logs
tail -f /var/log/ufw.log
\`\`\`

### 6.4 Configuración centralizada (agent.conf)
El script configura automáticamente:

**Fichero:** \`/var/ossec/etc/shared/firewalls/agent.conf\`
\`\`\`xml
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
\`\`\`

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
- **Eliminación de Shadow Copies:** \`vssadmin delete shadows\`, \`wmic shadowcopy delete\`
- **Eliminación de backups:** \`wbadmin delete\`, \`bcdedit /set {default} recoveryenabled no\`
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

1. **En Linux:** Ejecuta \`ransomware-isolate.sh\`
   - Bloquea todo el tráfico con iptables
   - Permite solo la comunicación con el servidor Wazuh
   - Log en \`/var/ossec/logs/active-responses.log\`

2. **En Windows:** Ejecuta \`ransomware-isolate.cmd\`
   - Bloquea todo el tráfico con netsh
   - Permite solo la comunicación con el servidor Wazuh
   - Log en \`C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log\`

#### Timeout
- La máquina se aísla durante **1 hora** (3600 segundos)
- Pasado ese tiempo, las reglas se eliminan automáticamente
- Durante el aislamiento, **Wazuh sigue recibiendo datos** del agente

### 7.5 Desbloquear manualmente una máquina

#### Linux
\`\`\`bash
# Ver las reglas de aislamiento
sudo iptables -L -n | grep -i "wazuh\\|drop"

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
\`\`\`

#### Windows
\`\`\`powershell
# Ver reglas de aislamiento
netsh advfirewall firewall show rule name="WAZUH_RANSOMWARE_ISOLATION"

# Eliminar las reglas
netsh advfirewall firewall delete rule name="WAZUH_RANSOMWARE_ISOLATION"

# O restaurar todo el firewall a su estado por defecto
netsh advfirewall reset
\`\`\`

### 7.6 Ficheros de Active Response

**Linux:** \`/var/ossec/active-response/bin/ransomware-isolate.sh\`
\`\`\`bash
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
\`\`\`

**Windows:** \`C:\\Program Files (x86)\\ossec-agent\\active-response\\bin\\ransomware-isolate.cmd\`
\`\`\`cmd
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
\`\`\`

---

## 8. Verificación y pruebas

### 8.1 Verificar que las reglas están cargadas
\`\`\`bash
# Verificar sintaxis
/var/ossec/bin/wazuh-analysisd -t

# Buscar reglas de cortafuegos
grep -c "100[2-3][0-9][0-9]" /var/ossec/etc/rules/firewall_custom_rules.xml
\`\`\`

### 8.2 Probar con wazuh-logtest
\`\`\`bash
/var/ossec/bin/wazuh-logtest
\`\`\`

**Ejemplo de log UFW para probar:**
\`\`\`
Mar  1 10:15:23 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC=00:11:22:33:44:55 SRC=192.168.1.100 DST=192.168.1.10 LEN=40 TOS=0x00 PREC=0x00 TTL=64 ID=12345 PROTO=TCP SPT=54321 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0
\`\`\`

**Ejemplo de log para probar ransomware:**
\`\`\`
syscheck: File '/home/user/documents/important.encrypted' was added
\`\`\`

### 8.3 Verificar agentes conectados
\`\`\`bash
# Listar agentes del grupo firewalls
/var/ossec/bin/agent_groups -l -g firewalls

# Ver estado de todos los agentes
/var/ossec/bin/agent_control -l
\`\`\`

### 8.4 Verificar logs de alertas
\`\`\`bash
# Buscar alertas de cortafuegos
grep "firewall" /var/ossec/logs/alerts/alerts.json | tail -10

# Buscar alertas de ransomware
grep "ransomware" /var/ossec/logs/alerts/alerts.json | tail -5

# Ver alertas en tiempo real
tail -f /var/ossec/logs/alerts/alerts.json | grep -i "firewall\\|ransomware"
\`\`\`

---

## 9. Solución de problemas

### No llegan logs de OPNsense/pfSense
\`\`\`bash
# 1. Verificar que el puerto está abierto
ss -ulnp | grep 514

# 2. Verificar con tcpdump
tcpdump -i any port 514 -n -c 5

# 3. Si no llegan paquetes, comprobar firewall del servidor
sudo ufw status | grep 514

# 4. Comprobar que OPNsense/pfSense apunta al servidor correcto
# (revisar la configuración de syslog en la interfaz web)
\`\`\`

### El agente Windows no se conecta
\`\`\`powershell
# Verificar estado del servicio
Get-Service WazuhSvc

# Ver logs del agente
Get-Content "C:\\Program Files (x86)\\ossec-agent\\ossec.log" -Tail 20

# Verificar conectividad con el servidor
Test-NetConnection -ComputerName <IP_SERVIDOR_WAZUH> -Port 1514
\`\`\`

### Las reglas no generan alertas
\`\`\`bash
# 1. Verificar sintaxis
/var/ossec/bin/wazuh-analysisd -t

# 2. Verificar que las reglas están en el directorio correcto
ls -la /var/ossec/etc/rules/firewall_custom_rules.xml

# 3. Reiniciar Wazuh Manager
systemctl restart wazuh-manager

# 4. Probar manualmente con logtest
/var/ossec/bin/wazuh-logtest
\`\`\`

### El aislamiento por ransomware no funciona
\`\`\`bash
# Verificar que el script existe y tiene permisos
ls -la /var/ossec/active-response/bin/ransomware-isolate.sh
chmod 750 /var/ossec/active-response/bin/ransomware-isolate.sh
chown root:wazuh /var/ossec/active-response/bin/ransomware-isolate.sh

# Verificar la configuración de Active Response en ossec.conf
grep -A5 "ransomware" /var/ossec/etc/ossec.conf

# Probar el script manualmente (CUIDADO: aislará la máquina)
# /var/ossec/active-response/bin/ransomware-isolate.sh add
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}

// ============================================================================
// WAZUH ACTIVE RESPONSE MANUAL
// ============================================================================
export function getWazuhActiveResponseManual(): string {
  return `# Manual de Active Response: Wazuh
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
\`\`\`
Evento → Wazuh Decoder → Regla Level 12+ → Trigger Rule → Active Response → Script en Agente
\`\`\`

---

## 2. Arquitectura del sistema

### Ficheros en el servidor Wazuh
\`\`\`
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
\`\`\`

---

## 3. Scripts Windows / Windows Server

### 3.1 Bloqueo de IP (block-ip.ps1)
**Función:** Crea reglas en Windows Firewall para bloquear IPs atacantes.
- Bloquea tanto tráfico entrante como saliente
- Crea reglas con nombre \`WazuhBlock_<IP>\` para fácil identificación
- Soporta desbloqueo automático (timeout configurable)

**Se activa con:**
- Fuerza bruta SSH/RDP (EventID 4625 repetido)
- Port scan detectado
- Conexión desde nodo Tor
- Cryptominer detectado

### 3.2 Deshabilitar Usuario (disable-user.ps1)
**Función:** Deshabilita cuentas locales y de Active Directory comprometidas.
- Compatible con Windows 10/11, Windows Server 2016/2019/2022
- Detecta si existe Active Directory y usa \`Disable-ADAccount\`
- Para equipos sin AD, usa \`Disable-LocalUser\`
- Re-habilitación automática tras timeout

**Se activa con:**
- Múltiples fallos de login (EventID 4625)
- Intento de sudo no autorizado
- Lockout de cuenta (EventID 4740)

### 3.3 Aislamiento de Host (isolate-host.ps1)
**Función:** Aísla completamente el host de la red.
- Cambia perfil de firewall a Block All (Domain, Public, Private)
- Permite ÚNICAMENTE comunicación con el servidor Wazuh (puertos 1514/1515)
- Guarda backup del firewall en \`C:\\ProgramData\\wazuh-fw-backup.wfw\`
- Reversible: restaura el firewall original al desaislar

**⚠️ PELIGRO:** Esta acción corta TODA la conectividad de red excepto con Wazuh.

**Se activa con:**
- Ransomware detectado (Level 15)
- Rootkit detectado (Level 15)
- Reverse shell detectado (Level 15)

### 3.4 Matar Proceso (kill-process.ps1)
**Función:** Termina procesos maliciosos en ejecución.
- Recolecta información forense antes de matar (PID, ruta, línea de comandos)
- Usa \`Stop-Process -Force\`
- Registra toda la actividad en el log de AR

**Se activa con:**
- Reverse shell detectado
- Cryptominer detectado

### 3.5 Recolección Forense (collect-forensics.ps1)
**Función:** Captura un snapshot completo del estado del sistema.
- Conexiones de red activas (\`Get-NetTCPConnection\`)
- Procesos en ejecución con rutas
- Eventos de seguridad (últimos 200)
- Tareas programadas activas
- Servicios en ejecución
- Entradas de autorun (Run keys del registro)
- Cache DNS
- Tabla ARP

Los datos se guardan en \`C:\\ProgramData\\wazuh-forensics\\<timestamp>\`

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
- \`usermod -L\`: bloquea la contraseña
- \`chage -E 0\`: expira la cuenta inmediatamente
- \`pkill -u\`: mata todas las sesiones activas del usuario
- **Protección:** Nunca deshabilita root, wazuh ni ossec

### 4.3 Aislamiento de Host (linux-isolate-host.sh)
**Función:** Aislamiento total de red vía iptables.
- Guarda backup de reglas actuales en \`/var/ossec/tmp/iptables-backup.rules\`
- DROP por defecto en INPUT, OUTPUT y FORWARD
- Permite loopback y comunicación con servidor Wazuh
- Permite DNS para resolución del servidor
- Mantiene conexiones establecidas

### 4.4 Matar Proceso (linux-kill-process.sh)
**Función:** Elimina procesos maliciosos con recolección forense.
- Lee \`/proc/<pid>/cmdline\` y \`/proc/<pid>/exe\` antes de matar
- Usa \`pkill -9 -f\` para terminación forzada
- **Protección:** Lista de procesos protegidos (wazuh, ossec, sshd, systemd, init)

### 4.5 Recolección Forense (linux-collect-forensics.sh)
**Función:** Captura completa del estado del sistema.
- \`ss -tulnpa\`: conexiones de red
- \`ps auxwwf\`: árbol de procesos
- \`lsof -i\`: ficheros de red abiertos
- \`last/lastb\`: logins recientes y fallidos
- Crontabs de todos los usuarios
- Timers de systemd
- Módulos del kernel cargados
- Tabla ARP
- Ficheros recientes en /tmp, /var/tmp, /dev/shm
- Logs de autenticación
- Usuarios con shell activa

Datos guardados en \`/var/ossec/forensics/<timestamp>\` con permisos 600.

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
\`\`\`
/var/ossec/etc/shared/default/*.ps1
\`\`\`

El \`agent.conf\` configurado incluye:
- EventChannel: Security, System, Sysmon, PowerShell, Windows Defender
- FIM: System32\\drivers\\etc, System32\\config, Users
- Registry monitoring: Run keys, Services

Los agentes Windows descargan automáticamente el contenido del shared folder en cada check-in (por defecto cada 10 minutos).

### 6.2 Linux
Los scripts Bash se instalan en:
\`\`\`
/var/ossec/active-response/bin/
\`\`\`

El \`agent.conf\` configurado incluye:
- Syslog: auth.log, syslog
- Audit: audit.log
- FIM: /etc, /usr/bin, /usr/sbin, /bin, /sbin, /boot, /tmp, /var/tmp
- Rootcheck completo: files, trojans, dev, sys, pids, ports, interfaces

---

## 7. Software necesario en los clientes

### 7.1 Windows (Desktop y Server)

#### Requerido
- **Wazuh Agent** (\`wazuh-agent-4.x-1.msi\`)
  \`\`\`powershell
  # Instalación silenciosa
  msiexec /i wazuh-agent-4.14-1.msi /q WAZUH_MANAGER="IP_SERVIDOR" WAZUH_REGISTRATION_SERVER="IP_SERVIDOR" WAZUH_AGENT_GROUP="default"
  
  # Iniciar servicio
  NET START WazuhSvc
  \`\`\`

#### Recomendado
- **Sysmon** (Microsoft Sysinternals) - Monitorización avanzada de procesos
  \`\`\`powershell
  # Descargar Sysmon
  Invoke-WebRequest -Uri "https://download.sysinternals.com/files/Sysmon.zip" -OutFile "Sysmon.zip"
  Expand-Archive Sysmon.zip -DestinationPath C:\\Sysmon
  
  # Instalar con configuración SwiftOnSecurity
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/SwiftOnSecurity/sysmon-config/master/sysmonconfig-export.xml" -OutFile "C:\\Sysmon\\sysmonconfig.xml"
  C:\\Sysmon\\Sysmon64.exe -accepteula -i C:\\Sysmon\\sysmonconfig.xml
  \`\`\`

- **PowerShell Script Block Logging**
  \`\`\`powershell
  # Habilitar logging avanzado de PowerShell
  New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Force
  Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 1
  \`\`\`

#### Solo Windows Server
- **Active Directory PowerShell Module** (si el servidor es DC)
  \`\`\`powershell
  Install-WindowsFeature RSAT-AD-PowerShell
  \`\`\`

### 7.2 Linux

#### Requerido
- **Wazuh Agent**
  \`\`\`bash
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
  \`\`\`

#### Recomendado
- **auditd** - Auditoría del kernel
  \`\`\`bash
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
  \`\`\`

- **iptables/nftables** (normalmente preinstalado)
  \`\`\`bash
  apt-get install -y iptables        # Debian/Ubuntu
  yum install -y iptables-services   # CentOS/RHEL
  \`\`\`

---

## 8. Verificación y pruebas

### 8.1 Verificar que AR funciona en el servidor
\`\`\`bash
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
\`\`\`

### 8.2 Probar bloqueo de IP (SAFE)
\`\`\`bash
# En el agente Linux, simular bloqueo
/var/ossec/active-response/bin/linux-block-ip.sh add - 10.10.10.99

# Verificar que la regla se creó
iptables -L -n | grep 10.10.10.99

# Desbloquear
/var/ossec/active-response/bin/linux-block-ip.sh delete - 10.10.10.99
\`\`\`

### 8.3 Probar recolección forense (SAFE)
\`\`\`bash
# En el agente Linux
/var/ossec/active-response/bin/linux-collect-forensics.sh add

# Ver los datos recolectados
ls -la /var/ossec/forensics/
cat /var/ossec/forensics/*/processes.txt | head -20
\`\`\`

### 8.4 Verificar agentes Windows
\`\`\`powershell
# Ver estado del servicio
Get-Service WazuhSvc

# Ver logs del agente
Get-Content "C:\\Program Files (x86)\\ossec-agent\\ossec.log" -Tail 20

# Ver scripts desplegados
Get-ChildItem "C:\\Program Files (x86)\\ossec-agent\\shared\\*.ps1"

# Ver log de Active Response
Get-Content "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log" -Tail 20
\`\`\`

### 8.5 Simular ataque para probar (CONTROLADO)
\`\`\`bash
# En un equipo de test, generar fallos de login SSH (disparará block-ip)
for i in {1..15}; do ssh baduser@TARGET_IP 2>/dev/null; done

# Verificar que se bloqueó en el agente
iptables -L -n | grep DROP

# Verificar la alerta en el servidor
grep "100410" /var/ossec/logs/alerts/alerts.json | tail -1
\`\`\`

---

## 9. Solución de problemas

### Los scripts AR no se ejecutan
\`\`\`bash
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
\`\`\`

### El aislamiento de host no revierte
\`\`\`bash
# Linux - restaurar manualmente
iptables -F
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

# O restaurar desde backup
iptables-restore < /var/ossec/tmp/iptables-backup.rules
\`\`\`

\`\`\`powershell
# Windows - restaurar manualmente
netsh advfirewall import "C:\\ProgramData\\wazuh-fw-backup.wfw"
# O resetear
netsh advfirewall reset
Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction NotConfigured -DefaultOutboundAction NotConfigured
\`\`\`

### Los scripts PS1 no llegan a los agentes Windows
\`\`\`bash
# 1. Verificar que están en shared folder
ls -la /var/ossec/etc/shared/default/*.ps1

# 2. Verificar permisos
chown wazuh:wazuh /var/ossec/etc/shared/default/*.ps1

# 3. Forzar sync al agente
/var/ossec/bin/agent_control -r -u AGENT_ID

# 4. Verificar en el agente Windows
Get-ChildItem "C:\\Program Files (x86)\\ossec-agent\\shared\\"
\`\`\`

### Error de sintaxis en las reglas
\`\`\`bash
# 1. Test de sintaxis
/var/ossec/bin/wazuh-analysisd -t

# 2. Si falla, revisar el fichero
xmllint --noout /var/ossec/etc/rules/active_response_rules.xml

# 3. Restaurar backup
ls -la /var/ossec/etc/rules/active_response_rules.xml.bak.*
cp /var/ossec/etc/rules/active_response_rules.xml.bak.TIMESTAMP /var/ossec/etc/rules/active_response_rules.xml

# 4. Reiniciar
systemctl restart wazuh-manager
\`\`\`

---

*Manual generado por SOC Automation - By Sistemas 127*
`;
}
