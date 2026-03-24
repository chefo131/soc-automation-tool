// Generadores de scripts para herramientas SOC adicionales
// Shuffle SOAR, OpenCTI, Velociraptor, GRR Rapid Response

export interface ShuffleConfig {
  adminPassword: string;
  port: string;
  opensearchPort: string;
  serverIp: string;
  installDir: string;
}

export interface OpenCTIConfig {
  adminEmail: string;
  adminPassword: string;
  port: string;
  connectorPort: string;
  serverIp: string;
  mispUrl: string;
  mispApiKey: string;
}

export interface VelociraptorConfig {
  adminPassword: string;
  guiPort: string;
  frontendPort: string;
  serverIp: string;
}

export interface GRRConfig {
  adminPassword: string;
  guiPort: string;
  serverIp: string;
}

export function generateShuffleScript(config: ShuffleConfig): string {
  return `#!/bin/bash
#============================================================================
# SOC Automation - Shuffle SOAR Installer
# Plataforma de orquestación y automatización de respuesta a incidentes
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}            Shuffle SOAR - Instalador Automático                \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

# Detectar recursos del sistema
TOTAL_RAM_GB=\$(($(free -m | awk '/^Mem:/{print $2}') / 1024))
CPU_CORES=\$(nproc)
DISK_AVAIL=\$(df -BG / | awk 'NR==2{print \$4}' | tr -d 'G')
ok "RAM: \${TOTAL_RAM_GB}GB | CPU: \${CPU_CORES} cores | Disco: \${DISK_AVAIL}GB"
add_summary "Sistema: \${TOTAL_RAM_GB}GB RAM, \${CPU_CORES} cores"

SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP: \$SERVER_IP"
add_summary "IP del servidor: \$SERVER_IP"

# Instalar Docker
status "Verificando Docker..."
if ! command -v docker &>/dev/null; then
    status "Instalando Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release > /dev/null 2>&1
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    systemctl enable --now docker
fi
ok "Docker instalado"
add_summary "Docker: OK"

# Configurar Shuffle
INSTALL_DIR="${config.installDir || '/opt/shuffle'}"
mkdir -p \$INSTALL_DIR
cd \$INSTALL_DIR

status "Generando Docker Compose para Shuffle..."

cat > docker-compose.yml << DOCKER_EOF
services:
  shuffle-frontend:
    image: ghcr.io/shuffle/shuffle-frontend:latest
    container_name: shuffle-frontend
    hostname: shuffle-frontend
    ports:
      - "0.0.0.0:${config.port}:80"
      - "0.0.0.0:3443:443"
    environment:
      - BACKEND_HOSTNAME=shuffle-backend
    restart: unless-stopped
    depends_on:
      - shuffle-backend
    networks:
      - shuffle

  shuffle-backend:
    image: ghcr.io/shuffle/shuffle-backend:latest
    container_name: shuffle-backend
    hostname: shuffle-backend
    ports:
      - "0.0.0.0:5001:5001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - shuffle-apps:/shuffle-apps
      - shuffle-files:/shuffle-files
    environment:
      - SHUFFLE_APP_HOTLOAD_FOLDER=/shuffle-apps
      - SHUFFLE_FILE_LOCATION=/shuffle-files
      - SHUFFLE_OPENSEARCH_URL=http://shuffle-opensearch:9200
      - SHUFFLE_DEFAULT_USERNAME=admin
      - SHUFFLE_DEFAULT_PASSWORD=${config.adminPassword}
      - SHUFFLE_DEFAULT_APIKEY=\$(openssl rand -hex 32)
      - ORG_ID=Shuffle
      - SHUFFLE_PASS_APP_PROXY=true
    restart: unless-stopped
    depends_on:
      - shuffle-opensearch
    networks:
      - shuffle

  shuffle-orborus:
    image: ghcr.io/shuffle/shuffle-orborus:latest
    container_name: shuffle-orborus
    hostname: shuffle-orborus
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - SHUFFLE_APP_SDK_VERSION=latest
      - SHUFFLE_WORKER_VERSION=latest
      - BASE_URL=http://shuffle-backend:5001
      - ORG_ID=Shuffle
      - ENVIRONMENT_NAME=Shuffle
      - DOCKER_API_VERSION=1.40
      - SHUFFLE_PASS_WORKER_PROXY=true
    restart: unless-stopped
    networks:
      - shuffle

  shuffle-opensearch:
    image: opensearchproject/opensearch:2.11.0
    container_name: shuffle-opensearch
    hostname: shuffle-opensearch
    environment:
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - bootstrap.memory_lock=true
      - DISABLE_INSTALL_DEMO_CONFIG=true
      - DISABLE_SECURITY_PLUGIN=true
      - cluster.name=shuffle-cluster
      - node.name=shuffle-opensearch
      - discovery.type=single-node
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - \$INSTALL_DIR/shuffle-database:/usr/share/opensearch/data
    ports:
      - "0.0.0.0:${config.opensearchPort}:9200"
    restart: unless-stopped
    networks:
      - shuffle

volumes:
  shuffle-apps:
  shuffle-files:

networks:
  shuffle:
    driver: bridge
DOCKER_EOF

ok "Docker Compose generado"
add_summary "Docker Compose: generado"

# Optimización del sistema para OpenSearch
status "Aplicando optimizaciones del sistema..."

# 1. vm.max_map_count (requerido por OpenSearch)
sysctl -w vm.max_map_count=262144 > /dev/null 2>&1
grep -q "vm.max_map_count" /etc/sysctl.conf || echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# 2. Deshabilitar swap (recomendado para OpenSearch)
swapoff -a
ok "Swap deshabilitado temporalmente"
add_summary "Swap: deshabilitado (recomendado para OpenSearch)"

# 3. Crear directorio de datos con permisos correctos (UID 1000 = opensearch)
mkdir -p \$INSTALL_DIR/shuffle-database
chown -R 1000:1000 \$INSTALL_DIR/shuffle-database
chmod 755 \$INSTALL_DIR/shuffle-database
ok "Directorio shuffle-database con permisos correctos (1000:1000)"
add_summary "Permisos: shuffle-database → 1000:1000"

status "Descargando imágenes Docker..."
docker compose pull 2>&1 | tail -1 || true

status "Iniciando Shuffle SOAR..."
docker compose up -d 2>&1 | tail -1
ok "Shuffle iniciado"
add_summary "Shuffle SOAR: iniciado"

# Esperar a que OpenSearch esté disponible
status "Esperando a que OpenSearch arranque (puede tardar hasta 2 minutos)..."
for i in \$(seq 1 24); do
    OS_HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${config.opensearchPort} 2>/dev/null || echo "000")
    if [ "\$OS_HTTP" = "200" ]; then
        ok "OpenSearch disponible"
        break
    fi
    sleep 5
done

# Verificar que el backend se conectó a OpenSearch
sleep 10
if docker ps --filter "name=shuffle-backend" --filter "status=running" --format "{{.Names}}" | grep -q "shuffle-backend"; then
    ok "Shuffle Backend funcionando"
else
    warn "Shuffle Backend puede estar reiniciándose, espere 1-2 minutos más"
    warn "Si persiste, ejecute: cd \$INSTALL_DIR && docker compose logs shuffle-backend"
fi

sleep 15

# Configuración del firewall
if command -v ufw &>/dev/null; then
    ufw allow ${config.port}/tcp comment "Shuffle Frontend" > /dev/null 2>&1
    ufw allow 3443/tcp comment "Shuffle HTTPS" > /dev/null 2>&1
    ok "Firewall configurado"
    add_summary "Firewall: puertos ${config.port}, 3443"
fi

# Summary
clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  SHUFFLE SOAR - INSTALACIÓN COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}📋 Resumen:\${NC}"
while IFS= read -r item; do
    echo -e "    \${CYAN}•\${NC} \$item"
done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}🌐 Acceso:\${NC}"
echo -e "    \${CYAN}URL:\${NC}       http://\$SERVER_IP:${config.port}"
echo -e "    \${CYAN}HTTPS:\${NC}     https://\$SERVER_IP:3443"
echo -e "    \${CYAN}Usuario:\${NC}   admin"
echo -e "    \${CYAN}Contraseña:\${NC} ${config.adminPassword}"
echo ""
echo -e "  \${BOLD}⚙ Gestión:\${NC}"
echo -e "    cd \$INSTALL_DIR && docker compose up -d / down / logs -f"
echo ""
echo -e "  \${BOLD}📖 Integración con TheHive/Wazuh:\${NC}"
echo -e "    1. Accede a Shuffle y ve a Workflows"
echo -e "    2. Crea un nuevo workflow y añade el trigger 'Webhook'"
echo -e "    3. Configura TheHive para enviar alertas al webhook de Shuffle"
echo -e "    4. Añade acciones: análisis VT, bloqueo IP en Wazuh, notificación"
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`;
}

