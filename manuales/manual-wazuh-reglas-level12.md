# Manual: Reglas Personalizadas de Wazuh (Level 12+)
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
```bash
chmod +x install-wazuh-rules.sh
sudo bash install-wazuh-rules.sh
```

### ¿Qué hace el script?
1. Verifica que Wazuh está instalado en `/var/ossec`
2. Crea un backup del fichero de reglas existente
3. Añade las reglas seleccionadas a `/var/ossec/etc/rules/local_rules.xml`
4. Verifica la sintaxis con `wazuh-analysisd -t`
5. Si hay errores de sintaxis, restaura el backup automáticamente
6. Reinicia Wazuh Manager para aplicar las reglas
7. Opcionalmente configura integraciones con TheHive y Shuffle

---

## 3. Estructura de reglas instaladas

### Fichero principal
```
/var/ossec/etc/rules/local_rules.xml
```

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
- Proceso que no aparece con `ps` pero existe en /proc
- Técnica habitual de rootkits

**Regla 100022** - Puerto Oculto (Level 13)
- Puerto de red que escucha pero no aparece en `netstat`
- Posible backdoor

### 4.3 Integridad de Ficheros (100030-100037)

Para que estas reglas funcionen, Syscheck (FIM) debe estar habilitado.

**Verificar que Syscheck está activo:**
```bash
grep -A10 "<syscheck>" /var/ossec/etc/ossec.conf
```

**Debe incluir los directorios críticos:**
```xml
<syscheck>
  <directories realtime="yes">/etc,/usr/bin,/usr/sbin,/bin,/sbin</directories>
  <directories realtime="yes">/tmp,/var/tmp</directories>
</syscheck>
```

**Si no están, añádelos:**

Fichero: `/var/ossec/etc/ossec.conf`
```bash
sudo nano /var/ossec/etc/ossec.conf
```

Busca la sección `<syscheck>` y añade las líneas de `<directories>` dentro.

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
- PowerShell con `-EncodedCommand` o `-WindowStyle Hidden`
- Técnica muy común en malware para Windows

**Regla 100056** - Cryptominer (Level 14)
- Detecta xmrig, stratum+tcp y otros indicadores de minería

### 4.6 Red (100060-100064)

**Regla 100060** - Port Scan (Level 12)
- 15+ conexiones rechazadas en 30 segundos desde la misma IP

### 4.7 Cumplimiento (100070-100075)

**Regla 100071** - Borrado de Logs (Level 14)
- Detecta `rm /var/log`, `truncate`, `shred`
- Anti-forense: alguien intenta borrar evidencias

**Regla 100074** - Firewall Desactivado (Level 14)
- `ufw disable`, `iptables -F`, etc.
- El sistema queda expuesto

### 4.8 Active Directory y Windows Server (100080-100095)

**Requisitos:** Estas reglas requieren que los Domain Controllers envíen sus logs al Wazuh Manager a través del agente de Wazuh. Los EventIDs clave son: 4662, 4768, 4769, 4741, 4742, 5136, 7045.

**Configurar la auditoría avanzada en el DC:**
\`\`\`powershell
# Habilitar auditoría de Directory Service Access
auditpol /set /subcategory:"Directory Service Access" /success:enable /failure:enable
# Habilitar auditoría de cambios en Directory Service
auditpol /set /subcategory:"Directory Service Changes" /success:enable /failure:enable
# Habilitar auditoría de Kerberos
auditpol /set /subcategory:"Kerberos Authentication Service" /success:enable /failure:enable
auditpol /set /subcategory:"Kerberos Service Ticket Operations" /success:enable /failure:enable
\`\`\`

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

Fichero: `/var/ossec/etc/ossec.conf`

```bash
sudo nano /var/ossec/etc/ossec.conf
```

Añade ANTES de `</ossec_config>`:
```xml
<integration>
  <name>thehive</name>
  <hook_url>http://<IP_THEHIVE>:9000/api/alert</hook_url>
  <api_key><TU_API_KEY></api_key>
  <alert_format>json</alert_format>
  <level>12</level>
