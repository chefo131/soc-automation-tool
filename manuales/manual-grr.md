# Manual de Instalación: GRR Rapid Response
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

```bash
chmod +x install-grr.sh
sudo bash install-grr.sh
```

El script despliega GRR usando Docker con MySQL 8.0 como base de datos.

### Ficheros que crea el script
| Fichero | Descripción |
|---------|-------------|
| `/opt/grr/docker-compose.yml` | Docker Compose con GRR y MySQL |

---

## 3. Primer acceso

### Abrir en el navegador
```
http://<IP_DEL_SERVIDOR>:8443
```

### Credenciales
- **Usuario:** admin
- **Contraseña:** <TU_CONTRASEÑA>

---

## 4. Desplegar agentes

### Paso 4.1: Descargar los instaladores de agente
1. En la Admin UI, ve a **"Manage Binaries"** (menú superior)
2. Busca los binarios de agente para tu sistema operativo
3. Descarga el instalador correspondiente

### Paso 4.2: Instalar agente en Windows
1. Copia el archivo MSI al equipo Windows
2. Ejecuta como Administrador:
```cmd
msiexec /i grr-agent.msi /quiet FLEETSPEAK_SERVER=<IP_SERVIDOR_GRR>:8080
```

### Paso 4.3: Instalar agente en Linux
```bash
sudo dpkg -i grr-agent.deb
# O si es RPM:
sudo rpm -i grr-agent.rpm
```

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
```bash
cd /opt/grr
docker compose ps
docker compose logs grr-server
```

### MySQL no está listo
GRR espera a que MySQL pase el healthcheck. Si falla:
```bash
docker compose logs grr-mysql
# Espera 1-2 minutos y reinicia
docker compose restart grr-server
```

---

*Manual generado por SOC Automation - By Sistemas 127*
