# Manual de Instalación: TheHive + Cortex + MISP
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
```bash
# Comprobar RAM disponible
free -h

# Comprobar espacio en disco
df -h /

# Comprobar tu IP en la red local
hostname -I
```

---

## 2. Ejecutar el script de instalación

### Paso 2.1: Descargar el script
Descarga el archivo `install-thehive-cortex-misp.sh` desde la web del generador.

### Paso 2.2: Dar permisos de ejecución
```bash
chmod +x install-thehive-cortex-misp.sh
```

### Paso 2.3: Ejecutar como root
```bash
sudo bash install-thehive-cortex-misp.sh
```

### ¿Qué hace el script?
1. Instala Docker y Docker Compose si no están instalados
2. Crea la carpeta `/opt/soc-automation/` con la estructura necesaria
3. Genera el fichero `/opt/soc-automation/docker/docker-compose.yml`
4. Descarga las imágenes Docker de todos los servicios
5. Arranca los contenedores
6. Configura el firewall (UFW) para abrir los puertos necesarios

### Tiempo estimado
- Primera instalación: 5-15 minutos (depende de la velocidad de internet)
- El script mostrará un resumen final con todas las URLs y credenciales

---

## 3. Verificar que los servicios funcionan

### Paso 3.1: Ver el estado de los contenedores
```bash
cd /opt/soc-automation/docker
docker compose ps
```

Deberías ver algo así:
```
NAME           STATUS         PORTS
cassandra      Up (healthy)   0.0.0.0:9042->9042/tcp
elasticsearch  Up             0.0.0.0:9200->9200/tcp
minio          Up             0.0.0.0:9002->9002/tcp
thehive        Up             0.0.0.0:9000->9000/tcp
cortex         Up             0.0.0.0:9001->9001/tcp
misp           Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
redis          Up
misp_mysql     Up
misp-modules   Up
```

### Paso 3.2: Si algún servicio no arranca
```bash
# Ver los logs de un servicio específico (ejemplo: thehive)
docker compose logs thehive

# Ver los logs de todos los servicios
docker compose logs -f

# Reiniciar un servicio
docker compose restart thehive
```

### Paso 3.3: Si Elasticsearch no arranca
Esto es muy común. Ejecuta:
```bash
# Comprobar que el parámetro del kernel está configurado
sysctl vm.max_map_count

# Si muestra un valor menor a 262144, ejecuta:
sudo sysctl -w vm.max_map_count=262144

# Hacerlo permanente:
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Reiniciar Elasticsearch:
cd /opt/soc-automation/docker
docker compose restart elasticsearch
```

---

## 4. Primer acceso a TheHive

### Paso 4.1: Abrir en el navegador
Desde cualquier equipo de tu red local, abre:
```
http://<IP_DEL_SERVIDOR>:9000
```

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
```
http://<IP_DEL_SERVIDOR>:9001
```

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
```
https://<IP_DEL_SERVIDOR>:443
```

> **Nota:** El certificado SSL es autofirmado. Tu navegador mostrará un aviso de seguridad.
> Haz clic en "Avanzado" → "Continuar" para aceptarlo.

### Paso 6.2: Credenciales por defecto
- **Usuario:** admin@soc.local
- **Contraseña:** Ch4ng3M3!S3cur3

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
Fichero: `/opt/soc-automation/docker/docker-compose.yml`

El script ya configura la conexión en la sección `thehive.command`:
```yaml
command:
  - "--cortex-port"
  - "9001"
  - "--cortex-keys"
  - "<CORTEX_API_KEY>"
```

### Paso 7.2: Actualizar la API Key de Cortex
1. Obtén la API Key de Cortex (paso 5.4)
2. Edita el docker-compose.yml:
```bash
sudo nano /opt/soc-automation/docker/docker-compose.yml
```
3. Busca la línea `"--cortex-keys"` y en la línea siguiente, sustituye el valor por tu API Key real
4. Guarda el fichero (Ctrl+O, Enter, Ctrl+X)
5. Reinicia TheHive:
```bash
cd /opt/soc-automation/docker
docker compose restart thehive
```

### Paso 7.3: Verificar la conexión
1. En TheHive, ve a **Admin → Platform Management**
2. En la sección **"Cortex"**, deberías ver el servidor conectado con estado verde
3. Si no aparece, revisa los logs: `docker compose logs thehive | grep -i cortex`

---

## 8. Conectar TheHive con MISP

### Paso 8.1: Qué fichero modificar
Fichero: `/opt/soc-automation/thehive/conf/application.conf`

### Paso 8.2: Crear el fichero de configuración
```bash
sudo nano /opt/soc-automation/thehive/conf/application.conf
```

Añade al final del fichero:
```
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
```

### Paso 8.3: Sustituir la API Key
Sustituye `<TU_MISP_API_KEY>` por la API Key que obtuviste en el paso 6.4.

### Paso 8.4: Reiniciar TheHive
```bash
cd /opt/soc-automation/docker
docker compose restart thehive
```

### Paso 8.5: Verificar
- En TheHive, las alertas de MISP empezarán a aparecer al cabo de unos minutos
- Comprueba los logs si hay errores: `docker compose logs thehive | grep -i misp`

---

## 9. Conectar Cortex con MISP (Analyzers)

Cortex puede usar MISP como fuente de inteligencia para sus análisis.

### Paso 9.1: Activar el analyzer MISP en Cortex
1. En Cortex, ve a **Organization → Analyzers**
2. Busca **"MISP"** en la lista
3. Haz clic en **"Enable"**
4. Configura:
   - **url:** `https://<IP_DEL_SERVIDOR>:443`
   - **key:** la API Key de MISP (paso 6.4)
   - **cert_check:** false (porque usamos certificado autofirmado)
5. Haz clic en **"Save"**

---

## 10. Solución de problemas

### Cassandra no arranca
```bash
# Comprobar logs
docker compose logs cassandra

# Si dice "insufficient memory", ajusta el límite:
# Edita docker-compose.yml y cambia mem_limit de cassandra
# Reinicia: docker compose up -d cassandra
```

### TheHive muestra "Service Unavailable"
Cassandra puede tardar 1-2 minutos en estar lista. Espera y recarga la página.
```bash
# Comprobar que Cassandra responde
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES;"
```

### MISP redirige a localhost
El script ya configura MISP con la IP correcta. Si aun así redirige:
```bash
# Entra en el contenedor de MISP
docker exec -it misp bash

# Edita la configuración
nano /var/www/MISP/app/Config/bootstrap.php
# Busca "baseurl" y cámbialo a https://<TU_IP>

# Sal del contenedor y reinicia
exit
docker compose restart misp
```

### Elasticsearch se corrompe
```bash
# Parar Elasticsearch
docker compose stop elasticsearch

# Borrar datos (CUIDADO: perderás índices)
docker volume rm docker_elasticsearchdata

# Reiniciar
docker compose up -d elasticsearch

# Espera 30 segundos y reinicia TheHive y Cortex
sleep 30
docker compose restart thehive cortex
```

### Reiniciar todo desde cero
```bash
cd /opt/soc-automation/docker
docker compose down -v  # -v borra también los volúmenes (datos)
docker compose up -d
```

### Comandos útiles
```bash
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
```

---

*Manual generado por SOC Automation - By Sistemas 127*