export function generateOpenCTIScript(config: OpenCTIConfig): string {
  return `#!/bin/bash
#============================================================================
# SOC Automation - OpenCTI Installer
# Plataforma de inteligencia de amenazas (Threat Intelligence)
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}            OpenCTI - Instalador Automático                     \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

TOTAL_RAM_GB=\$(($(free -m | awk '/^Mem:/{print $2}') / 1024))
ok "RAM: \${TOTAL_RAM_GB}GB | CPU: \$(nproc) cores"
add_summary "Sistema: \${TOTAL_RAM_GB}GB RAM, \$(nproc) cores"

SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP: \$SERVER_IP"
add_summary "IP: \$SERVER_IP"

# Instalar Docker
if ! command -v docker &>/dev/null; then
    status "Instalando Docker..."
    apt-get update -qq && apt-get install -y -qq ca-certificates curl gnupg lsb-release > /dev/null 2>&1
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    systemctl enable --now docker
fi
ok "Docker OK"

INSTALL_DIR="/opt/opencti"
mkdir -p \$INSTALL_DIR
cd \$INSTALL_DIR

OPENCTI_ADMIN_TOKEN=\$(openssl rand -hex 32)
CONNECTOR_EXPORT_TOKEN=\$(openssl rand -hex 32)
MINIO_ROOT_PASS=\$(openssl rand -base64 16)

status "Generando Docker Compose para OpenCTI..."

cat > docker-compose.yml << DOCKER_EOF
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data
    networks:
      - opencti-net

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.2
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.ml.enabled=false
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    networks:
      - opencti-net

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=opencti
      - MINIO_ROOT_PASSWORD=\${MINIO_ROOT_PASS}
    volumes:
      - miniodata:/data
    networks:
      - opencti-net

  rabbitmq:
    image: rabbitmq:3-management
    restart: unless-stopped
    environment:
      - RABBITMQ_DEFAULT_USER=opencti
      - RABBITMQ_DEFAULT_PASS=${config.adminPassword}
    volumes:
      - rabbitmqdata:/var/lib/rabbitmq
    networks:
      - opencti-net

  opencti:
    image: opencti/platform:latest
    restart: unless-stopped
    ports:
      - "0.0.0.0:${config.port}:8080"
    environment:
      - NODE_OPTIONS=--max-old-space-size=8096
      - APP__PORT=8080
      - APP__BASE_URL=http://\$SERVER_IP:${config.port}
      - APP__ADMIN__EMAIL=${config.adminEmail}
      - APP__ADMIN__PASSWORD=${config.adminPassword}
      - APP__ADMIN__TOKEN=\${OPENCTI_ADMIN_TOKEN}
      - APP__APP_LOGS__LOGS_LEVEL=error
      - REDIS__HOSTNAME=redis
      - REDIS__PORT=6379
      - ELASTICSEARCH__URL=http://elasticsearch:9200
      - MINIO__ENDPOINT=minio
      - MINIO__PORT=9000
      - MINIO__USE_SSL=false
      - MINIO__ACCESS_KEY=opencti
      - MINIO__SECRET_KEY=\${MINIO_ROOT_PASS}
      - RABBITMQ__HOSTNAME=rabbitmq
      - RABBITMQ__PORT=5672
      - RABBITMQ__USERNAME=opencti
      - RABBITMQ__PASSWORD=${config.adminPassword}
      - SMTP__HOSTNAME=localhost
      - SMTP__PORT=25
    depends_on:
      - redis
      - elasticsearch
      - minio
      - rabbitmq
    networks:
      - opencti-net

  worker:
    image: opencti/worker:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=\${OPENCTI_ADMIN_TOKEN}
      - WORKER_LOG_LEVEL=info
    depends_on:
      - opencti
    deploy:
      replicas: 3
    networks:
      - opencti-net

  connector-export-file-stix:
    image: opencti/connector-export-file-stix:latest
    restart: unless-stopped
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=\${OPENCTI_ADMIN_TOKEN}
      - CONNECTOR_ID=\${CONNECTOR_EXPORT_TOKEN}
      - CONNECTOR_TYPE=INTERNAL_EXPORT_FILE
      - CONNECTOR_NAME=ExportFileStix2
      - CONNECTOR_SCOPE=application/json
      - CONNECTOR_LOG_LEVEL=info
    depends_on:
      - opencti
    networks:
      - opencti-net

volumes:
  esdata:
  redisdata:
  miniodata:
  rabbitmqdata:

networks:
  opencti-net:
    driver: bridge
DOCKER_EOF

ok "Docker Compose generado"
add_summary "Docker Compose: generado"

sysctl -w vm.max_map_count=1048575 > /dev/null 2>&1
grep -q "vm.max_map_count" /etc/sysctl.conf || echo "vm.max_map_count=1048575" >> /etc/sysctl.conf

status "Descargando imágenes..."
docker compose pull 2>&1 | tail -1

status "Iniciando OpenCTI (puede tardar 2-3 minutos)..."
docker compose up -d 2>&1 | tail -1
ok "OpenCTI iniciado"
add_summary "OpenCTI: iniciado"

sleep 30

if command -v ufw &>/dev/null; then
    ufw allow ${config.port}/tcp comment "OpenCTI" > /dev/null 2>&1
    add_summary "Firewall: puerto ${config.port}"
fi

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  OpenCTI - INSTALACIÓN COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}📋 Resumen:\${NC}"
while IFS= read -r item; do echo -e "    \${CYAN}•\${NC} \$item"; done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}🌐 Acceso:\${NC}"
echo -e "    \${CYAN}URL:\${NC}        http://\$SERVER_IP:${config.port}"
echo -e "    \${CYAN}Email:\${NC}      ${config.adminEmail}"
echo -e "    \${CYAN}Contraseña:\${NC} ${config.adminPassword}"
echo -e "    \${CYAN}API Token:\${NC}  \${OPENCTI_ADMIN_TOKEN}"
echo ""
echo -e "  \${BOLD}📖 Integración con MISP:\${NC}"
echo -e "    1. En OpenCTI → Data → Connectors → Add → MISP"
echo -e "    2. URL MISP: ${config.mispUrl || 'https://<MISP_IP>'}"
echo -e "    3. API Key: ${config.mispApiKey || '<MISP_API_KEY>'}"
echo -e "    4. Los indicadores se sincronizarán automáticamente"
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`;
}