</integration>
```

> Con `<level>12</level>`, solo se envían a TheHive las alertas de nivel 12 o superior (las reglas que acabamos de instalar).

### Configurar envío a Shuffle SOAR

```xml
<integration>
  <name>shuffle</name>
  <hook_url>http://<IP_SHUFFLE>:3001/api/v1/hooks/<WEBHOOK_ID></hook_url>
  <alert_format>json</alert_format>
  <level>12</level>
</integration>
```

Reinicia después:
```bash
sudo systemctl restart wazuh-manager
```

---

## 6. Personalizar reglas

### Añadir una nueva regla

Fichero: `/var/ossec/etc/rules/local_rules.xml`

```bash
sudo nano /var/ossec/etc/rules/local_rules.xml
```

Ejemplo: detectar acceso SSH desde un país específico (requiere GeoIP):
```xml
<rule id="100080" level="13">
  <if_sid>5715</if_sid>
  <geoip_srcip>CN|RU|KP</geoip_srcip>
  <description>Login SSH desde país de alto riesgo</description>
  <group>ssh,geolocation,</group>
</rule>
```

### Modificar el nivel de una regla existente
```xml
<!-- Subir la regla 5710 de nivel 5 a nivel 8 -->
<rule id="100081" level="8">
  <if_sid>5710</if_sid>
  <description>SSH: intento de login fallido (nivel aumentado)</description>
</rule>
```

### Verificar sintaxis SIEMPRE antes de reiniciar
```bash
/var/ossec/bin/wazuh-analysisd -t
```

Si la salida dice "Configuration OK", reinicia:
```bash
sudo systemctl restart wazuh-manager
```

---

## 7. Gestionar reglas

### Ver todas las reglas personalizadas
```bash
cat /var/ossec/etc/rules/local_rules.xml
```

### Buscar una regla específica
```bash
grep -A5 "100012" /var/ossec/etc/rules/local_rules.xml
```

### Ver alertas en tiempo real
```bash
# Alertas en formato JSON
tail -f /var/ossec/logs/alerts/alerts.json | jq .

# Solo alertas nivel 12+
tail -f /var/ossec/logs/alerts/alerts.json | jq 'select(.rule.level >= 12)'
```

### Desactivar una regla temporalmente
Añade al fichero local_rules.xml:
```xml
<rule id="100010" level="0">
  <if_sid>5710</if_sid>
  <description>Regla desactivada temporalmente</description>
</rule>
```

### Restaurar reglas originales
```bash
# Ver backups disponibles
ls -la /var/ossec/etc/rules/local_rules.xml.bak.*

# Restaurar el último backup
cp /var/ossec/etc/rules/local_rules.xml.bak.<FECHA> /var/ossec/etc/rules/local_rules.xml
systemctl restart wazuh-manager
```

---

## 8. Solución de problemas

### Error de sintaxis al reiniciar
```bash
# Ver el error exacto
/var/ossec/bin/wazuh-analysisd -t 2>&1

# Errores comunes:
# - Falta cerrar una etiqueta XML
# - ID de regla duplicado
# - if_sid referencia una regla que no existe
```

### Las reglas no generan alertas
```bash
# Verificar que las reglas están cargadas
/var/ossec/bin/wazuh-analysisd -t 2>&1 | grep "100010"

# Simular una alerta
/var/ossec/bin/wazuh-logtest
# Pega un log de ejemplo y verifica qué regla dispara
```

### Probar una regla con wazuh-logtest
```bash
/var/ossec/bin/wazuh-logtest
```

Pega este ejemplo para probar la regla de fuerza bruta SSH:
```
Dec 10 12:00:00 server sshd[12345]: Failed password for root from 192.168.1.100 port 22 ssh2
```

---

*Manual generado por SOC Automation - By Sistemas 127*
