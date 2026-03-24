# Manual de Instalación: Shuffle SOAR
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

```bash
chmod +x install-shuffle-soar.sh
sudo bash install-shuffle-soar.sh
```

---

## 3. Primer acceso

### Abrir en el navegador
```
http://<IP_DEL_SERVIDOR>:3001
```

### Credenciales
- **Usuario:** admin
- **Contraseña:** <TU_CONTRASEÑA>

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

Fichero a modificar: `/opt/soc-automation/thehive/conf/application.conf`

```bash
sudo nano /opt/soc-automation/thehive/conf/application.conf
```

Añade:
```
notification.webhook.endpoints = [
  {
    name: "Shuffle"
    url: "http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID>"
    version: 0
    wsConfig {}
    auth {
      type: none
    }
    includedTheHiveOrganisations: ["*"]
    excludedTheHiveOrganisations: []
  }
]
```

Reinicia TheHive:
```bash
cd /opt/soc-automation/docker && docker compose restart thehive
```

---

## 6. Integrar con Wazuh

### Qué fichero modificar
`/var/ossec/etc/ossec.conf` (en el servidor Wazuh)

### Paso 6.1: Añadir integración
```bash
sudo nano /var/ossec/etc/ossec.conf
```

Añade ANTES de `</ossec_config>`:
```xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>3</level>
</integration>
```

### Paso 6.2: Reiniciar Wazuh
```bash
sudo systemctl restart wazuh-manager
```

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
   - **Hash/IP:** usa la variable del webhook, ej: `$exec.all_fields.data.srcip`

---

## 8. Solución de problemas

### Shuffle no arranca
```bash
cd /opt/shuffle
docker compose ps
docker compose logs shuffle-backend
```

### Los workflows no se ejecutan
```bash
# Verificar que orborus está corriendo (es el ejecutor de workflows)
docker compose logs shuffle-orborus

# Reiniciar orborus
docker compose restart shuffle-orborus
```

### Limpiar y reinstalar
```bash
cd /opt/shuffle
docker compose down -v
docker compose up -d
```

---

*Manual generado por SOC Automation - By Sistemas 127*
