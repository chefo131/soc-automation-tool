# Manual de Instalación: Velociraptor
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

```bash
chmod +x install-velociraptor.sh
sudo bash install-velociraptor.sh
```

El script descarga Velociraptor como binario nativo (no usa Docker), genera la configuración y crea un servicio systemd.

### Ficheros que crea el script
| Fichero | Descripción |
|---------|-------------|
| `/opt/velociraptor/velociraptor` | Binario ejecutable |
| `/opt/velociraptor/server.config.yaml` | Configuración del servidor |
| `/opt/velociraptor/client.config.yaml` | Configuración para los agentes |
| `/etc/systemd/system/velociraptor.service` | Servicio systemd |
| `/opt/velociraptor/clients/` | Instaladores empaquetados para agentes |

---

## 3. Primer acceso a la GUI

### Abrir en el navegador
```
https://<IP_DEL_SERVIDOR>:8889
```

> Certificado autofirmado. Acepta el aviso del navegador.

### Credenciales
- **Usuario:** admin
- **Contraseña:** <TU_CONTRASEÑA>

---

## 4. Desplegar agentes en endpoints

### 4.1 Obtener la configuración del agente
El fichero que necesitas copiar al endpoint es:
```
/opt/velociraptor/client.config.yaml
```

### 4.2 En Linux (endpoint)
```bash
# Copiar el binario y la config al endpoint
scp usuario@<IP_SERVIDOR>:/opt/velociraptor/velociraptor ./
scp usuario@<IP_SERVIDOR>:/opt/velociraptor/client.config.yaml ./

# Ejecutar como agente
sudo ./velociraptor --config client.config.yaml client -v

# Para dejarlo como servicio:
sudo ./velociraptor --config client.config.yaml service install
```

### 4.3 En Windows (endpoint)
1. Copia `velociraptor.exe` (descárgalo de GitHub para Windows) y `client.config.yaml` al PC
2. Abre CMD como Administrador:
```cmd
velociraptor.exe --config client.config.yaml service install
```

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
   - `Windows.EventLogs.Evtx` - Logs de eventos de Windows
   - `Linux.Sys.Users` - Usuarios del sistema Linux
   - `Generic.Client.Info` - Información general del endpoint
4. Selecciona los endpoints objetivo
5. Haz clic en **"Launch"**

### 5.2 Ver resultados
1. Haz clic en el Hunt que acabas de lanzar
2. Ve a la pestaña **"Results"**
3. Los datos se muestran en formato tabla

---

## 6. Integrar con TheHive

### Paso 6.1: Configurar Server Monitoring en Velociraptor

Fichero a modificar: `/opt/velociraptor/server.config.yaml`

```bash
sudo nano /opt/velociraptor/server.config.yaml
```

No es necesario modificar este fichero directamente. La integración se hace desde la GUI.

### Paso 6.2: Usar Shuffle como intermediario (recomendado)
1. En Velociraptor GUI, ve a **"Server Artifacts"** → **"Server.Monitor.Health"**
2. Configura un evento personalizado que envíe datos a un webhook
3. En Shuffle SOAR, crea un workflow:
   - Trigger: Webhook (recibe datos de Velociraptor)
   - Acción: crear alerta en TheHive con los datos recibidos

### Paso 6.3: Script directo con API de TheHive
Crea un script en el servidor Velociraptor:

```bash
sudo nano /opt/velociraptor/thehive-alert.sh
```

```bash
#!/bin/bash
# Enviar alerta a TheHive
curl -X POST "http://<IP_THEHIVE>:9000/api/alert" \
  -H "Authorization: Bearer <THEHIVE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "velociraptor",
    "source": "Velociraptor",
    "sourceRef": "'"$(date +%s)"'",
    "title": "Alerta Velociraptor: '"$1"'",
    "description": "'"$2"'",
    "severity": 2,
    "tlp": 2
  }'
```

---

## 7. Solución de problemas

### El servicio no arranca
```bash
sudo systemctl status velociraptor
sudo journalctl -u velociraptor -f

# Verificar que el puerto no está ocupado
ss -tlnp | grep 8889
```

### No puedo acceder desde otro equipo
```bash
# Verificar que escucha en 0.0.0.0
ss -tlnp | grep 8889

# Si dice 127.0.0.1, edita la configuración:
sudo nano /opt/velociraptor/server.config.yaml
# Busca "bind_address" y cámbialo a "0.0.0.0"
sudo systemctl restart velociraptor
```

### El agente no conecta
Verifica que:
1. El puerto 8000 está abierto en el firewall del servidor
2. El endpoint puede alcanzar la IP del servidor
3. El fichero client.config.yaml tiene la IP correcta

---

*Manual generado por SOC Automation - By Sistemas 127*
