# 🛡️ Goyo SOC Generator

Generador automático de scripts de instalación para plataformas de seguridad SOC (Security Operations Center).

**Customized by Goyo & Sistemas 127**

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación Local](#instalación-local)
- [Instalación en Servidor](#instalación-en-servidor)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Uso de la Aplicación](#uso-de-la-aplicación)

---

## 📖 Descripción

SOC Automation es una aplicación web que genera scripts de instalación automatizados para las principales herramientas de un Centro de Operaciones de Seguridad (SOC):

- **TheHive 5.3** - Plataforma de respuesta a incidentes
- **Cortex 3.1.8** - Motor de análisis y respuesta automatizada
- **MISP** - Plataforma de intercambio de inteligencia de amenazas
- **Wazuh SIEM** - Sistema de detección de intrusiones y monitoreo de seguridad

## ✨ Características

- 🐳 Instalación Docker automatizada para TheHive + Cortex + MISP
- 🖥️ Soporte multi-distribución para Wazuh (Ubuntu, Debian, AlmaLinux, CentOS 8, Oracle Linux 9, Arch Linux)
- ✅ Validación automática de requisitos del sistema (RAM, CPU, disco)
- 🔑 Contraseñas personalizables y API keys generadas automáticamente
- 🔥 Configuración automática de firewall (ufw/firewall-cmd)
- ⚡ Optimizaciones del kernel incluidas
- 📦 Descarga del código fuente completo como ZIP
- 🌐 Interfaz web moderna personalizada para despliegue ágil

## 💻 Requisitos del Sistema

### Para la aplicación web:
| Recurso | Mínimo |
|---------|--------|
| Node.js | 18.x o superior |
| npm | 9.x o superior |
| RAM | 512 MB |
| Disco | 500 MB |

### Para TheHive + Cortex + MISP:
| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 8 GB | 16 GB |
| CPU | 4 cores | 8 cores |
| Disco | 50 GB SSD | 100 GB SSD |

### Para Wazuh SIEM:
| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 cores | 4 cores |
| Disco | 30 GB SSD | 50 GB SSD |

---

## 🚀 Instalación Local

### Opción 1: Instalación manual

```bash
# 1. Clonar o descomprimir el proyecto
cd soc-automation-generator

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en **http://localhost:5173**

### Opción 2: Script de instalación automático

```bash
# Dar permisos de ejecución
chmod +x install-server.sh

# Ejecutar como root
sudo ./install-server.sh
```

El script `install-server.sh` realizará:
1. Detección automática de la distribución Linux
2. Instalación de Node.js 20.x LTS
3. Instalación de todas las dependencias npm
4. Compilación de la aplicación para producción
5. Instalación y configuración de Nginx como servidor web
6. Configuración del firewall
7. Creación de un servicio systemd para arranque automático
8. La app quedará operativa en **http://tu-ip**

---

## 🌐 Despliegue en Servidor de Producción

### Usando el script automático:
```bash
sudo ./install-server.sh
```

### Manualmente con Nginx:
```bash
# 1. Compilar para producción
npm run build

# 2. Copiar archivos al servidor web
sudo cp -r dist/* /var/www/html/

# 3. Configurar Nginx
sudo nano /etc/nginx/sites-available/soc-automation
```

Configuración Nginx:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/soc-automation;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🐙 Despliegue en GitHub Pages

### Paso 1: Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `soc-automation-generator`
3. Descripción: `Generador de scripts SOC - TheHive, Cortex, MISP y Wazuh | By Sistemas 127`
4. Selecciona **Público** (o Privado si prefieres)
5. Haz clic en **Create repository**

### Paso 2: Subir el código

```bash
git init
git add .
git commit -m "🛡️ SOC Automation Generator - Personalized Edition"
git remote add origin https://github.com/TU-USUARIO/soc-automation-generator.git
git branch -M main
git push -u origin main
```

### Paso 3: Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**

### Paso 4: Crear workflow de GitHub Actions

Crea el archivo `.github/workflows/deploy.yml` (ya incluido en el ZIP).

Haz push y espera a que el Action termine. Tu app estará en:
**https://TU-USUARIO.github.io/soc-automation-generator/**

---

## 📂 Estructura del Proyecto

```
soc-automation-generator/
├── public/
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── TheHiveConfigurator.tsx
│   │   ├── WazuhConfigurator.tsx
│   │   └── SystemRequirements.tsx
│   ├── lib/
│   │   ├── scriptGenerators.ts
│   │   ├── downloadSource.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── postcss.config.js
├── install-server.sh
├── .github/workflows/deploy.yml
├── LICENSE
└── README.md
```

---

## 🎮 Uso de la Aplicación

### Generar script de TheHive + Cortex + MISP:
1. Selecciona la pestaña **TheHive + Cortex + MISP**
2. Personaliza: nombre de organización, email, contraseñas y puertos
3. Regenera las API Keys si lo deseas
4. Haz clic en **Generar Script**
5. **⚠ COPIA LAS API KEYS** antes de continuar
6. Descarga el archivo `.sh`
7. Ejecuta en tu servidor Ubuntu 24.04: `sudo bash install-thehive-cortex-misp.sh`

### Generar script de Wazuh SIEM:
1. Selecciona la pestaña **Wazuh SIEM**
2. Elige tu distribución Linux y versión de Wazuh
3. Configura contraseña, puertos e IP del servidor
4. Haz clic en **Generar Script**
5. Descarga el archivo `.sh`
6. Ejecuta en tu servidor: `sudo bash install-wazuh-*.sh`

---

## 📧 Soporte

Si encuentras algún problema o tienes sugerencias, abre un **Issue** en el repositorio de GitHub.

---

*Mantained by Goyo DevSecOps*