export function generateVelociraptorScript(config: VelociraptorConfig): string {
  return `#!/bin/bash
#============================================================================
# SOC Automation - Velociraptor Installer
# Monitorización de endpoints y forense digital
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}          Velociraptor - Instalador Automático                  \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP: \$SERVER_IP"
add_summary "IP: \$SERVER_IP"

INSTALL_DIR="/opt/velociraptor"
mkdir -p \$INSTALL_DIR
cd \$INSTALL_DIR

# Descargar Velociraptor
VELOX_VERSION="0.73"
ARCH=\$(dpkg --print-architecture 2>/dev/null || echo "amd64")

status "Descargando Velociraptor v\${VELOX_VERSION}..."
curl -sLo velociraptor "https://github.com/Velocidex/velociraptor/releases/download/v\${VELOX_VERSION}/velociraptor-v\${VELOX_VERSION}-1-linux-\${ARCH}" || \\
curl -sLo velociraptor "https://github.com/Velocidex/velociraptor/releases/latest/download/velociraptor-v\${VELOX_VERSION}-linux-\${ARCH}"
chmod +x velociraptor
ok "Velociraptor descargado"
add_summary "Velociraptor v\${VELOX_VERSION}: descargado"

# Generar configuración
status "Generando configuración del servidor..."

cat > server_config_input.json << CONFIGEOF
{
  "autocert_domain": "",
  "autocert_cert_cache": "",
  "use_self_signed_ssl": "Y",
  "frontend_hostname": "\$SERVER_IP",
  "frontend_port": "${config.frontendPort}",
  "gui_bind_address": "0.0.0.0",
  "gui_port": "${config.guiPort}",
  "gui_initial_users": "admin",
  "gui_initial_password": "${config.adminPassword}",
  "datastore_location": "\$INSTALL_DIR/data"
}
CONFIGEOF

./velociraptor config generate --merge server_config_input.json > server.config.yaml 2>/dev/null || \\
./velociraptor config generate > server.config.yaml

# Asegurar que la GUI escucha en todas las interfaces
sed -i 's/bind_address: 127.0.0.1/bind_address: 0.0.0.0/g' server.config.yaml
sed -i 's/bind_address: localhost/bind_address: 0.0.0.0/g' server.config.yaml

ok "Configuración generada"
add_summary "Configuración: bind 0.0.0.0 para acceso LAN"

# Crear servicio systemd
status "Creando servicio systemd..."
cat > /etc/systemd/system/velociraptor.service << SVCEOF
[Unit]
Description=Velociraptor Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=\$INSTALL_DIR
ExecStart=\$INSTALL_DIR/velociraptor --config \$INSTALL_DIR/server.config.yaml frontend -v
Restart=on-failure
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable velociraptor
systemctl start velociraptor
ok "Servicio creado e iniciado"
add_summary "Servicio systemd: activo"

# Generar configuración del agente
./velociraptor config client --config server.config.yaml > client.config.yaml 2>/dev/null || true
ok "Configuración de agente generada en \$INSTALL_DIR/client.config.yaml"
add_summary "Config agente: \$INSTALL_DIR/client.config.yaml"

# Configuración del firewall
if command -v ufw &>/dev/null; then
    ufw allow ${config.guiPort}/tcp comment "Velociraptor GUI" > /dev/null 2>&1
    ufw allow ${config.frontendPort}/tcp comment "Velociraptor Frontend" > /dev/null 2>&1
    add_summary "Firewall: puertos ${config.guiPort}, ${config.frontendPort}"
fi

# Generar instaladores de agente
status "Generando instaladores de agente..."
mkdir -p \$INSTALL_DIR/clients

./velociraptor config repack --exe velociraptor client.config.yaml \$INSTALL_DIR/clients/velociraptor-client-repacked 2>/dev/null || \\
cp client.config.yaml \$INSTALL_DIR/clients/
ok "Instaladores en \$INSTALL_DIR/clients/"
add_summary "Instaladores agente: \$INSTALL_DIR/clients/"

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  VELOCIRAPTOR - INSTALACIÓN COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}📋 Resumen:\${NC}"
while IFS= read -r item; do echo -e "    \${CYAN}•\${NC} \$item"; done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}🌐 Acceso:\${NC}"
echo -e "    \${CYAN}GUI:\${NC}        https://\$SERVER_IP:${config.guiPort}"
echo -e "    \${CYAN}Frontend:\${NC}   https://\$SERVER_IP:${config.frontendPort}"
echo -e "    \${CYAN}Usuario:\${NC}    admin"
echo -e "    \${CYAN}Contraseña:\${NC} ${config.adminPassword}"
echo ""
echo -e "  \${BOLD}📖 Desplegar agentes:\${NC}"
echo -e "    1. Copia client.config.yaml al endpoint"
echo -e "    2. Ejecuta: ./velociraptor --config client.config.yaml client -v"
echo -e "    3. O usa el instalador empaquetado en \$INSTALL_DIR/clients/"
echo ""
echo -e "  \${BOLD}📖 Integración con TheHive:\${NC}"
echo -e "    1. En Velociraptor → Server Artifacts → Server.Audit.Logs"
echo -e "    2. Configura un webhook hacia TheHive para crear alertas"
echo -e "    3. Usa Shuffle SOAR como intermediario para workflows avanzados"
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`;
}

