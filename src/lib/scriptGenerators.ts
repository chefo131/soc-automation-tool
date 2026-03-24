// Generadores de scripts para TheHive, Cortex, MISP y Wazuh

export interface TheHiveConfig {
  orgName: string;
  adminEmail: string;
  adminPassword: string;
  thehivePort: string;
  cortexPort: string;
  mispPort: string;
  elasticPassword: string;
  mispApiKey: string;
  cortexApiKey: string;
  thehiveApiKey: string;
  serverIp: string;
  installDir: string;
}

export interface WazuhConfig {
  distro: string;
  wazuhVersion: string;
  adminPassword: string;
  apiPort: string;
  dashboardPort: string;
  serverIp: string;
}

export function generateMD5Key(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTheHiveCortexMISPScript(config: TheHiveConfig): string {
  const thehiveApi = config.thehiveApiKey || generateRandomKey();
  const cortexApi = config.cortexApiKey || generateRandomKey();
  const mispApi = config.mispApiKey || generateRandomKey();
  const thehiveSecret = generateMD5Key();
  const cortexSecret = generateMD5Key();
  const installDir = config.installDir || '/opt/soc-stack';

  return `#!/bin/bash
#============================================================================
# SOC Automation - TheHive + Cortex + MISP Installer
# Compatible: Ubuntu 24.04 LTS (Docker-based)
# Organization: ${config.orgName}
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Colores
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'
BOLD='\\033[1m'
BG_BLUE='\\033[44m'
WHITE='\\033[1;37m'

# Funciones de salida
clear
show_banner() {
    echo ""
    echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}              SOC Automation Script Generator                  \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
    echo ""
}

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

# Recolector de resumen
SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

show_banner

#============================================================================
# DETECTAR RECURSOS DEL SISTEMA
#============================================================================
status "Analizando recursos del sistema..."

TOTAL_RAM_MB=\$(free -m | awk '/^Mem:/{print \$2}')
TOTAL_RAM_GB=\$((TOTAL_RAM_MB / 1024))
CPU_CORES=\$(nproc)
DISK_AVAIL=\$(df -BG / | awk 'NR==2{print \$4}' | tr -d 'G')

ok "RAM: \${TOTAL_RAM_GB}GB | CPU: \${CPU_CORES} cores | Disco: \${DISK_AVAIL}GB"
add_summary "Sistema: \${TOTAL_RAM_GB}GB RAM, \${CPU_CORES} CPU cores, \${DISK_AVAIL}GB disco"

# Validación de RAM mínima
if [ "\$TOTAL_RAM_GB" -lt 4 ]; then
    warn "RAM limitada (\${TOTAL_RAM_GB}GB). La instalación puede ser lenta."
fi

# Validaciones
[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root (usa sudo)"

if [ "\$TOTAL_RAM_GB" -lt 4 ]; then
    warn "RAM insuficiente (\${TOTAL_RAM_GB}GB). Mínimo recomendado: 8GB"
    read -p "  ¿Continuar? (s/n): " -r
    [[ ! \$REPLY =~ ^[Ss]\$ ]] && exit 1
fi

if [ "\$DISK_AVAIL" -lt 20 ]; then
    warn "Espacio en disco bajo (\${DISK_AVAIL}GB). Mínimo recomendado: 50GB"
    read -p "  ¿Continuar? (s/n): " -r
    [[ ! \$REPLY =~ ^[Ss]\$ ]] && exit 1
fi

#============================================================================
# IP DEL SERVIDOR
#============================================================================
SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP del servidor: \$SERVER_IP"
add_summary "IP del servidor: \$SERVER_IP"

#============================================================================
# INSTALAR DOCKER
#============================================================================
status "Instalando dependencias..."

apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release jq apt-transport-https software-properties-common > /dev/null 2>&1

if ! command -v docker &>/dev/null; then
    status "Instalando Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    systemctl enable --now docker
    ok "Docker instalado"
else
    ok "Docker ya instalado"
fi
add_summary "Docker: instalado"

# Añadir usuario actual al grupo docker
CURRENT_USER=\${SUDO_USER:-\$USER}
if [ "\$CURRENT_USER" != "root" ]; then
    usermod -aG docker "\$CURRENT_USER"
    ok "Usuario \$CURRENT_USER añadido al grupo docker"
    add_summary "Usuario \$CURRENT_USER añadido al grupo docker"
fi

#============================================================================
# ESTRUCTURA DE DIRECTORIOS
#============================================================================
status "Creando estructura de directorios..."

INSTALL_DIR="${installDir}"
mkdir -p \${INSTALL_DIR}/cortex/{server-configs,logs,files,ssl}
mkdir -p \${INSTALL_DIR}/{server-configs,logs,files,ssl}
mkdir -p /tmp/cortex-jobs
chmod 777 /tmp/cortex-jobs

cd \${INSTALL_DIR}
ok "Directorios creados en \${INSTALL_DIR}"
add_summary "Directorios: \${INSTALL_DIR} (con cortex/, server-configs/, logs/, files/, ssl/)"

#============================================================================
# CORTEX APPLICATION.CONF
#============================================================================
status "Generando configuración de Cortex..."

cat > \${INSTALL_DIR}/cortex/application.conf << CORTEX_CONF_EOF
# /cortex/application.conf - ${config.orgName}
play.http.secret.key="${cortexSecret}"

search.host = "0.0.0.0"
search.port = 9001

# Directorios internos
job-directory = "/tmp/cortex-jobs"
datastore.directory = "/tmp/cortex-datastore"
CORTEX_CONF_EOF

ok "Cortex application.conf generado (secret: ${cortexSecret})"
add_summary "Cortex secret key: ${cortexSecret}"

#============================================================================
# CORTEX TMPFILES.D (persistencia de /tmp/cortex-jobs entre reinicios)
#============================================================================
status "Creando configuración tmpfiles.d para Cortex..."

cat > /etc/tmpfiles.d/cortex.conf << TMPFILES_EOF
d /tmp/cortex-jobs 0777 docker docker - -
TMPFILES_EOF

systemd-tmpfiles --create /etc/tmpfiles.d/cortex.conf 2>/dev/null || true
ok "Fichero /etc/tmpfiles.d/cortex.conf creado"
add_summary "tmpfiles.d: /etc/tmpfiles.d/cortex.conf (persistencia /tmp/cortex-jobs)"

#============================================================================
# OPTIMIZACIONES DEL SISTEMA
#============================================================================
status "Aplicando optimizaciones del sistema..."

sysctl -w vm.max_map_count=262144 > /dev/null 2>&1
echo "vm.max_map_count=262144" | tee -a /etc/sysctl.conf > /dev/null 2>&1

if ! grep -q "nofile 65536" /etc/security/limits.conf; then
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
EOF
fi
ok "Optimizaciones aplicadas (vm.max_map_count=262144)"
add_summary "Optimizaciones del kernel: vm.max_map_count=262144"

#============================================================================
# GENERAR DOCKER COMPOSE
#============================================================================
status "Generando Docker Compose..."

mkdir -p \${INSTALL_DIR}
cat > \${INSTALL_DIR}/docker-compose.yml << DOCKER_EOF
services:
  ###########################################################################
  # THEHIVE 5
  ###########################################################################
  thehive:
    image: strangebee/thehive:5.2
    container_name: thehive
    restart: unless-stopped
    depends_on:
      - cassandra
      - elasticsearch
      - minio
      - cortex.local
    mem_limit: 1500m
    ports:
      - "0.0.0.0:${config.thehivePort}:9000"
    environment:
      - JVM_OPTS=-Xms1024M -Xmx1024M
    command:
      - --secret
      - "${thehiveSecret}"
      - "--cql-hostnames"
      - "cassandra"
      - "--index-backend"
      - "elasticsearch"
      - "--es-hostnames"
      - "elasticsearch"
      - "--s3-endpoint"
      - "http://minio:9002"
      - "--s3-access-key"
      - "sistemas127minio"
      - "--s3-secret-key"
      - "ChangeMinioPass!123"
      - "--s3-use-path-access-style"
    volumes:
      - thehivedata:/etc/thehive/application.conf
    networks:
      - SOC_NET

  ###########################################################################
  # CASSANDRA (base de datos de TheHive)
  ###########################################################################
  cassandra:
    image: cassandra:4
    container_name: cassandra
    restart: unless-stopped
    ports:
      - "0.0.0.0:9042:9042"
    environment:
      - CASSANDRA_CLUSTER_NAME=TheHive
    volumes:
      - cassandradata:/var/lib/cassandra
    networks:
      - SOC_NET

  ###########################################################################
  # ELASTICSEARCH (índices de TheHive)
  ###########################################################################
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.9
    container_name: elasticsearch
    restart: unless-stopped
    mem_limit: 512m
    ports:
      - "0.0.0.0:9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - cluster.name=hive
      - http.host=0.0.0.0
      - ES_JAVA_OPTS=-Xms256m -Xmx256m
    volumes:
      - elasticsearchdata:/usr/share/elasticsearch/data
    networks:
      - SOC_NET

  ###########################################################################
  # MINIO (S3-compatible para ficheros adjuntos de TheHive)
  ###########################################################################
  minio:
    image: quay.io/minio/minio
    container_name: minio
    restart: unless-stopped
    command: ["minio", "server", "/data", "--console-address", ":9002"]
    environment:
      - MINIO_ROOT_USER=sistemas127minio
      - MINIO_ROOT_PASSWORD=ChangeMinioPass!123
    ports:
      - "0.0.0.0:9002:9002"
    volumes:
      - miniodata:/data
    networks:
      - SOC_NET

  ###########################################################################
  # CORTEX (motor de análisis) - FQDN interno: cortex.local
  ###########################################################################
  cortex.local:
    image: thehiveproject/cortex:latest
    container_name: cortex
    restart: unless-stopped
    environment:
      - job_directory=/tmp/cortex-jobs
      - docker_job_directory=/tmp/cortex-jobs
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /tmp/cortex-jobs:/tmp/cortex-jobs
      - ./cortex/logs:/var/log/cortex
      - ./cortex/application.conf:/cortex/application.conf
    depends_on:
      - elasticsearch
    ports:
      - "0.0.0.0:${config.cortexPort}:9001"
    networks:
      - SOC_NET

  ###########################################################################
  # MISP (Malware Information Sharing Platform) - FQDN interno: misp.local
  ###########################################################################
  misp.local:
    image: coolacid/misp-docker:core-latest
    container_name: misp
    restart: unless-stopped
    depends_on:
      - misp_mysql
      - redis
    ports:
      - "0.0.0.0:80:80"
      - "0.0.0.0:${config.mispPort}:443"
    volumes:
      - "./server-configs/:/var/www/MISP/app/Config/"
      - "./logs/:/var/www/MISP/app/tmp/logs/"
      - "./files/:/var/www/MISP/app/files"
      - "./ssl/:/etc/nginx/certs"
    environment:
      - MYSQL_HOST=misp_mysql
      - MYSQL_DATABASE=mispdb
      - MYSQL_USER=mispuser
      - MYSQL_PASSWORD=ChangeMispDbPass!123
      - MISP_ADMIN_EMAIL=admin@clockwork.lab
      - MISP_ADMIN_PASSPHRASE=ChangeMispAdminPass!123
      - MISP_BASEURL=https://\$SERVER_IP
      - TIMEZONE=Europe/Madrid
      - INIT=true
      - CRON_USER_ID=1
      - REDIS_FQDN=redis
      - HOSTNAME=https://\$SERVER_IP
    networks:
      - SOC_NET

  ###########################################################################
  # MySQL para MISP
  ###########################################################################
  misp_mysql:
    image: mysql/mysql-server:5.7
    container_name: misp_mysql
    restart: unless-stopped
    volumes:
      - mispsqldata:/var/lib/mysql
    environment:
      - MYSQL_DATABASE=mispdb
      - MYSQL_USER=mispuser
      - MYSQL_PASSWORD=ChangeMispDbPass!123
      - MYSQL_ROOT_PASSWORD=ChangeMispRootPass!123
    networks:
      - SOC_NET

  ###########################################################################
  # Redis para MISP
  ###########################################################################
  redis:
    image: redis:latest
    container_name: redis
    restart: unless-stopped
    networks:
      - SOC_NET

  ###########################################################################
  # MISP MODULES (enriquecimiento)
  ###########################################################################
  misp-modules:
    image: coolacid/misp-docker:modules-latest
    container_name: misp-modules
    restart: unless-stopped
    environment:
      - REDIS_BACKEND=redis
    depends_on:
      - redis
      - misp_mysql
    networks:
      - SOC_NET

###############################################################################
# Volúmenes nombrados (datos persistentes)
###############################################################################
volumes:
  miniodata:
  cassandradata:
  elasticsearchdata:
  thehivedata:
  mispsqldata:

###############################################################################
# Red Docker para el SOC
###############################################################################
networks:
  SOC_NET:
    driver: bridge
DOCKER_EOF

ok "Docker Compose generado en \${INSTALL_DIR}/"
add_summary "Docker Compose: generado en \${INSTALL_DIR}/"

#============================================================================
# DESPLIEGUE
#============================================================================
status "Descargando imágenes Docker (esto puede tardar varios minutos)..."

cd \${INSTALL_DIR}
docker compose pull 2>&1 | tail -1 || true
ok "Imágenes descargadas"

status "Iniciando servicios..."
docker compose up -d 2>&1 | tail -1
ok "Servicios iniciados"
add_summary "Servicios Docker: iniciados"

status "Esperando a que los servicios se estabilicen (90s)..."
sleep 90

# Verificar servicios
for service in cassandra elasticsearch minio thehive cortex misp redis misp_mysql misp-modules; do
    if docker ps --filter "name=\$service" --filter "status=running" --format "{{.Names}}" | grep -q "\$service"; then
        ok "\$service funcionando"
    else
        warn "\$service puede estar arrancando aún..."
    fi
done

#============================================================================
# TAREA CRON DE MISP - Fetch feeds automáticamente
#============================================================================
status "Configurando tarea programada de MISP (fetch feeds diario)..."

MISP_CRON="0 1 * * * /usr/bin/curl -XPOST --insecure --header \\"Authorization: ${mispApi}\\" --header \\"Accept: application/json\\" --header \\"Content-Type: application/json\\" https://\$SERVER_IP:${config.mispPort}/feeds/fetchFromAllFeeds"

( (crontab -l 2>/dev/null || true) | (grep -v "fetchFromAllFeeds" || true); echo "\$MISP_CRON") | crontab -
ok "Cron job de MISP configurado (diario a las 01:00)"
add_summary "MISP Cron: fetch feeds diario a las 01:00"

#============================================================================
# FIREWALL
#============================================================================
status "Configurando firewall..."

if command -v ufw &>/dev/null; then
    ufw allow ${config.thehivePort}/tcp comment "TheHive" > /dev/null 2>&1
    ufw allow ${config.cortexPort}/tcp comment "Cortex" > /dev/null 2>&1
    ufw allow ${config.mispPort}/tcp comment "MISP HTTPS" > /dev/null 2>&1
    ufw allow 80/tcp comment "MISP HTTP" > /dev/null 2>&1
    ufw allow 9002/tcp comment "MinIO Console" > /dev/null 2>&1
    ufw allow 9042/tcp comment "Cassandra" > /dev/null 2>&1
    ufw allow 9200/tcp comment "Elasticsearch" > /dev/null 2>&1
    ok "Firewall configurado"
    add_summary "Firewall: puertos abiertos (${config.thehivePort}, ${config.cortexPort}, ${config.mispPort}, 80, 9002, 9042, 9200)"
fi

#============================================================================
# VERIFICACIÓN
#============================================================================
status "Verificando servicios..."

sleep 10
SERVICES_OK=true

# Verificar TheHive
THEHIVE_HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${config.thehivePort} 2>/dev/null || echo "000")
if echo "\$THEHIVE_HTTP" | grep -qE "200|302"; then
    ok "TheHive responde correctamente"
else
    warn "TheHive aún arrancando (puede tardar 2-3 minutos más)"
    SERVICES_OK=false
fi

# Verificar Cortex
CORTEX_HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${config.cortexPort} 2>/dev/null || echo "000")
if echo "\$CORTEX_HTTP" | grep -qE "200|302"; then
    ok "Cortex responde correctamente"
else
    warn "Cortex aún arrancando..."
fi

# Verificar MISP
MISP_HTTP=\$(curl -sk -o /dev/null -w "%{http_code}" https://localhost:${config.mispPort} 2>/dev/null || echo "000")
if echo "\$MISP_HTTP" | grep -qE "200|302"; then
    ok "MISP responde correctamente"
else
    warn "MISP aún arrancando..."
fi

add_summary "Verificación de servicios: completada"

#============================================================================
# RESUMEN FINAL
#============================================================================
clear
show_banner

BG_GREEN='\\033[42m'
BG_RED='\\033[41m'
BG_YELLOW='\\033[43m'
BG_CYAN='\\033[46m'
BLACK='\\033[0;30m'
MAGENTA='\\033[0;35m'

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BG_GREEN}\${BLACK}\${BOLD}           ✅ INSTALACIÓN COMPLETADA CON ÉXITO              \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""

echo -e "  \${BOLD}📋 Resumen de pasos realizados:\${NC}"
while IFS= read -r item; do
    echo -e "    \${CYAN}•\${NC} \$item"
done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BG_CYAN}\${BLACK}\${BOLD}  🌐 ACCESO WEB A LOS SERVICIOS                              \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${BOLD}Servicio          URL\${NC}"
echo -e "  \${BOLD}────────────────  ─────────────────────────────────────────────\${NC}"
echo -e "  \${CYAN}TheHive\${NC}           http://\$SERVER_IP:${config.thehivePort}"
echo -e "  \${CYAN}Cortex\${NC}            http://\$SERVER_IP:${config.cortexPort}"
echo -e "  \${CYAN}MISP (HTTPS)\${NC}      https://\$SERVER_IP"
echo -e "  \${CYAN}MISP (HTTP)\${NC}       http://\$SERVER_IP"
echo -e "  \${CYAN}MinIO Console\${NC}     http://\$SERVER_IP:9002"
echo -e "  \${CYAN}Elasticsearch\${NC}     http://\$SERVER_IP:9200"
echo -e "  \${CYAN}Cassandra\${NC}         \$SERVER_IP:9042"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BG_YELLOW}\${BLACK}\${BOLD}  👤 CREDENCIALES DE USUARIO (acceso web)                     \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${BOLD}Servicio       Usuario                 Contraseña\${NC}"
echo -e "  \${BOLD}─────────────  ──────────────────────  ──────────────────────\${NC}"
echo -e "  \${GREEN}TheHive\${NC}        admin@thehive.local     secret"
echo -e "  \${GREEN}Cortex\${NC}         (primer acceso)         (configurar al entrar)"
echo -e "  \${GREEN}MISP\${NC}           admin@admin.test        admin"
echo -e "  \${GREEN}MinIO\${NC}          sistemas127minio        ChangeMinioPass!123"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BG_RED}\${WHITE}\${BOLD}  🗄️  CREDENCIALES DE BASE DE DATOS                            \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${BOLD}Servicio        Variable                 Valor\${NC}"
echo -e "  \${BOLD}──────────────  ───────────────────────  ──────────────────────\${NC}"
echo -e "  \${RED}MISP MySQL\${NC}      MYSQL_DATABASE           mispdb"
echo -e "  \${RED}MISP MySQL\${NC}      MYSQL_USER               mispuser"
echo -e "  \${RED}MISP MySQL\${NC}      MYSQL_PASSWORD           ChangeMispDbPass!123"
echo -e "  \${RED}MISP MySQL\${NC}      MYSQL_ROOT_PASSWORD      ChangeMispRootPass!123"
echo -e "  \${RED}Cassandra\${NC}       CASSANDRA_CLUSTER_NAME   TheHive"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BG_BLUE}\${WHITE}\${BOLD}  🔑 CREDENCIALES DE SERVICIOS INTERNOS                       \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${BOLD}Servicio          Tipo                     Valor\${NC}"
echo -e "  \${BOLD}────────────────  ───────────────────────  ──────────────────────────────────\${NC}"
echo -e "  \${BLUE}MinIO (S3)\${NC}        MINIO_ROOT_USER          sistemas127minio"
echo -e "  \${BLUE}MinIO (S3)\${NC}        MINIO_ROOT_PASSWORD      ChangeMinioPass!123"
echo -e "  \${BLUE}TheHive\${NC}           Secret Key (MD5)         ${thehiveSecret}"
echo -e "  \${BLUE}Cortex\${NC}            Secret Key (MD5)         ${cortexSecret}"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${MAGENTA}\${BOLD}  🔐 API KEYS (GUÁRDALAS EN LUGAR SEGURO)                     \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "    \${CYAN}TheHive API Key:\${NC}    ${thehiveApi}"
echo -e "    \${CYAN}Cortex API Key:\${NC}     ${cortexApi}"
echo -e "    \${CYAN}MISP API Key:\${NC}       ${mispApi}"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BOLD}  🐳 COMANDOS DOCKER (acceso por consola)                       \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${BOLD}Acción                Comando\${NC}"
echo -e "  \${BOLD}────────────────────  ─────────────────────────────────────────────\${NC}"
echo -e "  \${YELLOW}Iniciar stack\${NC}         cd \${INSTALL_DIR} && docker compose up -d"
echo -e "  \${YELLOW}Parar stack\${NC}           cd \${INSTALL_DIR} && docker compose down"
echo -e "  \${YELLOW}Ver logs (todos)\${NC}      cd \${INSTALL_DIR} && docker compose logs -f"
echo -e "  \${YELLOW}Ver estado\${NC}            cd \${INSTALL_DIR} && docker compose ps"
echo -e "  \${YELLOW}Shell TheHive\${NC}         docker exec -it thehive /bin/bash"
echo -e "  \${YELLOW}Shell Cortex\${NC}          docker exec -it cortex /bin/bash"
echo -e "  \${YELLOW}Shell MISP\${NC}            docker exec -it misp /bin/bash"
echo -e "  \${YELLOW}Shell Cassandra\${NC}       docker exec -it cassandra /bin/bash"
echo -e "  \${YELLOW}Shell Elasticsearch\${NC}   docker exec -it elasticsearch /bin/bash"
echo -e "  \${YELLOW}Shell MinIO\${NC}           docker exec -it minio /bin/bash"
echo -e "  \${YELLOW}Shell MySQL\${NC}           docker exec -it misp_mysql /bin/bash"
echo -e "  \${YELLOW}Shell Redis\${NC}           docker exec -it redis /bin/bash"
echo -e "  \${YELLOW}Logs TheHive\${NC}          docker logs -f thehive"
echo -e "  \${YELLOW}Logs Cortex\${NC}           docker logs -f cortex"
echo -e "  \${YELLOW}Logs MISP\${NC}             docker logs -f misp"
echo -e "  \${YELLOW}Reiniciar servicio\${NC}    docker restart <nombre_contenedor>"
echo ""

echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo -e "  \${BOLD}  📁 UBICACIONES                                                \${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "    \${CYAN}Docker Compose:\${NC}     \${INSTALL_DIR}/docker-compose.yml"
echo -e "    \${CYAN}Cortex Config:\${NC}      \${INSTALL_DIR}/cortex/application.conf"
echo -e "    \${CYAN}MISP Configs:\${NC}       \${INSTALL_DIR}/server-configs/"
echo -e "    \${CYAN}MISP Logs:\${NC}          \${INSTALL_DIR}/logs/"
echo -e "    \${CYAN}MISP Files:\${NC}         \${INSTALL_DIR}/files/"
echo -e "    \${CYAN}SSL Certs:\${NC}          \${INSTALL_DIR}/ssl/"
echo -e "    \${CYAN}Cortex Jobs:\${NC}        /tmp/cortex-jobs"
echo -e "    \${CYAN}tmpfiles.d:\${NC}         /etc/tmpfiles.d/cortex.conf"
echo ""

echo -e "  \${BOLD}⏰ Tareas programadas:\${NC}"
echo -e "    \${CYAN}MISP Feeds:\${NC}  Diario a las 01:00 (crontab)"
echo ""

echo -e "  \${BOLD}\${YELLOW}⚠ IMPORTANTE:\${NC}"
echo -e "  Las credenciales de MISP (admin@admin.test / admin) y TheHive"
echo -e "  (admin@thehive.local / secret) son las de primer acceso."
echo -e "  \${RED}\${BOLD}Cámbialas inmediatamente tras el primer login.\${NC}"
echo ""

echo -e "  \${BG_BLUE}\${WHITE}\${BOLD}                  By Sistemas 127                      \${NC}"
echo ""
`;
}

export function generateWazuhScript(config: WazuhConfig): string {
  const distroCommands = getDistroCommands(config.distro);

  return `#!/bin/bash
#============================================================================
# SOC Automation - Wazuh SIEM Installer
# Compatible: ${config.distro}
# Wazuh Version: ${config.wazuhVersion}
#============================================================================

set -euo pipefail

# Colors
BLUE='\\033[0;34m'
CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'
BOLD='\\033[1m'
BG_BLUE='\\033[44m'
WHITE='\\033[1;37m'

# Funciones de salida
clear
show_banner() {
    echo ""
    echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}              SOC Automation Script Generator                  \${NC}"
    echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
    echo ""
}

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

show_banner

#============================================================================
# DETECTAR RECURSOS DEL SISTEMA
#============================================================================
status "Analizando recursos del sistema..."

TOTAL_RAM_MB=\$(free -m | awk '/^Mem:/{print \$2}')
TOTAL_RAM_GB=\$((TOTAL_RAM_MB / 1024))
CPU_CORES=\$(nproc)
DISK_AVAIL=\$(df -BG / | awk 'NR==2{print \$4}' | tr -d 'G')

ok "RAM: \${TOTAL_RAM_GB}GB | CPU: \${CPU_CORES} cores | Disco: \${DISK_AVAIL}GB"
add_summary "Sistema: \${TOTAL_RAM_GB}GB RAM, \${CPU_CORES} CPU cores, \${DISK_AVAIL}GB disco"

# Validaciones
[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root (usa sudo)"

if [ "\$TOTAL_RAM_GB" -lt 2 ]; then
    warn "RAM insuficiente (\${TOTAL_RAM_GB}GB). Mínimo recomendado: 4GB"
    read -p "  ¿Continuar? (s/n): " -r
    [[ ! \$REPLY =~ ^[Ss]\$ ]] && exit 1
fi

if [ "\$DISK_AVAIL" -lt 15 ]; then
    warn "Espacio en disco bajo (\${DISK_AVAIL}GB). Mínimo recomendado: 30GB"
    read -p "  ¿Continuar? (s/n): " -r
    [[ ! \$REPLY =~ ^[Ss]\$ ]] && exit 1
fi

#============================================================================
# IP DEL SERVIDOR
#============================================================================
SERVER_IP="${config.serverIp}"
if [ "\$SERVER_IP" = "auto" ]; then
    SERVER_IP=\$(hostname -I | awk '{print \$1}')
fi
ok "IP del servidor: \$SERVER_IP"
add_summary "IP del servidor: \$SERVER_IP"

#============================================================================
# INSTALAR DEPENDENCIAS
#============================================================================
status "Instalando dependencias para ${config.distro}..."

${distroCommands.update}
${distroCommands.install}
ok "Dependencias instaladas"
add_summary "Dependencias: instaladas"

#============================================================================
# INSTALAR WAZUH
#============================================================================
status "Descargando instalador de Wazuh ${config.wazuhVersion}..."

curl -sO https://packages.wazuh.com/${config.wazuhVersion}/wazuh-install.sh
curl -sO https://packages.wazuh.com/${config.wazuhVersion}/config.yml

cat > config.yml << CONFIGEOF
nodes:
  indexer:
    - name: node-1
      ip: "\$SERVER_IP"
  server:
    - name: wazuh-1
      ip: "\$SERVER_IP"
  dashboard:
    - name: dashboard
      ip: "\$SERVER_IP"
CONFIGEOF

ok "Configuración generada con IP: \$SERVER_IP"
add_summary "Configuración Wazuh: IP \$SERVER_IP"

status "Generando certificados..."
bash wazuh-install.sh --generate-config-files
ok "Certificados generados"

status "Instalando Wazuh Indexer..."
bash wazuh-install.sh --wazuh-indexer node-1
ok "Wazuh Indexer instalado"
add_summary "Wazuh Indexer: instalado"

status "Iniciando cluster..."
bash wazuh-install.sh --start-cluster
ok "Cluster iniciado"

status "Instalando Wazuh Server..."
bash wazuh-install.sh --wazuh-server wazuh-1
ok "Wazuh Server instalado"
add_summary "Wazuh Server: instalado"

status "Instalando Wazuh Dashboard..."
bash wazuh-install.sh --wazuh-dashboard dashboard
ok "Wazuh Dashboard instalado"
add_summary "Wazuh Dashboard: instalado"

# Asegurar que el dashboard escucha en todas las interfaces para acceso LAN
if [ -f /etc/wazuh-dashboard/opensearch_dashboards.yml ]; then
    sed -i 's/^server.host:.*/server.host: "0.0.0.0"/' /etc/wazuh-dashboard/opensearch_dashboards.yml
    systemctl restart wazuh-dashboard 2>/dev/null || true
    ok "Dashboard configurado para acceso LAN (0.0.0.0)"
    add_summary "Dashboard: configurado en 0.0.0.0 para acceso LAN"
fi

#============================================================================
# CHANGE PASSWORD
#============================================================================
if [ "${config.adminPassword}" != "admin" ]; then
    status "Cambiando contraseña del administrador..."
    bash wazuh-install.sh --change-passwords -au admin -ap "${config.adminPassword}" 2>/dev/null || warn "Contraseña puede requerir cambio manual"
    ok "Contraseña actualizada"
    add_summary "Contraseña admin: cambiada"
fi

#============================================================================
# FIREWALL
#============================================================================
status "Configurando firewall..."

${distroCommands.firewall}

ok "Firewall configurado"
add_summary "Firewall: configurado"

#============================================================================
# RESUMEN FINAL
#============================================================================
WAZUH_PASS_FILE="/root/wazuh-install-files/wazuh-passwords.txt"

clear
show_banner

echo -e "  \${BOLD}══════════════════════════════════════════════\${NC}"
echo -e "  \${GREEN}\${BOLD}  INSTALACIÓN COMPLETADA CON ÉXITO\${NC}"
echo -e "  \${BOLD}══════════════════════════════════════════════\${NC}"
echo ""

echo -e "  \${BOLD}📋 Resumen de pasos realizados:\${NC}"
while IFS= read -r item; do
    echo -e "    \${CYAN}•\${NC} \$item"
done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""

echo -e "  \${BOLD}🌐 URLs de Acceso (desde cualquier equipo de la red):\${NC}"
echo -e "    \${CYAN}Dashboard:\${NC}  https://\$SERVER_IP:${config.dashboardPort}"
echo -e "    \${CYAN}API:\${NC}        https://\$SERVER_IP:${config.apiPort}"
echo ""

echo -e "  \${BOLD}🔑 Credenciales:\${NC}"
echo -e "    \${CYAN}Usuario:\${NC}    admin"
echo -e "    \${CYAN}Contraseña:\${NC} ${config.adminPassword}"
echo ""

if [ -f "\$WAZUH_PASS_FILE" ]; then
    echo -e "  \${BOLD}📄 Archivo de contraseñas:\${NC} \$WAZUH_PASS_FILE"
    echo ""
fi

echo -e "  \${BOLD}⚙ Comandos de gestión:\${NC}"
echo -e "    Estado:     systemctl status wazuh-manager"
echo -e "    Reiniciar:  systemctl restart wazuh-manager"
echo -e "    Logs:       tail -f /var/ossec/logs/ossec.log"
echo ""

echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
echo ""
`;
}

function getDistroCommands(distro: string) {
  switch (distro) {
    case 'Ubuntu 24.04':
    case 'Debian':
      return {
        update: 'apt-get update -qq',
        install: 'apt-get install -y -qq curl apt-transport-https gnupg2 lsb-release software-properties-common > /dev/null 2>&1',
        firewall: `if command -v ufw &>/dev/null; then
    ufw allow 1514/tcp comment "Wazuh Agent" > /dev/null 2>&1
    ufw allow 1515/tcp comment "Wazuh Registration" > /dev/null 2>&1
    ufw allow ${distro === 'Ubuntu 24.04' ? '55000' : '55000'}/tcp comment "Wazuh API" > /dev/null 2>&1
    ufw allow 443/tcp comment "Wazuh Dashboard" > /dev/null 2>&1
    ufw allow 9200/tcp comment "Wazuh Indexer" > /dev/null 2>&1
fi`,
      };
    case 'AlmaLinux':
    case 'CentOS 8':
    case 'Oracle Linux 9':
      return {
        update: 'dnf update -y -q',
        install: 'dnf install -y -q curl tar gnupg2 > /dev/null 2>&1',
        firewall: `if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-port=1514/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=1515/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=55000/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=443/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=9200/tcp > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1
fi`,
      };
    case 'Arch Linux':
      return {
        update: 'pacman -Syu --noconfirm',
        install: 'pacman -S --noconfirm curl gnupg > /dev/null 2>&1',
        firewall: `if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-port=1514/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=1515/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=55000/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=443/tcp > /dev/null 2>&1
    firewall-cmd --permanent --add-port=9200/tcp > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1
fi`,
      };
    default:
      return {
        update: 'apt-get update -qq',
        install: 'apt-get install -y -qq curl apt-transport-https gnupg2 > /dev/null 2>&1',
        firewall: 'echo "Configura el firewall manualmente"',
      };
  }
}

function generateRandomKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export { generateRandomKey };

// ============================================================================
// SOCFORTRESS WAZUH RULES - Community Detection Rules from GitHub
// https://github.com/socfortress/Wazuh-Rules
// ============================================================================

export interface SOCFortressRule {
  id: string;
  folder: string;
  label: string;
  desc: string;
  category: string;
}

// Keep backward compat alias
export type WazuhRulesConfig = {
  selectedRules: string[];
};

export const SOCFORTRESS_RULES: SOCFortressRule[] = [
  // --- Endpoints Windows ---
  { id: "windows_sysmon", folder: "Windows_Sysmon", label: "Sysmon Windows", desc: "Reglas de detección basadas en eventos Sysmon para Windows (EventID 1-26)", category: "Windows" },
  { id: "sysmon_new_events", folder: "Sysmon New Events", label: "Sysmon Nuevos Eventos", desc: "Eventos adicionales de Sysmon (DNS queries, clipboard, etc.)", category: "Windows" },
  { id: "windows_powershell", folder: "Windows Powershell", label: "PowerShell", desc: "Detección de comandos PowerShell maliciosos, ofuscación y ejecución sospechosa", category: "Windows" },
  { id: "windows_sigma", folder: "Windows Sigma Rules", label: "Sigma Rules Windows", desc: "Reglas Sigma convertidas para Wazuh - amplia cobertura de amenazas conocidas", category: "Windows" },
  { id: "windows_autoruns", folder: "Windows Autoruns", label: "Autoruns", desc: "Detección de persistencia mediante entradas de arranque automático", category: "Windows" },
  { id: "windows_sigcheck", folder: "Windows Sysinternals Sigcheck", label: "Sigcheck", desc: "Verificación de firmas digitales de ejecutables con Sysinternals", category: "Windows" },
  { id: "windows_logon", folder: "Windows Logon Sessions", label: "Sesiones de Inicio", desc: "Monitorización de sesiones de inicio de sesión en Windows", category: "Windows" },
  { id: "windows_chainsaw", folder: "Windows Chainsaw", label: "Chainsaw", desc: "Análisis forense de logs Windows con Chainsaw (detección SIGMA/EVTX)", category: "Windows" },

  // --- Endpoints Linux ---
  { id: "sysmon_linux", folder: "Sysmon Linux", label: "Sysmon Linux", desc: "Reglas Sysmon para sistemas Linux (procesos, red, ficheros)", category: "Linux" },
  { id: "auditd", folder: "Auditd", label: "Auditd", desc: "Reglas de auditoría del kernel Linux (syscalls, accesos a ficheros)", category: "Linux" },
  { id: "falco", folder: "Falco", label: "Falco", desc: "Detección de amenazas en contenedores y Kubernetes", category: "Linux" },
  { id: "tetragon", folder: "Tetragon", label: "Tetragon", desc: "Observabilidad a nivel de kernel con eBPF (Cilium Tetragon)", category: "Linux" },

  // --- Red / IDS ---
  { id: "suricata", folder: "Suricata", label: "Suricata", desc: "Alertas del IDS/IPS de red Suricata integradas en Wazuh", category: "Red" },
  { id: "packetbeat", folder: "Packetbeat", label: "Packetbeat", desc: "Monitorización de tráfico de red con Packetbeat", category: "Red" },
  { id: "modsecurity", folder: "Modsecurity", label: "ModSecurity", desc: "Reglas WAF - detección de ataques web (SQLi, XSS, LFI)", category: "Red" },
  { id: "opnsense", folder: "OpnSense", label: "OPNSense", desc: "Reglas para firewall OPNSense (logs de filtrado y IDS)", category: "Red" },

  // --- Cloud & SaaS ---
  { id: "aws", folder: "AWS", label: "AWS CloudWatch", desc: "Detección de amenazas en Amazon Web Services (CloudTrail, GuardDuty)", category: "Cloud" },
  { id: "office365", folder: "Office 365", label: "Office 365", desc: "Detección en Microsoft 365 (inicios sospechosos, reglas buzón, DLP)", category: "Cloud" },
  { id: "office_defender", folder: "Office Defender", label: "Microsoft Defender", desc: "Alertas de Microsoft Defender for Endpoint integradas", category: "Cloud" },
  { id: "duo", folder: "Duo", label: "Duo MFA", desc: "Eventos de autenticación multifactor Cisco Duo", category: "Cloud" },
  { id: "mimecast", folder: "Mimecast", label: "Mimecast", desc: "Seguridad de email empresarial - detección de phishing y malware", category: "Cloud" },

  // --- Inteligencia de Amenazas ---
  { id: "misp", folder: "MISP", label: "MISP", desc: "Integración con plataforma de inteligencia de amenazas MISP", category: "Inteligencia" },
  { id: "opencti", folder: "OpenCTI", label: "OpenCTI", desc: "Integración con plataforma de Cyber Threat Intelligence OpenCTI", category: "Inteligencia" },
  { id: "abuseipdb", folder: "AbuseIPDB", label: "AbuseIPDB", desc: "Verificación de reputación de IPs contra la base de datos AbuseIPDB", category: "Inteligencia" },
  { id: "dnstwist", folder: "DNStwist", label: "DNStwist", desc: "Detección de dominios typosquatting y phishing", category: "Inteligencia" },
  { id: "domain_stats", folder: "Domain Stats", label: "Domain Stats", desc: "Análisis estadístico de dominios y correlación con AlienVault OTX", category: "Inteligencia" },
  { id: "maltrail", folder: "Maltrail", label: "Maltrail", desc: "Detección de tráfico malicioso basada en listas de IOCs", category: "Inteligencia" },

  // --- Antivirus / EDR ---
  { id: "sophos", folder: "Sophos", label: "Sophos", desc: "Alertas de Sophos Endpoint Protection integradas en Wazuh", category: "EDR" },
  { id: "fsecure", folder: "F-Secure", label: "F-Secure", desc: "Alertas de F-Secure / WithSecure Endpoint", category: "EDR" },
  { id: "crowdstrike", folder: "Crowdstrike", label: "CrowdStrike", desc: "Detecciones de CrowdStrike Falcon integradas", category: "EDR" },
  { id: "cisco_amp", folder: "Cisco Secure Endpoint", label: "Cisco Secure Endpoint", desc: "Alertas de Cisco AMP / Secure Endpoint", category: "EDR" },
  { id: "trend_micro", folder: "Trend Micro", label: "Trend Micro", desc: "Alertas de Trend Micro integradas en Wazuh", category: "EDR" },

  // --- Herramientas de Seguridad ---
  { id: "osquery", folder: "Osquery", label: "Osquery", desc: "Consultas del sistema en tiempo real - detección de anomalías", category: "Herramientas" },
  { id: "yara", folder: "Yara", label: "YARA", desc: "Detección de malware mediante firmas YARA", category: "Herramientas" },
  { id: "nmap", folder: "Nmap", label: "Nmap", desc: "Integración de escaneos Nmap con alertas Wazuh", category: "Herramientas" },
  { id: "snyk", folder: "Snyk", label: "Snyk", desc: "Detección de vulnerabilidades en dependencias de código", category: "Herramientas" },
  { id: "pentest_tools", folder: "Pentest-Tools", label: "Pentest Tools", desc: "Detección de herramientas de pentesting (Metasploit, Cobalt Strike, etc.)", category: "Herramientas" },
  { id: "sublime", folder: "Sublime", label: "Sublime (Anti-Phishing)", desc: "Detección de emails de phishing con Sublime Security", category: "Herramientas" },
  { id: "beelzebub", folder: "Beelzebub", label: "Beelzebub Honeypot", desc: "Alertas del honeypot Beelzebub (SSH, HTTP)", category: "Herramientas" },

  // --- Gestión y Compliance ---
  { id: "active_response", folder: "Active_Response", label: "Active Response", desc: "Reglas de respuesta activa avanzadas de SOCFortress", category: "Gestión" },
  { id: "ad_inventory", folder: "AD_Inventory", label: "Inventario AD", desc: "Inventario de objetos de Active Directory (usuarios, grupos, GPOs)", category: "Gestión" },
  { id: "pingcastle", folder: "Pingcastle", label: "PingCastle", desc: "Auditoría de seguridad de Active Directory con PingCastle", category: "Gestión" },
  { id: "sca", folder: "SCA", label: "SCA (Config Assessment)", desc: "Reglas de evaluación de configuración de seguridad", category: "Gestión" },
  { id: "software", folder: "Software", label: "Software Inventory", desc: "Inventario y detección de software no autorizado", category: "Gestión" },
  { id: "wazuh_inventory", folder: "Wazuh Inventory", label: "Wazuh Inventory", desc: "Inventario de agentes y estado del clúster Wazuh", category: "Gestión" },
  { id: "healthcheck", folder: "Healthcheck", label: "Healthcheck", desc: "Monitorización de salud del manager y agentes Wazuh", category: "Gestión" },
  { id: "exclusion_rules", folder: "Exclusion Rules", label: "Exclusión de Reglas", desc: "Reglas de exclusión para reducir falsos positivos comunes", category: "Gestión" },
  { id: "manager", folder: "Manager", label: "Manager Logs", desc: "Decodificadores y reglas para logs internos del Wazuh Manager", category: "Gestión" },

  // --- Integraciones SOC ---
  { id: "dfir_iris", folder: "DFIR-IRIS", label: "DFIR-IRIS", desc: "Integración con plataforma de respuesta a incidentes DFIR-IRIS", category: "SOC" },
  { id: "socfortress", folder: "SOCFortress", label: "SOCFortress", desc: "Reglas adicionales de detección creadas por SOCFortress", category: "SOC" },
  { id: "socfortress_api", folder: "SOCFortress API", label: "SOCFortress API", desc: "Integración con la API de enriquecimiento SOCFortress", category: "SOC" },
  { id: "sap", folder: "SAP", label: "SAP", desc: "Reglas de detección para sistemas SAP ERP", category: "SOC" },
];

export const SOCFORTRESS_CATEGORIES = [
  { id: "Windows", label: "🖥️ Windows", desc: "Sysmon, PowerShell, Sigma, Chainsaw" },
  { id: "Linux", label: "🐧 Linux", desc: "Sysmon Linux, Auditd, Falco, Tetragon" },
  { id: "Red", label: "🌐 Red / IDS", desc: "Suricata, Packetbeat, ModSecurity, OPNSense" },
  { id: "Cloud", label: "☁️ Cloud & SaaS", desc: "AWS, Office 365, Defender, Duo, Mimecast" },
  { id: "Inteligencia", label: "🔍 Inteligencia", desc: "MISP, OpenCTI, AbuseIPDB, DNStwist" },
  { id: "EDR", label: "🛡️ Antivirus / EDR", desc: "Sophos, CrowdStrike, Cisco, Trend Micro" },
  { id: "Herramientas", label: "🔧 Herramientas", desc: "Osquery, YARA, Nmap, Snyk, Pentest" },
  { id: "Gestión", label: "📋 Gestión", desc: "AD Inventory, SCA, Healthcheck, Exclusiones" },
  { id: "SOC", label: "🏢 Integraciones SOC", desc: "DFIR-IRIS, SOCFortress, SAP" },
];

export function generateSOCFortressRulesScript(selectedRuleIds: string[]): string {
  const selectedRules = SOCFORTRESS_RULES.filter(r => selectedRuleIds.includes(r.id));
  const folderList = selectedRules.map(r => `"${r.folder}"`).join(' ');
  const folderLabels = selectedRules.map(r => `  - ${r.label} (${r.folder})`).join('\\n');

  // Known decoder files that need to be moved
  const decoderFiles = [
    "decoder-linux-sysmon.xml",
    "yara_decoders.xml",
    "auditd_decoders.xml",
    "naxsi-opnsense_decoders.xml",
    "maltrail_decoders.xml",
    "decoder-manager-logs.xml",
  ];

  return `#!/bin/bash
#============================================================================
# SOCFortress Wazuh Rules - Instalador Selectivo
# Fuente: https://github.com/socfortress/Wazuh-Rules
# Reglas seleccionadas: ${selectedRules.length} de ${SOCFORTRESS_RULES.length}
# Generado por SOC Automation - By Sistemas 127
#============================================================================

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}     SOCFortress Wazuh Rules - Instalador Selectivo            \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok()     { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn()   { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail()   { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

# Verificar git
if ! command -v git &>/dev/null; then
    status "Instalando git..."
    if command -v apt-get &>/dev/null; then
        apt-get update -qq && apt-get install -y -qq git > /dev/null 2>&1
    elif command -v yum &>/dev/null; then
        yum install -y git > /dev/null 2>&1
    elif command -v zypper &>/dev/null; then
        zypper install -y git > /dev/null 2>&1
    else
        fail "No se pudo instalar git. Instálalo manualmente."
    fi
fi
ok "Git disponible"

# Verificar Wazuh
OSSEC_DIR="/var/ossec"
[ ! -d "\$OSSEC_DIR" ] && fail "Wazuh no está instalado en \$OSSEC_DIR"
ok "Wazuh detectado en \$OSSEC_DIR"

RULES_DIR="\$OSSEC_DIR/etc/rules"
DECODERS_DIR="\$OSSEC_DIR/etc/decoders"
REPO_DIR="/tmp/Wazuh-Rules"
BACKUP_DIR="/tmp/wazuh_rules_backup_\$(date +%Y%m%d_%H%M%S)"

# Detectar usuario wazuh/ossec
WAZUH_USER="wazuh"
if ! id "\$WAZUH_USER" >/dev/null 2>&1; then
    WAZUH_USER="ossec"
    if ! id "\$WAZUH_USER" >/dev/null 2>&1; then
        WAZUH_USER="root"
    fi
fi
ok "Usuario de servicio: \$WAZUH_USER"

echo ""
echo -e "\${CYAN}Reglas seleccionadas para instalar:\${NC}"
echo -e "${folderLabels}"
echo ""

# Backup
status "Creando backup de reglas actuales..."
mkdir -p "\$BACKUP_DIR"
cp -r "\$RULES_DIR"/* "\$BACKUP_DIR"/ 2>/dev/null || true
ok "Backup creado en \$BACKUP_DIR"

# Clonar repositorio
status "Clonando repositorio SOCFortress Wazuh-Rules..."
rm -rf "\$REPO_DIR"
if ! git clone --depth 1 https://github.com/socfortress/Wazuh-Rules.git "\$REPO_DIR" 2>/dev/null; then
    fail "Error al clonar el repositorio. Verifica la conexión a Internet."
fi
ok "Repositorio clonado correctamente"

# Carpetas seleccionadas
SELECTED_FOLDERS=(${folderList})
RULES_INSTALLED=0
DECODERS_INSTALLED=0

for FOLDER in "\${SELECTED_FOLDERS[@]}"; do
    FOLDER_PATH="\$REPO_DIR/\$FOLDER"
    if [ ! -d "\$FOLDER_PATH" ]; then
        warn "Carpeta no encontrada: \$FOLDER (puede haber cambiado de nombre)"
        continue
    fi

    status "Procesando: \$FOLDER"

    # Copiar ficheros XML de reglas
    for XML_FILE in "\$FOLDER_PATH"/*.xml; do
        [ ! -f "\$XML_FILE" ] && continue
        BASENAME=\$(basename "\$XML_FILE")

        # Detectar si es un decoder (contiene "decoder" en el nombre)
        if echo "\$BASENAME" | grep -qi "decoder"; then
            cp "\$XML_FILE" "\$DECODERS_DIR/"
            chown "\$WAZUH_USER":"\$WAZUH_USER" "\$DECODERS_DIR/\$BASENAME" 2>/dev/null || true
            chmod 660 "\$DECODERS_DIR/\$BASENAME" 2>/dev/null || true
            DECODERS_INSTALLED=\$((DECODERS_INSTALLED + 1))
            ok "  Decoder: \$BASENAME -> decoders/"
        else
            cp "\$XML_FILE" "\$RULES_DIR/"
            chown "\$WAZUH_USER":"\$WAZUH_USER" "\$RULES_DIR/\$BASENAME" 2>/dev/null || true
            chmod 660 "\$RULES_DIR/\$BASENAME" 2>/dev/null || true
            RULES_INSTALLED=\$((RULES_INSTALLED + 1))
            ok "  Regla: \$BASENAME -> rules/"
        fi
    done

    # Copiar scripts Python de integración si existen
    for PY_FILE in "\$FOLDER_PATH"/*.py; do
        [ ! -f "\$PY_FILE" ] && continue
        BASENAME=\$(basename "\$PY_FILE")
        cp "\$PY_FILE" "\$OSSEC_DIR/integrations/" 2>/dev/null || true
        chmod 750 "\$OSSEC_DIR/integrations/\$BASENAME" 2>/dev/null || true
        chown root:"\$WAZUH_USER" "\$OSSEC_DIR/integrations/\$BASENAME" 2>/dev/null || true
        ok "  Script integración: \$BASENAME -> integrations/"
    done

    # Copiar scripts PowerShell/Bash de wodles si existen
    for SCRIPT_FILE in "\$FOLDER_PATH"/*.ps1 "\$FOLDER_PATH"/*.sh; do
        [ ! -f "\$SCRIPT_FILE" ] && continue
        BASENAME=\$(basename "\$SCRIPT_FILE")
        mkdir -p "\$OSSEC_DIR/wodles/socfortress"
        cp "\$SCRIPT_FILE" "\$OSSEC_DIR/wodles/socfortress/" 2>/dev/null || true
        chmod 750 "\$OSSEC_DIR/wodles/socfortress/\$BASENAME" 2>/dev/null || true
        ok "  Script wodle: \$BASENAME -> wodles/socfortress/"
    done
done

# Mover decoders conocidos que puedan haber acabado en rules/
KNOWN_DECODERS=(${decoderFiles.map(d => `"${d}"`).join(' ')})
for DECODER in "\${KNOWN_DECODERS[@]}"; do
    if [ -f "\$RULES_DIR/\$DECODER" ]; then
        mv "\$RULES_DIR/\$DECODER" "\$DECODERS_DIR/"
        ok "Decoder movido: \$DECODER -> decoders/"
    fi
done

echo ""
status "Reiniciando Wazuh Manager..."

# Validar configuración antes de reiniciar
if [ -x "\$OSSEC_DIR/bin/wazuh-analysisd" ]; then
    VALIDATION=\$("\$OSSEC_DIR/bin/wazuh-analysisd" -t 2>&1) || true
    if echo "\$VALIDATION" | grep -qi "error"; then
        warn "Se detectaron errores en la validación de reglas."
        warn "Revisa los logs en /var/ossec/logs/ossec.log"
        echo ""
        echo -e "\${YELLOW}¿Deseas restaurar el backup? (s/n)\${NC}"
        read -r RESTORE
        if [ "\$RESTORE" = "s" ] || [ "\$RESTORE" = "S" ]; then
            cp -r "\$BACKUP_DIR"/* "\$RULES_DIR"/
            chown "\$WAZUH_USER":"\$WAZUH_USER" "\$RULES_DIR"/* 2>/dev/null || true
            chmod 660 "\$RULES_DIR"/* 2>/dev/null || true
            ok "Backup restaurado"
        fi
    fi
fi

# Reiniciar servicio
if systemctl --version &>/dev/null; then
    systemctl restart wazuh-manager 2>/dev/null
elif service --version &>/dev/null 2>&1; then
    service wazuh-manager restart 2>/dev/null
fi

sleep 5

# Verificar salud
if systemctl is-active --quiet wazuh-manager 2>/dev/null; then
    ok "Wazuh Manager reiniciado correctamente"
else
    warn "Wazuh Manager puede no haberse reiniciado correctamente"
    warn "Revisa: systemctl status wazuh-manager"
    warn "Logs: /var/ossec/logs/ossec.log"
fi

# Limpiar
rm -rf "\$REPO_DIR"

echo ""
echo -e "\${BG_BLUE}\${WHITE}══════════════════════════════════════════════════════════════\${NC}"
echo -e "\${BG_BLUE}\${WHITE}                    INSTALACIÓN COMPLETADA                    \${NC}"
echo -e "\${BG_BLUE}\${WHITE}══════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "  \${GREEN}Reglas XML instaladas:\${NC}     \$RULES_INSTALLED"
echo -e "  \${GREEN}Decoders instalados:\${NC}       \$DECODERS_INSTALLED"
echo -e "  \${GREEN}Backup:\${NC}                    \$BACKUP_DIR"
echo ""
echo -e "  \${CYAN}Fuente:\${NC} https://github.com/socfortress/Wazuh-Rules"
echo -e "  \${CYAN}Generado por:\${NC} SOC Automation - Sistemas 127"
echo ""
echo -e "  \${YELLOW}NOTA:\${NC} Revisa /var/ossec/logs/ossec.log si ves errores."
echo -e "  \${YELLOW}NOTA:\${NC} Cada carpeta del repositorio incluye un README.md"
echo -e "  \${YELLOW}      con instrucciones específicas de configuración.\${NC}"
echo ""
`;
}

// Keep backward compat - old function name redirects to new
export function generateWazuhRulesScript(config: WazuhRulesConfig): string {
  return generateSOCFortressRulesScript(config.selectedRules || []);
}

// ============================================================================
// WAZUH ACTIVE RESPONSE - Auto-deploy rules + scripts for Windows/Linux
// ============================================================================
export interface WazuhActiveResponseConfig {
  // Windows
  enableBlockIP: boolean;
  enableDisableUser: boolean;
  enableIsolateHost: boolean;
  enableKillProcess: boolean;
  enableCollectForensics: boolean;
  // Linux
  enableLinuxBlockIP: boolean;
  enableLinuxDisableUser: boolean;
  enableLinuxIsolateHost: boolean;
  enableLinuxKillProcess: boolean;
  enableLinuxCollectForensics: boolean;
  // Auto-deploy
  enableAutoDeployWindows: boolean;
  enableAutoDeployLinux: boolean;
  wazuhServerIp: string;
  wazuhApiUser: string;
  wazuhApiPassword: string;
}

export function generateWazuhActiveResponseScript(config: WazuhActiveResponseConfig): string {
  const windowsARScripts = getWindowsARScripts(config);
  const linuxARScripts = getLinuxARScripts(config);
  const activeResponseRules = getActiveResponseRules(config);
  const ossecConfAR = getOssecConfActiveResponse(config);
  const autoDeploySection = getAutoDeploySection(config);

  return `#!/bin/bash
#============================================================================
# SOC Automation - Wazuh Active Response Deployer
# Windows (Desktop/Server) + Linux - Auto-deploy a agentes
# By Sistemas 127
#============================================================================

set -euo pipefail

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo -e "\${BG_BLUE}\${WHITE}     Wazuh Active Response - Instalador y Despliegue           \${NC}"
echo -e "\${BG_BLUE}\${WHITE}                                                              \${NC}"
echo ""

status() { echo -e "  \${CYAN}➜\${NC} \$1"; }
ok() { echo -e "  \${GREEN}✓\${NC} \$1"; }
warn() { echo -e "  \${YELLOW}!\${NC} \$1"; }
fail() { echo -e "  \${RED}✗\${NC} \$1"; exit 1; }

SUMMARY_FILE="\$(mktemp)"
add_summary() { echo "\$1" >> "\$SUMMARY_FILE"; }

[ "\$(id -u)" -ne 0 ] && fail "Este script debe ejecutarse como root"

OSSEC_DIR="/var/ossec"
if [ ! -d "\$OSSEC_DIR" ]; then
    fail "Wazuh no esta instalado. Instala Wazuh primero."
fi

OSSEC_CONF="\$OSSEC_DIR/etc/ossec.conf"
AR_DIR="\$OSSEC_DIR/active-response/bin"
RULES_FILE="\$OSSEC_DIR/etc/rules/active_response_rules.xml"
SHARED_DIR="\$OSSEC_DIR/etc/shared/default"
WODLE_DIR="\$OSSEC_DIR/wodles"

status "Creando directorios necesarios..."
mkdir -p "\$AR_DIR" "\$SHARED_DIR" "\$WODLE_DIR"
ok "Directorios preparados"

# Backup
cp "\$OSSEC_CONF" "\$OSSEC_CONF.bak.\$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
[ -f "\$RULES_FILE" ] && cp "\$RULES_FILE" "\$RULES_FILE.bak.\$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
ok "Backups creados"

#============================================================================
# SCRIPTS DE ACTIVE RESPONSE - WINDOWS
#============================================================================
${windowsARScripts}

#============================================================================
# SCRIPTS DE ACTIVE RESPONSE - LINUX
#============================================================================
${linuxARScripts}

#============================================================================
# REGLAS DE ACTIVE RESPONSE (trigger rules)
#============================================================================
status "Instalando reglas de Active Response..."

cat > "\$RULES_FILE" << 'RULES_EOF'
<!-- Active Response Rules - By Sistemas 127 -->
<group name="active_response,">

${activeResponseRules}

</group>
RULES_EOF

ok "Reglas de Active Response instaladas"
add_summary "Reglas AR: instaladas en \$RULES_FILE"

#============================================================================
# CONFIGURACION OSSEC.CONF - ACTIVE RESPONSE
#============================================================================
status "Configurando Active Response en ossec.conf..."

${ossecConfAR}

ok "Active Response configurado en ossec.conf"
add_summary "ossec.conf: Active Response configurado"

#============================================================================
# AUTO-DEPLOY A AGENTES
#============================================================================
${autoDeploySection}

#============================================================================
# VERIFICAR Y REINICIAR
#============================================================================
status "Verificando sintaxis..."
\$OSSEC_DIR/bin/wazuh-analysisd -t 2>/dev/null && ok "Sintaxis correcta" || {
    warn "Error de sintaxis detectado. Restaurando backup..."
    LATEST_BACKUP=\$(ls -t \$RULES_FILE.bak.* 2>/dev/null | head -1)
    if [ -n "\$LATEST_BACKUP" ]; then
        cp "\$LATEST_BACKUP" "\$RULES_FILE"
        ok "Backup restaurado"
    fi
    LATEST_CONF_BACKUP=\$(ls -t \$OSSEC_CONF.bak.* 2>/dev/null | head -1)
    if [ -n "\$LATEST_CONF_BACKUP" ]; then
        cp "\$LATEST_CONF_BACKUP" "\$OSSEC_CONF"
        ok "ossec.conf restaurado"
    fi
    fail "Corrige los errores antes de continuar"
}

status "Reiniciando Wazuh Manager..."
systemctl restart wazuh-manager
ok "Wazuh Manager reiniciado"
add_summary "Wazuh Manager: reiniciado con Active Response"

#============================================================================
# RESUMEN
#============================================================================
clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  ACTIVE RESPONSE - INSTALACION COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}Resumen:\${NC}"
while IFS= read -r item; do echo -e "    \${CYAN}•\${NC} \$item"; done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}Ficheros:\${NC}"
echo -e "    Reglas AR:     \$RULES_FILE"
echo -e "    Scripts AR:    \$AR_DIR/"
echo -e "    Configuracion: \$OSSEC_CONF"
echo ""
echo -e "  \${BOLD}Comandos utiles:\${NC}"
echo -e "    Test sintaxis: \$OSSEC_DIR/bin/wazuh-analysisd -t"
echo -e "    Ver alertas:   tail -f /var/ossec/logs/alerts/alerts.json"
echo -e "    Ver AR logs:   tail -f /var/ossec/logs/active-responses.log"
echo -e "    Reiniciar:     systemctl restart wazuh-manager"
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`;
}

function getWindowsARScripts(config: WazuhActiveResponseConfig): string {
  let scripts = '';

  if (config.enableBlockIP) {
    scripts += `
status "Creando script AR Windows: Bloqueo de IP..."
cat > "\$SHARED_DIR/block-ip.ps1" << 'WIN_BLOCK_EOF'
# Active Response - Block IP (Windows)
# By Sistemas 127 - SOC Automation
param (
    [string]$action,
    [string]$srcip
)

$LOG_FILE = "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
$date = Get-Date -Format "yyyy/MM/dd HH:mm:ss"

if ($action -eq "add") {
    try {
        $ruleName = "WazuhBlock_$srcip"
        $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Block -RemoteAddress $srcip -Protocol Any -Profile Any | Out-Null
            New-NetFirewallRule -DisplayName "$($ruleName)_OUT" -Direction Outbound -Action Block -RemoteAddress $srcip -Protocol Any -Profile Any | Out-Null
            Add-Content -Path $LOG_FILE -Value "$date active-response/block-ip: Blocked IP $srcip"
        }
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/block-ip: ERROR blocking $srcip - $_"
    }
} elseif ($action -eq "delete") {
    try {
        Remove-NetFirewallRule -DisplayName "WazuhBlock_$srcip" -ErrorAction SilentlyContinue
        Remove-NetFirewallRule -DisplayName "WazuhBlock_$($srcip)_OUT" -ErrorAction SilentlyContinue
        Add-Content -Path $LOG_FILE -Value "$date active-response/block-ip: Unblocked IP $srcip"
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/block-ip: ERROR unblocking $srcip - $_"
    }
}
WIN_BLOCK_EOF
ok "Script Windows block-ip.ps1 creado"
add_summary "Windows AR: block-ip.ps1"
`;
  }

  if (config.enableDisableUser) {
    scripts += `
status "Creando script AR Windows: Deshabilitar usuario..."
cat > "\$SHARED_DIR/disable-user.ps1" << 'WIN_DISUSER_EOF'
# Active Response - Disable User Account (Windows/Windows Server)
# By Sistemas 127
param (
    [string]$action,
    [string]$username
)

$LOG_FILE = "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
$date = Get-Date -Format "yyyy/MM/dd HH:mm:ss"

if ($action -eq "add") {
    try {
        # Try local user first
        $localUser = Get-LocalUser -Name $username -ErrorAction SilentlyContinue
        if ($localUser) {
            Disable-LocalUser -Name $username
            Add-Content -Path $LOG_FILE -Value "$date active-response/disable-user: Disabled local user $username"
        }
        # Try AD user (Windows Server with AD)
        if (Get-Command Get-ADUser -ErrorAction SilentlyContinue) {
            $adUser = Get-ADUser -Identity $username -ErrorAction SilentlyContinue
            if ($adUser) {
                Disable-ADAccount -Identity $username
                Add-Content -Path $LOG_FILE -Value "$date active-response/disable-user: Disabled AD user $username"
            }
        }
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/disable-user: ERROR disabling $username - $_"
    }
} elseif ($action -eq "delete") {
    try {
        Enable-LocalUser -Name $username -ErrorAction SilentlyContinue
        if (Get-Command Enable-ADAccount -ErrorAction SilentlyContinue) {
            Enable-ADAccount -Identity $username -ErrorAction SilentlyContinue
        }
        Add-Content -Path $LOG_FILE -Value "$date active-response/disable-user: Re-enabled user $username"
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/disable-user: ERROR re-enabling $username - $_"
    }
}
WIN_DISUSER_EOF
ok "Script Windows disable-user.ps1 creado"
add_summary "Windows AR: disable-user.ps1"
`;
  }

  if (config.enableIsolateHost) {
    scripts += `
status "Creando script AR Windows: Aislamiento de host..."
cat > "\$SHARED_DIR/isolate-host.ps1" << 'WIN_ISOLATE_EOF'
# Active Response - Network Isolation (Windows/Windows Server)
# By Sistemas 127
# PELIGRO: Aisla completamente el host excepto comunicacion con Wazuh
param (
    [string]$action,
    [string]$wazuhServer = "${config.wazuhServerIp || '0.0.0.0'}"
)

$LOG_FILE = "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
$date = Get-Date -Format "yyyy/MM/dd HH:mm:ss"

if ($action -eq "add") {
    try {
        # Save current rules for rollback
        netsh advfirewall export "C:\\ProgramData\\wazuh-fw-backup.wfw" | Out-Null
        # Block everything
        Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction Block -DefaultOutboundAction Block
        # Allow Wazuh comms
        New-NetFirewallRule -DisplayName "WazuhIsolate_AllowAgent" -Direction Outbound -Action Allow -RemoteAddress $wazuhServer -RemotePort 1514,1515 -Protocol TCP | Out-Null
        New-NetFirewallRule -DisplayName "WazuhIsolate_AllowDNS" -Direction Outbound -Action Allow -RemotePort 53 -Protocol UDP | Out-Null
        New-NetFirewallRule -DisplayName "WazuhIsolate_AllowLoopback" -Direction Outbound -Action Allow -RemoteAddress 127.0.0.1 | Out-Null
        Add-Content -Path $LOG_FILE -Value "$date active-response/isolate-host: Host ISOLATED - only Wazuh traffic allowed"
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/isolate-host: ERROR isolating - $_"
    }
} elseif ($action -eq "delete") {
    try {
        netsh advfirewall import "C:\\ProgramData\\wazuh-fw-backup.wfw" | Out-Null
        Get-NetFirewallRule -DisplayName "WazuhIsolate_*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
        Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction NotConfigured -DefaultOutboundAction NotConfigured
        Add-Content -Path $LOG_FILE -Value "$date active-response/isolate-host: Host UN-ISOLATED - network restored"
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/isolate-host: ERROR un-isolating - $_"
    }
}
WIN_ISOLATE_EOF
ok "Script Windows isolate-host.ps1 creado"
add_summary "Windows AR: isolate-host.ps1"
`;
  }

  if (config.enableKillProcess) {
    scripts += `
status "Creando script AR Windows: Matar proceso..."
cat > "\$SHARED_DIR/kill-process.ps1" << 'WIN_KILL_EOF'
# Active Response - Kill Malicious Process (Windows)
# By Sistemas 127
param (
    [string]$action,
    [string]$processName
)

$LOG_FILE = "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
$date = Get-Date -Format "yyyy/MM/dd HH:mm:ss"

if ($action -eq "add") {
    try {
        $procs = Get-Process -Name $processName -ErrorAction SilentlyContinue
        foreach ($p in $procs) {
            # Collect forensic info before killing
            $info = "PID=$($p.Id) Path=$($p.Path) StartTime=$($p.StartTime) CommandLine=$((Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").CommandLine)"
            Add-Content -Path $LOG_FILE -Value "$date active-response/kill-process: FORENSIC $info"
            Stop-Process -Id $p.Id -Force
            Add-Content -Path $LOG_FILE -Value "$date active-response/kill-process: Killed $processName (PID $($p.Id))"
        }
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/kill-process: ERROR killing $processName - $_"
    }
}
WIN_KILL_EOF
ok "Script Windows kill-process.ps1 creado"
add_summary "Windows AR: kill-process.ps1"
`;
  }

  if (config.enableCollectForensics) {
    scripts += `
status "Creando script AR Windows: Recoleccion forense..."
cat > "\$SHARED_DIR/collect-forensics.ps1" << 'WIN_FORENSIC_EOF'
# Active Response - Forensic Collection (Windows/Windows Server)
# By Sistemas 127
param (
    [string]$action,
    [string]$alertId = "unknown"
)

$LOG_FILE = "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
$FORENSIC_DIR = "C:\\ProgramData\\wazuh-forensics"
$date = Get-Date -Format "yyyy/MM/dd HH:mm:ss"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if ($action -eq "add") {
    try {
        $caseDir = "$FORENSIC_DIR\\$timestamp"
        New-Item -ItemType Directory -Path $caseDir -Force | Out-Null

        # Network connections
        Get-NetTCPConnection | Where-Object { $_.State -eq 'Established' } | Export-Csv "$caseDir\\network_connections.csv" -NoTypeInformation
        
        # Running processes with hashes
        Get-Process | Select-Object Id,ProcessName,Path,StartTime,CPU | Export-Csv "$caseDir\\processes.csv" -NoTypeInformation
        
        # Recent event logs (Security, System)
        Get-WinEvent -LogName Security -MaxEvents 200 | Export-Csv "$caseDir\\security_events.csv" -NoTypeInformation
        Get-WinEvent -LogName System -MaxEvents 100 | Export-Csv "$caseDir\\system_events.csv" -NoTypeInformation

        # Scheduled tasks
        Get-ScheduledTask | Where-Object {$_.State -ne 'Disabled'} | Export-Csv "$caseDir\\scheduled_tasks.csv" -NoTypeInformation

        # Services
        Get-Service | Where-Object {$_.Status -eq 'Running'} | Export-Csv "$caseDir\\running_services.csv" -NoTypeInformation

        # Autorun entries
        Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -ErrorAction SilentlyContinue | Out-File "$caseDir\\autoruns_hklm.txt"
        Get-ItemProperty "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -ErrorAction SilentlyContinue | Out-File "$caseDir\\autoruns_hkcu.txt"

        # DNS cache
        Get-DnsClientCache | Export-Csv "$caseDir\\dns_cache.csv" -NoTypeInformation

        # ARP table
        Get-NetNeighbor | Export-Csv "$caseDir\\arp_table.csv" -NoTypeInformation

        Add-Content -Path $LOG_FILE -Value "$date active-response/collect-forensics: Forensic data collected in $caseDir"
    } catch {
        Add-Content -Path $LOG_FILE -Value "$date active-response/collect-forensics: ERROR - $_"
    }
}
WIN_FORENSIC_EOF
ok "Script Windows collect-forensics.ps1 creado"
add_summary "Windows AR: collect-forensics.ps1"
`;
  }

  return scripts;
}

function getLinuxARScripts(config: WazuhActiveResponseConfig): string {
  let scripts = '';

  if (config.enableLinuxBlockIP) {
    scripts += `
status "Creando script AR Linux: Bloqueo de IP..."
cat > "\$AR_DIR/linux-block-ip.sh" << 'LIN_BLOCK_EOF'
#!/bin/bash
# Active Response - Block IP (Linux)
# By Sistemas 127

ACTION=$1
SRCIP=$3
LOG_FILE="/var/ossec/logs/active-responses.log"
DATE=$(date "+%Y/%m/%d %H:%M:%S")

if [ "$ACTION" = "add" ]; then
    # iptables
    if command -v iptables &>/dev/null; then
        iptables -I INPUT -s "$SRCIP" -j DROP 2>/dev/null
        iptables -I OUTPUT -d "$SRCIP" -j DROP 2>/dev/null
    fi
    # nftables
    if command -v nft &>/dev/null; then
        nft add rule inet filter input ip saddr "$SRCIP" drop 2>/dev/null || true
    fi
    # firewalld
    if command -v firewall-cmd &>/dev/null; then
        firewall-cmd --add-rich-rule="rule family=ipv4 source address=$SRCIP drop" 2>/dev/null || true
    fi
    echo "$DATE active-response/linux-block-ip: Blocked $SRCIP" >> "$LOG_FILE"
elif [ "$ACTION" = "delete" ]; then
    if command -v iptables &>/dev/null; then
        iptables -D INPUT -s "$SRCIP" -j DROP 2>/dev/null || true
        iptables -D OUTPUT -d "$SRCIP" -j DROP 2>/dev/null || true
    fi
    if command -v firewall-cmd &>/dev/null; then
        firewall-cmd --remove-rich-rule="rule family=ipv4 source address=$SRCIP drop" 2>/dev/null || true
    fi
    echo "$DATE active-response/linux-block-ip: Unblocked $SRCIP" >> "$LOG_FILE"
fi
LIN_BLOCK_EOF
chmod 750 "\$AR_DIR/linux-block-ip.sh"
chown root:wazuh "\$AR_DIR/linux-block-ip.sh"
ok "Script Linux linux-block-ip.sh creado"
add_summary "Linux AR: linux-block-ip.sh"
`;
  }

  if (config.enableLinuxDisableUser) {
    scripts += `
status "Creando script AR Linux: Deshabilitar usuario..."
cat > "\$AR_DIR/linux-disable-user.sh" << 'LIN_DISUSER_EOF'
#!/bin/bash
# Active Response - Disable User (Linux)
# By Sistemas 127

ACTION=$1
USER_NAME=$3
LOG_FILE="/var/ossec/logs/active-responses.log"
DATE=$(date "+%Y/%m/%d %H:%M:%S")

# Never disable root or wazuh
if [ "$USER_NAME" = "root" ] || [ "$USER_NAME" = "wazuh" ] || [ "$USER_NAME" = "ossec" ]; then
    echo "$DATE active-response/linux-disable-user: REFUSED to disable protected user $USER_NAME" >> "$LOG_FILE"
    exit 0
fi

if [ "$ACTION" = "add" ]; then
    # Lock account
    usermod -L "$USER_NAME" 2>/dev/null || true
    # Expire account
    chage -E 0 "$USER_NAME" 2>/dev/null || true
    # Kill all user sessions
    pkill -u "$USER_NAME" 2>/dev/null || true
    echo "$DATE active-response/linux-disable-user: Disabled and locked user $USER_NAME" >> "$LOG_FILE"
elif [ "$ACTION" = "delete" ]; then
    usermod -U "$USER_NAME" 2>/dev/null || true
    chage -E -1 "$USER_NAME" 2>/dev/null || true
    echo "$DATE active-response/linux-disable-user: Re-enabled user $USER_NAME" >> "$LOG_FILE"
fi
LIN_DISUSER_EOF
chmod 750 "\$AR_DIR/linux-disable-user.sh"
chown root:wazuh "\$AR_DIR/linux-disable-user.sh"
ok "Script Linux linux-disable-user.sh creado"
add_summary "Linux AR: linux-disable-user.sh"
`;
  }

  if (config.enableLinuxIsolateHost) {
    scripts += `
status "Creando script AR Linux: Aislamiento de host..."
cat > "\$AR_DIR/linux-isolate-host.sh" << 'LIN_ISOLATE_EOF'
#!/bin/bash
# Active Response - Network Isolation (Linux)
# By Sistemas 127
# PELIGRO: Aisla completamente el host excepto Wazuh

ACTION=$1
WAZUH_SERVER="${config.wazuhServerIp || '0.0.0.0'}"
LOG_FILE="/var/ossec/logs/active-responses.log"
DATE=$(date "+%Y/%m/%d %H:%M:%S")
BACKUP_FILE="/var/ossec/tmp/iptables-backup.rules"

if [ "$ACTION" = "add" ]; then
    # Backup current rules
    iptables-save > "$BACKUP_FILE" 2>/dev/null || true
    # Flush everything
    iptables -F
    iptables -X
    # Default DROP
    iptables -P INPUT DROP
    iptables -P OUTPUT DROP
    iptables -P FORWARD DROP
    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT
    iptables -A OUTPUT -o lo -j ACCEPT
    # Allow Wazuh communication
    iptables -A OUTPUT -d "$WAZUH_SERVER" -p tcp --dport 1514 -j ACCEPT
    iptables -A OUTPUT -d "$WAZUH_SERVER" -p tcp --dport 1515 -j ACCEPT
    iptables -A INPUT -s "$WAZUH_SERVER" -p tcp --sport 1514 -j ACCEPT
    iptables -A INPUT -s "$WAZUH_SERVER" -p tcp --sport 1515 -j ACCEPT
    # Allow DNS for Wazuh resolution
    iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
    iptables -A INPUT -p udp --sport 53 -j ACCEPT
    # Allow established connections (for current Wazuh session)
    iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    echo "$DATE active-response/linux-isolate-host: Host ISOLATED" >> "$LOG_FILE"
elif [ "$ACTION" = "delete" ]; then
    if [ -f "$BACKUP_FILE" ]; then
        iptables-restore < "$BACKUP_FILE" 2>/dev/null || true
        rm -f "$BACKUP_FILE"
    else
        iptables -F
        iptables -P INPUT ACCEPT
        iptables -P OUTPUT ACCEPT
        iptables -P FORWARD ACCEPT
    fi
    echo "$DATE active-response/linux-isolate-host: Host UN-ISOLATED" >> "$LOG_FILE"
fi
LIN_ISOLATE_EOF
chmod 750 "\$AR_DIR/linux-isolate-host.sh"
chown root:wazuh "\$AR_DIR/linux-isolate-host.sh"
ok "Script Linux linux-isolate-host.sh creado"
add_summary "Linux AR: linux-isolate-host.sh"
`;
  }

  if (config.enableLinuxKillProcess) {
    scripts += `
status "Creando script AR Linux: Matar proceso..."
cat > "\$AR_DIR/linux-kill-process.sh" << 'LIN_KILL_EOF'
#!/bin/bash
# Active Response - Kill Malicious Process (Linux)
# By Sistemas 127

ACTION=$1
PROCESS_NAME=$3
LOG_FILE="/var/ossec/logs/active-responses.log"
DATE=$(date "+%Y/%m/%d %H:%M:%S")

# Protected processes
PROTECTED="wazuh ossec sshd systemd init"

if [ "$ACTION" = "add" ]; then
    for prot in $PROTECTED; do
        if [ "$PROCESS_NAME" = "$prot" ]; then
            echo "$DATE active-response/linux-kill-process: REFUSED to kill protected process $PROCESS_NAME" >> "$LOG_FILE"
            exit 0
        fi
    done
    # Collect forensic data before kill
    PIDS=$(pgrep -f "$PROCESS_NAME" 2>/dev/null)
    for pid in $PIDS; do
        CMDLINE=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\\0' ' ')
        EXE=$(readlink -f /proc/$pid/exe 2>/dev/null)
        echo "$DATE active-response/linux-kill-process: FORENSIC PID=$pid CMD=$CMDLINE EXE=$EXE" >> "$LOG_FILE"
    done
    pkill -9 -f "$PROCESS_NAME" 2>/dev/null || true
    echo "$DATE active-response/linux-kill-process: Killed $PROCESS_NAME" >> "$LOG_FILE"
fi
LIN_KILL_EOF
chmod 750 "\$AR_DIR/linux-kill-process.sh"
chown root:wazuh "\$AR_DIR/linux-kill-process.sh"
ok "Script Linux linux-kill-process.sh creado"
add_summary "Linux AR: linux-kill-process.sh"
`;
  }

  if (config.enableLinuxCollectForensics) {
    scripts += `
status "Creando script AR Linux: Recoleccion forense..."
cat > "\$AR_DIR/linux-collect-forensics.sh" << 'LIN_FORENSIC_EOF'
#!/bin/bash
# Active Response - Forensic Collection (Linux)
# By Sistemas 127

ACTION=$1
LOG_FILE="/var/ossec/logs/active-responses.log"
FORENSIC_DIR="/var/ossec/forensics"
DATE=$(date "+%Y/%m/%d %H:%M:%S")
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

if [ "$ACTION" = "add" ]; then
    CASE_DIR="$FORENSIC_DIR/$TIMESTAMP"
    mkdir -p "$CASE_DIR"

    # Network connections
    ss -tulnpa > "$CASE_DIR/network_connections.txt" 2>/dev/null
    netstat -antup > "$CASE_DIR/netstat.txt" 2>/dev/null || true

    # Processes
    ps auxwwf > "$CASE_DIR/processes.txt" 2>/dev/null
    
    # Open files
    lsof -i -n -P > "$CASE_DIR/open_files_network.txt" 2>/dev/null || true

    # Recent logins
    last -50 > "$CASE_DIR/last_logins.txt" 2>/dev/null
    lastb -20 > "$CASE_DIR/failed_logins.txt" 2>/dev/null || true

    # Crontabs
    for user in $(cut -f1 -d: /etc/passwd); do
        crontab -l -u "$user" > "$CASE_DIR/crontab_$user.txt" 2>/dev/null || true
    done
    ls -la /etc/cron.d/ > "$CASE_DIR/cron_d.txt" 2>/dev/null

    # Systemd timers
    systemctl list-timers --all > "$CASE_DIR/systemd_timers.txt" 2>/dev/null

    # Loaded kernel modules
    lsmod > "$CASE_DIR/kernel_modules.txt" 2>/dev/null

    # ARP table
    ip neigh show > "$CASE_DIR/arp_table.txt" 2>/dev/null

    # Recent modified files
    find /tmp /var/tmp /dev/shm -type f -mmin -60 -ls > "$CASE_DIR/recent_tmp_files.txt" 2>/dev/null || true

    # Auth logs
    tail -500 /var/log/auth.log > "$CASE_DIR/auth_log.txt" 2>/dev/null || true
    tail -500 /var/log/secure > "$CASE_DIR/secure_log.txt" 2>/dev/null || true

    # DNS resolv
    cat /etc/resolv.conf > "$CASE_DIR/resolv.conf.txt" 2>/dev/null
    
    # Users with shell
    grep -v nologin /etc/passwd | grep -v false > "$CASE_DIR/users_with_shell.txt" 2>/dev/null

    chmod -R 600 "$CASE_DIR"
    chown -R root:wazuh "$CASE_DIR"

    echo "$DATE active-response/linux-collect-forensics: Forensic data in $CASE_DIR" >> "$LOG_FILE"
fi
LIN_FORENSIC_EOF
chmod 750 "\$AR_DIR/linux-collect-forensics.sh"
chown root:wazuh "\$AR_DIR/linux-collect-forensics.sh"
ok "Script Linux linux-collect-forensics.sh creado"
add_summary "Linux AR: linux-collect-forensics.sh"
`;
  }

  return scripts;
}

function getActiveResponseRules(config: WazuhActiveResponseConfig): string {
  let rules = '';

  // Rule IDs 100400+
  rules += `  <!-- ========== TRIGGER RULES - WINDOWS ========== -->

  <!-- Brute force SSH/RDP triggers block IP -->
  <rule id="100400" level="13" frequency="8" timeframe="120">
    <if_matched_sid>5763</if_matched_sid>
    <same_source_ip />
    <description>AR-TRIGGER: Multiple auth failures - block source IP (Windows/Linux)</description>
    <group>active_response,authentication_failures,</group>
  </rule>

  <!-- Windows: Failed logon repeated (EventID 4625) -->
  <rule id="100401" level="13">
    <if_sid>60122</if_sid>
    <match>Logon Type</match>
    <description>AR-TRIGGER: Windows repeated logon failure - block IP and disable user</description>
    <group>active_response,windows,brute_force,</group>
  </rule>

  <!-- Windows: Account lockout (EventID 4740) -->
  <rule id="100402" level="14">
    <if_sid>60137</if_sid>
    <description>AR-TRIGGER: Windows account lockout detected - collect forensics</description>
    <group>active_response,windows,account_lockout,</group>
  </rule>

  <!-- Malware/Ransomware detection -->
  <rule id="100403" level="15">
    <if_sid>100300</if_sid>
    <description>AR-TRIGGER: Ransomware detected - ISOLATE HOST immediately</description>
    <group>active_response,ransomware,critical,</group>
  </rule>

  <!-- New service installed (EventID 7045 - Windows) -->
  <rule id="100404" level="12">
    <if_sid>60106</if_sid>
    <match>Service File Name</match>
    <description>AR-TRIGGER: Suspicious service installed on Windows - collect forensics</description>
    <group>active_response,windows,persistence,</group>
  </rule>

  <!-- ========== TRIGGER RULES - LINUX ========== -->

  <!-- SSH brute force Linux -->
  <rule id="100410" level="13" frequency="8" timeframe="120">
    <if_matched_sid>5712</if_matched_sid>
    <same_source_ip />
    <description>AR-TRIGGER: SSH brute force on Linux - block source IP</description>
    <group>active_response,linux,brute_force,</group>
  </rule>

  <!-- Privilege escalation: sudo to root by unauthorized user -->
  <rule id="100411" level="14">
    <if_sid>5401</if_sid>
    <match>NOT in sudoers</match>
    <description>AR-TRIGGER: Unauthorized sudo attempt - disable user and collect forensics</description>
    <group>active_response,linux,privilege_escalation,</group>
  </rule>

  <!-- Rootkit detected -->
  <rule id="100412" level="15">
    <if_sid>510</if_sid>
    <description>AR-TRIGGER: Rootkit detected on Linux - ISOLATE HOST</description>
    <group>active_response,linux,rootkit,critical,</group>
  </rule>

  <!-- Reverse shell detected -->
  <rule id="100413" level="15">
    <if_sid>100050</if_sid>
    <description>AR-TRIGGER: Reverse shell detected - kill process and isolate</description>
    <group>active_response,linux,reverse_shell,critical,</group>
  </rule>

  <!-- File integrity: critical file modified -->
  <rule id="100414" level="13">
    <if_sid>550</if_sid>
    <match>/etc/passwd</match>
    <description>AR-TRIGGER: Critical file /etc/passwd modified - collect forensics</description>
    <group>active_response,linux,fim,</group>
  </rule>

  <!-- Cryptominer detected -->
  <rule id="100415" level="14">
    <if_sid>100052</if_sid>
    <description>AR-TRIGGER: Cryptominer detected - kill process and block IP</description>
    <group>active_response,linux,cryptominer,</group>
  </rule>

  <!-- ========== TRIGGER RULES - CROSS-PLATFORM ========== -->

  <!-- Port scan detected -->
  <rule id="100420" level="12">
    <if_sid>100060</if_sid>
    <description>AR-TRIGGER: Port scan detected - block source IP</description>
    <group>active_response,network,port_scan,</group>
  </rule>

  <!-- Tor exit node connection -->
  <rule id="100421" level="13">
    <if_sid>100061</if_sid>
    <description>AR-TRIGGER: Tor exit node connection - block IP and collect forensics</description>
    <group>active_response,network,tor,</group>
  </rule>

  <!-- Firewall rule disabled -->
  <rule id="100422" level="13">
    <if_sid>18107</if_sid>
    <description>AR-TRIGGER: Firewall disabled - collect forensics immediately</description>
    <group>active_response,defense_evasion,</group>
  </rule>

  <!-- Windows Defender disabled -->
  <rule id="100423" level="14">
    <if_sid>61138</if_sid>
    <description>AR-TRIGGER: Windows Defender disabled - collect forensics and alert</description>
    <group>active_response,windows,defense_evasion,</group>
  </rule>`;

  return rules;
}

function getOssecConfActiveResponse(config: WazuhActiveResponseConfig): string {
  let arConfig = '';

  // Add command definitions and AR entries to ossec.conf
  const commands: string[] = [];
  const responses: string[] = [];

  if (config.enableBlockIP || config.enableLinuxBlockIP) {
    commands.push(`
  <command>
    <name>linux-block-ip</name>
    <executable>linux-block-ip.sh</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>`);
    responses.push(`
  <active-response>
    <command>linux-block-ip</command>
    <location>local</location>
    <rules_id>100400,100410,100415,100420,100421</rules_id>
    <timeout>3600</timeout>
  </active-response>`);
  }

  if (config.enableDisableUser || config.enableLinuxDisableUser) {
    commands.push(`
  <command>
    <name>linux-disable-user</name>
    <executable>linux-disable-user.sh</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>`);
    responses.push(`
  <active-response>
    <command>linux-disable-user</command>
    <location>local</location>
    <rules_id>100401,100411</rules_id>
    <timeout>86400</timeout>
  </active-response>`);
  }

  if (config.enableIsolateHost || config.enableLinuxIsolateHost) {
    commands.push(`
  <command>
    <name>linux-isolate-host</name>
    <executable>linux-isolate-host.sh</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>`);
    responses.push(`
  <active-response>
    <command>linux-isolate-host</command>
    <location>local</location>
    <rules_id>100403,100412,100413</rules_id>
    <timeout>0</timeout>
  </active-response>`);
  }

  if (config.enableKillProcess || config.enableLinuxKillProcess) {
    commands.push(`
  <command>
    <name>linux-kill-process</name>
    <executable>linux-kill-process.sh</executable>
    <timeout_allowed>no</timeout_allowed>
  </command>`);
    responses.push(`
  <active-response>
    <command>linux-kill-process</command>
    <location>local</location>
    <rules_id>100413,100415</rules_id>
  </active-response>`);
  }

  if (config.enableCollectForensics || config.enableLinuxCollectForensics) {
    commands.push(`
  <command>
    <name>linux-collect-forensics</name>
    <executable>linux-collect-forensics.sh</executable>
    <timeout_allowed>no</timeout_allowed>
  </command>`);
    responses.push(`
  <active-response>
    <command>linux-collect-forensics</command>
    <location>local</location>
    <rules_id>100402,100403,100404,100411,100412,100413,100414,100421,100422,100423</rules_id>
  </active-response>`);
  }

  const allEntries = [...commands, ...responses].join('\\n');

  arConfig = `
# Remove existing AR config first to avoid duplicates
if grep -q "linux-block-ip\\|linux-disable-user\\|linux-isolate-host\\|linux-kill-process\\|linux-collect-forensics" "\$OSSEC_CONF" 2>/dev/null; then
    warn "Active Response ya configurado en ossec.conf, actualizando..."
fi

# Insert AR commands before closing </ossec_config>
TEMP_AR_FILE="/tmp/wazuh_ar_config_\$\$.xml"
cat > "\$TEMP_AR_FILE" << 'AR_CONFIG_EOF'
  <!-- ======= ACTIVE RESPONSE - By Sistemas 127 ======= -->
${commands.join('\n')}

${responses.join('\n')}
  <!-- ======= END ACTIVE RESPONSE ======= -->
AR_CONFIG_EOF

# Insert before </ossec_config> if not already present
if ! grep -q "ACTIVE RESPONSE - By Sistemas 127" "\$OSSEC_CONF"; then
    sed -i '/<\\/ossec_config>/e cat /tmp/wazuh_ar_config_'\$\$'.xml' "\$OSSEC_CONF"
fi
rm -f "\$TEMP_AR_FILE"
`;

  return arConfig;
}

function getAutoDeploySection(config: WazuhActiveResponseConfig): string {
  let deploy = '';

  if (config.enableAutoDeployWindows) {
    deploy += `
#============================================================================
# AUTO-DEPLOY SCRIPTS A AGENTES WINDOWS
#============================================================================
status "Preparando auto-despliegue de scripts PowerShell a agentes Windows..."

# Copy PS1 scripts to shared folder for auto-distribution
WINDOWS_SHARED="\$OSSEC_DIR/etc/shared/default"
mkdir -p "\$WINDOWS_SHARED"

# Create a wodle to push PS1 scripts via agent upgrade mechanism
cat > "\$WODLE_DIR/deploy-ar-windows.sh" << 'DEPLOY_WIN_EOF'
#!/bin/bash
# Auto-deploy AR scripts to Windows agents
# This runs as a wodle and copies scripts to shared folder
SHARED_DIR="/var/ossec/etc/shared/default"
AR_SCRIPTS_DIR="/var/ossec/etc/shared/default"

# Scripts are already in shared dir, agents will pull them automatically
# Wazuh agents sync shared folder contents on check-in
echo "$(date) - Windows AR scripts available in shared folder for auto-deploy" >> /var/ossec/logs/active-responses.log
DEPLOY_WIN_EOF
chmod 750 "\$WODLE_DIR/deploy-ar-windows.sh"

# Add agent.conf for Windows group to execute PS1 scripts
cat > "\$WINDOWS_SHARED/agent.conf" << 'AGENT_CONF_EOF'
<agent_config os="Windows">
  <!-- Wazuh Agent - Windows Active Response Configuration -->
  <!-- Scripts are auto-deployed via shared folder -->
  
  <localfile>
    <log_format>eventchannel</log_format>
    <location>Security</location>
  </localfile>
  
  <localfile>
    <log_format>eventchannel</log_format>
    <location>System</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Microsoft-Windows-Sysmon/Operational</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Microsoft-Windows-PowerShell/Operational</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Microsoft-Windows-Windows Defender/Operational</location>
  </localfile>

  <!-- File integrity monitoring for Windows -->
  <syscheck>
    <directories realtime="yes">C:\\\\Windows\\\\System32\\\\drivers\\\\etc</directories>
    <directories realtime="yes">C:\\\\Windows\\\\System32\\\\config</directories>
    <directories whodata="yes">C:\\\\Users</directories>
    <windows_registry>HKEY_LOCAL_MACHINE\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run</windows_registry>
    <windows_registry>HKEY_LOCAL_MACHINE\\\\SYSTEM\\\\CurrentControlSet\\\\Services</windows_registry>
  </syscheck>
</agent_config>
AGENT_CONF_EOF

ok "Auto-deploy Windows configurado (scripts en shared folder)"
add_summary "Auto-deploy Windows: configurado via shared folder"
`;
  }

  if (config.enableAutoDeployLinux) {
    deploy += `
#============================================================================
# AUTO-DEPLOY SCRIPTS A AGENTES LINUX
#============================================================================
status "Preparando auto-despliegue de scripts a agentes Linux..."

LINUX_SHARED="\$OSSEC_DIR/etc/shared/default"
mkdir -p "\$LINUX_SHARED"

# Agent.conf for Linux agents
if [ ! -f "\$LINUX_SHARED/agent.conf" ]; then
    cat > "\$LINUX_SHARED/agent.conf" << 'LINUX_AGENT_CONF_EOF'
<agent_config os="Linux">
  <!-- Wazuh Agent - Linux Active Response Configuration -->
  
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>audit</log_format>
    <location>/var/log/audit/audit.log</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/dpkg.log</location>
  </localfile>

  <!-- File integrity monitoring -->
  <syscheck>
    <directories realtime="yes" check_all="yes">/etc,/usr/bin,/usr/sbin,/bin,/sbin</directories>
    <directories realtime="yes">/boot</directories>
    <directories whodata="yes">/tmp,/var/tmp,/dev/shm</directories>
    <ignore>/etc/mtab</ignore>
    <ignore>/etc/hosts.deny</ignore>
    <ignore>/etc/adjtime</ignore>
  </syscheck>

  <!-- Rootcheck -->
  <rootcheck>
    <disabled>no</disabled>
    <check_files>yes</check_files>
    <check_trojans>yes</check_trojans>
    <check_dev>yes</check_dev>
    <check_sys>yes</check_sys>
    <check_pids>yes</check_pids>
    <check_ports>yes</check_ports>
    <check_if>yes</check_if>
    <frequency>43200</frequency>
  </rootcheck>
</agent_config>
LINUX_AGENT_CONF_EOF
else
    warn "agent.conf ya existe, no se sobreescribe"
fi

# Ensure AR scripts are available for agents
ok "Auto-deploy Linux configurado"
add_summary "Auto-deploy Linux: configurado via shared folder + agent.conf"
`;
  }

  if (!config.enableAutoDeployWindows && !config.enableAutoDeployLinux) {
    deploy = `
status "Auto-deploy deshabilitado (los scripts se quedan solo en el servidor)"
add_summary "Auto-deploy: deshabilitado"
`;
  }

  return deploy;
}
