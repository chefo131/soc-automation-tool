#!/bin/bash
#============================================================================
# SOC Automation Web App - Script de Instalación del Servidor
# Instala todas las dependencias, compila la app y la deja operativa
# Compatible: Ubuntu 24.04/22.04, Debian 12, AlmaLinux 9, CentOS Stream 9,
#             Oracle Linux 9, Arch Linux
# Uso: sudo bash install-server.sh
#============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() {
    echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD} $1${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════${NC}\n"
}

#============================================================================
# VALIDACIONES INICIALES
#============================================================================
header "SOC Automation Web App - Instalador"

[ "$(id -u)" -ne 0 ] && error "Este script debe ejecutarse como root (usa sudo)"

# Detectar distribución
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO="$ID"
        DISTRO_VERSION="$VERSION_ID"
        DISTRO_NAME="$PRETTY_NAME"
    elif [ -f /etc/redhat-release ]; then
        DISTRO="rhel"
        DISTRO_NAME=$(cat /etc/redhat-release)
    else
        DISTRO="unknown"
        DISTRO_NAME="Desconocida"
    fi
    log "Distribución detectada: $DISTRO_NAME"
}

detect_distro

#============================================================================
# INSTALAR NODE.JS 20.x LTS
#============================================================================
header "Instalando Node.js 20.x LTS"

install_node_debian() {
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
}

install_node_rhel() {
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
}

install_node_arch() {
    pacman -S --noconfirm nodejs npm
}

case "$DISTRO" in
    ubuntu|debian)
        apt-get update -qq
        apt-get install -y -qq curl git build-essential
        if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
            install_node_debian
        fi
        ;;
    almalinux|centos|ol|rocky|rhel|fedora)
        dnf update -y -q
        dnf install -y -q curl git gcc-c++ make
        if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
            install_node_rhel
        fi
        ;;
    arch|manjaro)
        pacman -Syu --noconfirm
        pacman -S --noconfirm curl git base-devel
        if ! command -v node &>/dev/null; then
            install_node_arch
        fi
        ;;
    *)
        warn "Distribución no reconocida. Intentando instalación genérica..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || true
        apt-get install -y nodejs 2>/dev/null || dnf install -y nodejs 2>/dev/null || error "No se pudo instalar Node.js. Instálalo manualmente."
        ;;
esac

log "Node.js $(node -v) instalado"
log "npm $(npm -v) instalado"

#============================================================================
# INSTALAR DEPENDENCIAS DEL PROYECTO
#============================================================================
header "Instalando Dependencias del Proyecto"

INSTALL_DIR="/opt/soc-automation-web"
APP_DIR="$(pwd)"

# Si estamos en el directorio del proyecto, usarlo
if [ -f "$APP_DIR/package.json" ]; then
    log "Usando directorio actual: $APP_DIR"
else
    # Copiar al directorio de instalación
    mkdir -p $INSTALL_DIR
    cp -r . $INSTALL_DIR/
    APP_DIR="$INSTALL_DIR"
    log "Proyecto copiado a $INSTALL_DIR"
fi

cd "$APP_DIR"
npm install --production=false
log "Dependencias instaladas"

#============================================================================
# COMPILAR PARA PRODUCCIÓN
#============================================================================
header "Compilando para Producción"

npm run build
log "Aplicación compilada en ./dist"

#============================================================================
# INSTALAR Y CONFIGURAR NGINX
#============================================================================
header "Instalando Nginx"

install_nginx() {
    case "$DISTRO" in
        ubuntu|debian)
            apt-get install -y -qq nginx
            ;;
        almalinux|centos|ol|rocky|rhel|fedora)
            dnf install -y -q nginx
            ;;
        arch|manjaro)
            pacman -S --noconfirm nginx
            ;;
    esac
}

if ! command -v nginx &>/dev/null; then
    install_nginx
fi
log "Nginx instalado"

# Configurar sitio
WEB_DIR="/var/www/soc-automation"
mkdir -p $WEB_DIR
cp -r "$APP_DIR/dist/"* $WEB_DIR/

# Crear configuración Nginx
cat > /etc/nginx/sites-available/soc-automation 2>/dev/null || cat > /etc/nginx/conf.d/soc-automation.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    root /var/www/soc-automation;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX_EOF

# Habilitar sitio (Debian/Ubuntu)
if [ -d /etc/nginx/sites-enabled ]; then
    ln -sf /etc/nginx/sites-available/soc-automation /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
fi

# Verificar configuración
nginx -t
log "Nginx configurado"

#============================================================================
# CONFIGURAR FIREWALL
#============================================================================
header "Configurando Firewall"

if command -v ufw &>/dev/null; then
    ufw allow 80/tcp comment "HTTP - SOC Automation"
    ufw allow 443/tcp comment "HTTPS"
    ufw --force enable 2>/dev/null || true
    log "Firewall UFW configurado"
elif command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    log "Firewall firewalld configurado"
else
    warn "No se detectó firewall. Configúralo manualmente para abrir el puerto 80."
fi

#============================================================================
# INICIAR SERVICIOS
#============================================================================
header "Iniciando Servicios"

systemctl enable nginx
systemctl restart nginx
log "Nginx iniciado y habilitado en arranque"

#============================================================================
# RESUMEN DE INSTALACIÓN
#============================================================================
SERVER_IP=$(hostname -I | awk '{print $1}')

header "¡INSTALACIÓN COMPLETADA!"

echo -e "${BOLD}═══ Información del Servidor ═══${NC}"
echo -e "${GREEN}URL de la App:${NC}     http://${SERVER_IP}"
echo -e "${GREEN}Directorio Web:${NC}    ${WEB_DIR}"
echo -e "${GREEN}Código Fuente:${NC}     ${APP_DIR}"
echo -e "${GREEN}Config Nginx:${NC}      /etc/nginx/sites-available/soc-automation"
echo ""
echo -e "${BOLD}═══ Comandos Útiles ═══${NC}"
echo -e "  Reiniciar Nginx:   sudo systemctl restart nginx"
echo -e "  Ver logs Nginx:    sudo tail -f /var/log/nginx/error.log"
echo -e "  Recompilar app:    cd ${APP_DIR} && npm run build && sudo cp -r dist/* ${WEB_DIR}/"
echo -e "  Iniciar dev:       cd ${APP_DIR} && npm run dev"
echo ""
echo -e "${BOLD}═══ Para HTTPS (SSL) ═══${NC}"
echo -e "  Instala Certbot:"
echo -e "    sudo apt install certbot python3-certbot-nginx  # Debian/Ubuntu"
echo -e "    sudo dnf install certbot python3-certbot-nginx  # RHEL/AlmaLinux"
echo -e "  Obtener certificado:"
echo -e "    sudo certbot --nginx -d tu-dominio.com"
echo ""
echo -e "${GREEN}¡La aplicación SOC Automation está operativa!${NC}"