export function generateGRRScript(config: GRRConfig): string {
  return `#!/bin/bash
#============================================================================
# SOC Automation - GRR Rapid Response Installer
# Framework de respuesta a incidentes y forense remoto
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}          GRR Rapid Response - Instalador Automático            \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP: \$SERVER_IP"
add_summary "IP: \$SERVER_IP"

# Instalar Docker
if ! command -v docker &>/dev/null; then
    status "Instalando Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release > /dev/null 2>&1
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq && apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    systemctl enable --now docker
fi
ok "Docker OK"

INSTALL_DIR="/opt/grr"
mkdir -p \$INSTALL_DIR
cd \$INSTALL_DIR

status "Generando Docker Compose para GRR..."

cat > docker-compose.yml << DOCKER_EOF
services:
  grr-server:
    image: ghcr.io/google/grr:v3.4.7.4
    container_name: grr-server
    command: -component admin_ui -component frontend -component worker
    ports:
      - "0.0.0.0:${config.guiPort}:8000"
      - "0.0.0.0:8080:8080"
    environment:
      - GRR_EXTERNAL_HOSTNAME=\$SERVER_IP
      - ADMIN_PASSWORD=${config.adminPassword}
      - GRR_ADMIN_UI_PORT=8000
      - GRR_FRONTEND_PORT=8080
      - MYSQL_HOST=grr-mysql
      - MYSQL_PORT=3306
      - MYSQL_DATABASE=grr
      - MYSQL_USERNAME=grr
      - MYSQL_PASSWORD=${config.adminPassword}
    depends_on:
      grr-mysql:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - grr-net

  grr-mysql:
    image: mysql:8.0
    container_name: grr-mysql
    environment:
      - MYSQL_DATABASE=grr
      - MYSQL_USER=grr
      - MYSQL_PASSWORD=${config.adminPassword}
      - MYSQL_ROOT_PASSWORD=${config.adminPassword}Root!
    volumes:
      - grr-mysql-data:/var/lib/mysql
    healthcheck:
      test: mysqladmin ping -h 127.0.0.1 -u root --password=${config.adminPassword}Root!
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped
    networks:
      - grr-net

volumes:
  grr-mysql-data:

networks:
  grr-net:
    driver: bridge
DOCKER_EOF

ok "Docker Compose generado"
add_summary "Docker Compose: generado"

status "Descargando imágenes..."
docker compose pull 2>&1 | tail -1

status "Iniciando GRR (puede tardar 2-3 minutos)..."
docker compose up -d 2>&1 | tail -1
ok "GRR iniciado"
add_summary "GRR: iniciado"

sleep 30

if command -v ufw &>/dev/null; then
    ufw allow ${config.guiPort}/tcp comment "GRR Admin UI" > /dev/null 2>&1
    ufw allow 8080/tcp comment "GRR Frontend" > /dev/null 2>&1
    add_summary "Firewall: puertos ${config.guiPort}, 8080"
fi

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  GRR RAPID RESPONSE - INSTALACIÓN COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}📋 Resumen:\${NC}"
while IFS= read -r item; do echo -e "    \${CYAN}•\${NC} \$item"; done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}🌐 Acceso:\${NC}"
echo -e "    \${CYAN}Admin UI:\${NC}   http://\$SERVER_IP:${config.guiPort}"
echo -e "    \${CYAN}Frontend:\${NC}   http://\$SERVER_IP:8080"
echo -e "    \${CYAN}Usuario:\${NC}    admin"
echo -e "    \${CYAN}Contraseña:\${NC} ${config.adminPassword}"
echo ""
echo -e "  \${BOLD}📖 Desplegar agentes GRR:\${NC}"
echo -e "    1. Accede a la Admin UI"
echo -e "    2. Ve a Manage Binaries → Configurar clientes"
echo -e "    3. Descarga el instalador para cada SO"
echo -e "    4. Despliega en los endpoints objetivo"
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`;
}
