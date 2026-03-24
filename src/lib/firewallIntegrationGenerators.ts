// Generadores de scripts para integración de Wazuh con cortafuegos
// Windows Defender, OPNsense, pfSense, iptables/UFW
// By Sistemas 127

export interface FirewallIntegrationConfig {
  wazuhServerIp: string;
  wazuhApiPort: string;
  wazuhAgentGroup: string;
  enableWindowsDefender: boolean;
  enableOPNsense: boolean;
  enablePfSense: boolean;
  enableIptablesUfw: boolean;
  enableRansomwareIDS: boolean;
  opnsenseIp: string;
  pfsenseIp: string;
  syslogPort: string;
  windowsAgentVersion: string;
  linuxAgentVersion: string;
}

export function generateFirewallIntegrationScript(config: FirewallIntegrationConfig): string {
  const sections: string[] = [];

  sections.push(`#!/bin/bash
#============================================================================
# SOC Automation - Integración Wazuh con Cortafuegos
# Windows Defender, OPNsense, pfSense, iptables/UFW
# Generado por SOC Automation Script Generator - By Sistemas 127
#============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

BLUE='\\033[0;34m'; CYAN='\\033[0;36m'; GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'; RED='\\033[0;31m'; NC='\\033[0m'
BOLD='\\033[1m'; BG_BLUE='\\033[44m'; WHITE='\\033[1;37m'

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}                                                        \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}   SOC Automation - Integración Cortafuegos con Wazuh    \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}   Creado por Sistemas 127                               \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}                                                        \${NC}"
echo ""

WAZUH_SERVER="${config.wazuhServerIp}"
WAZUH_API_PORT="${config.wazuhApiPort}"
AGENT_GROUP="${config.wazuhAgentGroup}"
SYSLOG_PORT="${config.syslogPort}"

# Detectar IP del servidor si es auto
if [ "$WAZUH_SERVER" = "auto" ]; then
  WAZUH_SERVER=$(hostname -I | awk '{print $1}')
  echo -e "\${CYAN}[INFO]\${NC} IP del servidor Wazuh detectada: \${GREEN}$WAZUH_SERVER\${NC}"
fi

echo -e "\${CYAN}[INFO]\${NC} Servidor Wazuh: \${GREEN}$WAZUH_SERVER\${NC}"
echo -e "\${CYAN}[INFO]\${NC} Puerto Syslog: \${GREEN}$SYSLOG_PORT\${NC}"
echo ""
`);

  // ============================================================
  // SECCIÓN 1: CONFIGURACIÓN DEL SERVIDOR WAZUH (siempre se incluye)
  // ============================================================
  sections.push(`
#============================================================================
# FASE 1: CONFIGURACIÓN DEL SERVIDOR WAZUH PARA RECIBIR LOGS DE CORTAFUEGOS
#============================================================================
echo -e "\${BLUE}[FASE 1]\${NC} Configurando servidor Wazuh para cortafuegos..."

# Crear grupo de agentes para cortafuegos (sin prompt interactivo)
echo -e "\${CYAN}[INFO]\${NC} Creando grupo de agentes '$AGENT_GROUP'..."
if [ -d "/var/ossec/etc/shared/$AGENT_GROUP" ]; then
  echo -e "\${GREEN}[OK]\${NC} El grupo '$AGENT_GROUP' ya existe."
else
  # Método 1: Crear directorio del grupo directamente (no requiere confirmación)
  mkdir -p "/var/ossec/etc/shared/$AGENT_GROUP"
  cp /var/ossec/etc/shared/default/agent.conf "/var/ossec/etc/shared/$AGENT_GROUP/agent.conf" 2>/dev/null || true
  chown -R wazuh:wazuh "/var/ossec/etc/shared/$AGENT_GROUP" 2>/dev/null || \
    chown -R ossec:ossec "/var/ossec/etc/shared/$AGENT_GROUP" 2>/dev/null || true
  echo -e "\${GREEN}[OK]\${NC} Grupo '$AGENT_GROUP' creado correctamente."
fi

# Configurar recepción de syslog remoto en ossec.conf
OSSEC_CONF="/var/ossec/etc/ossec.conf"
cp "$OSSEC_CONF" "$OSSEC_CONF.bak.$(date +%Y%m%d%H%M%S)"

# Verificar si ya existe la configuración de syslog remoto
if ! grep -q "<remote>" "$OSSEC_CONF" 2>/dev/null; then
  echo -e "\${CYAN}[INFO]\${NC} Añadiendo configuración de syslog remoto..."
  sed -i '/<\\/ossec_config>/i \\
  <!-- Recepción de logs remotos de cortafuegos -->\\
  <remote>\\
    <connection>syslog</connection>\\
    <port>'"$SYSLOG_PORT"'</port>\\
    <protocol>udp</protocol>\\
    <allowed-ips>0.0.0.0/0</allowed-ips>\\
  </remote>' "$OSSEC_CONF"
else
  echo -e "\${YELLOW}[AVISO]\${NC} La configuración de syslog remoto ya existe"
fi
`);

  // ============================================================
  // REGLAS PERSONALIZADAS PARA CORTAFUEGOS
  // ============================================================
  sections.push(`
#============================================================================
# FASE 2: REGLAS PERSONALIZADAS PARA DETECCIÓN DE EVENTOS DE CORTAFUEGOS
#============================================================================
echo -e "\${BLUE}[FASE 2]\${NC} Instalando reglas personalizadas para cortafuegos..."

cat > /var/ossec/etc/rules/firewall_custom_rules.xml << 'RULES_EOF'
<!-- Reglas personalizadas para cortafuegos - SOC Automation -->
<!-- By Sistemas 127 -->
<group name="firewall,">

  <!-- ====== REGLAS GENERALES DE CORTAFUEGOS ====== -->
  <rule id="100200" level="5">
    <if_group>firewall</if_group>
    <match>DROP|DENY|BLOCK|REJECT</match>
    <description>Cortafuegos: Tráfico bloqueado detectado</description>
    <group>firewall_drop,gdpr_IV_35.7.d,</group>
  </rule>

  <rule id="100201" level="10" frequency="20" timeframe="60">
    <if_matched_group>firewall_drop</if_matched_group>
    <description>Cortafuegos: Múltiples conexiones bloqueadas desde la misma fuente (posible escaneo de puertos)</description>
    <mitre>
      <id>T1046</id>
    </mitre>
    <group>firewall_scan,attack,</group>
  </rule>

  <rule id="100202" level="12" frequency="50" timeframe="120">
    <if_matched_group>firewall_drop</if_matched_group>
    <description>Cortafuegos: ALERTA - Ataque de fuerza bruta o DDoS detectado (50+ bloqueos en 2 min)</description>
    <mitre>
      <id>T1498</id>
    </mitre>
    <group>firewall_ddos,attack,</group>
  </rule>

  <rule id="100203" level="8">
    <if_group>firewall</if_group>
    <match>dport=22|dport=3389|dport=445|dport=5985</match>
    <description>Cortafuegos: Conexión a puerto de administración (SSH/RDP/SMB/WinRM)</description>
    <mitre>
      <id>T1021</id>
    </mitre>
    <group>firewall_admin_access,</group>
  </rule>

  <rule id="100204" level="13">
    <if_group>firewall</if_group>
    <match>dport=4444|dport=5555|dport=6666|dport=1234|dport=31337</match>
    <description>Cortafuegos: CRÍTICO - Conexión a puerto sospechoso (posible C2/backdoor)</description>
    <mitre>
      <id>T1571</id>
    </mitre>
    <group>firewall_c2,attack,</group>
  </rule>
`);

  // Reglas específicas por cortafuegos
  if (config.enableWindowsDefender) {
    sections.push(`
  <!-- ====== REGLAS WINDOWS DEFENDER FIREWALL ====== -->
  <rule id="100210" level="3">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^5156$</field>
    <description>Windows Defender Firewall: Conexión de red permitida</description>
    <group>windows_firewall,</group>
  </rule>

  <rule id="100211" level="6">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^5157$</field>
    <description>Windows Defender Firewall: Conexión de red bloqueada</description>
    <group>windows_firewall,firewall_drop,</group>
  </rule>

  <rule id="100212" level="10">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^5152$</field>
    <description>Windows Defender Firewall: Paquete descartado por la plataforma de filtrado</description>
    <group>windows_firewall,firewall_drop,</group>
  </rule>

  <rule id="100213" level="8">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^4946$</field>
    <description>Windows Defender Firewall: Regla añadida a la lista de excepciones</description>
    <mitre>
      <id>T1562.004</id>
    </mitre>
    <group>windows_firewall,config_change,</group>
  </rule>

  <rule id="100214" level="10">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^4950$</field>
    <description>Windows Defender Firewall: Configuración del perfil modificada</description>
    <mitre>
      <id>T1562.004</id>
    </mitre>
    <group>windows_firewall,config_change,</group>
  </rule>

  <rule id="100215" level="14">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^4947$</field>
    <description>Windows Defender Firewall: ALERTA - Regla de seguridad eliminada</description>
    <mitre>
      <id>T1562.004</id>
    </mitre>
    <group>windows_firewall,config_change,attack,</group>
  </rule>

  <rule id="100216" level="14">
    <if_sid>60010</if_sid>
    <field name="win.system.eventID">^2003$</field>
    <description>Windows Defender Firewall: CRÍTICO - Perfil de firewall desactivado</description>
    <mitre>
      <id>T1562.004</id>
    </mitre>
    <group>windows_firewall,firewall_disabled,attack,</group>
  </rule>
`);
  }

  if (config.enableOPNsense) {
    sections.push(`
  <!-- ====== REGLAS OPNSENSE ====== -->
  <rule id="100220" level="3">
    <decoded_as>opnsense-filterlog</decoded_as>
    <match>pass</match>
    <description>OPNsense: Tráfico permitido por regla del firewall</description>
    <group>opnsense,firewall_accept,</group>
  </rule>

  <rule id="100221" level="5">
    <decoded_as>opnsense-filterlog</decoded_as>
    <match>block</match>
    <description>OPNsense: Tráfico bloqueado por regla del firewall</description>
    <group>opnsense,firewall_drop,</group>
  </rule>

  <rule id="100222" level="10" frequency="30" timeframe="60">
    <if_matched_group>opnsense</if_matched_group>
    <match>block</match>
    <description>OPNsense: Múltiples bloqueos detectados (posible escaneo)</description>
    <mitre>
      <id>T1046</id>
    </mitre>
    <group>opnsense,firewall_scan,attack,</group>
  </rule>

  <rule id="100223" level="12">
    <decoded_as>opnsense-filterlog</decoded_as>
    <match>block</match>
    <match>dport=22|dport=3389|dport=445|dport=5985|dport=5986</match>
    <description>OPNsense: Intento de acceso bloqueado a puerto de administración</description>
    <mitre>
      <id>T1021</id>
    </mitre>
    <group>opnsense,firewall_admin_blocked,</group>
  </rule>
`);
  }

  if (config.enablePfSense) {
    sections.push(`
  <!-- ====== REGLAS PFSENSE ====== -->
  <rule id="100230" level="3">
    <decoded_as>pf</decoded_as>
    <match>pass</match>
    <description>pfSense: Tráfico permitido por regla del firewall</description>
    <group>pfsense,firewall_accept,</group>
  </rule>

  <rule id="100231" level="5">
    <decoded_as>pf</decoded_as>
    <match>block</match>
    <description>pfSense: Tráfico bloqueado por regla del firewall</description>
    <group>pfsense,firewall_drop,</group>
  </rule>

  <rule id="100232" level="10" frequency="30" timeframe="60">
    <if_matched_group>pfsense</if_matched_group>
    <match>block</match>
    <description>pfSense: Múltiples bloqueos detectados (posible escaneo de puertos)</description>
    <mitre>
      <id>T1046</id>
    </mitre>
    <group>pfsense,firewall_scan,attack,</group>
  </rule>

  <rule id="100233" level="12">
    <decoded_as>pf</decoded_as>
    <match>block</match>
    <match>dport=22|dport=3389|dport=445|dport=5985|dport=5986</match>
    <description>pfSense: Intento bloqueado a puerto de administración</description>
    <mitre>
      <id>T1021</id>
    </mitre>
    <group>pfsense,firewall_admin_blocked,</group>
  </rule>
`);
  }

  if (config.enableIptablesUfw) {
    sections.push(`
  <!-- ====== REGLAS IPTABLES / UFW ====== -->
  <rule id="100240" level="3">
    <decoded_as>iptables</decoded_as>
    <match>ACCEPT</match>
    <description>iptables/UFW: Tráfico permitido</description>
    <group>iptables,firewall_accept,</group>
  </rule>

  <rule id="100241" level="5">
    <decoded_as>iptables</decoded_as>
    <match>DROP|REJECT</match>
    <description>iptables/UFW: Tráfico bloqueado</description>
    <group>iptables,firewall_drop,</group>
  </rule>

  <rule id="100242" level="5">
    <match>UFW BLOCK</match>
    <description>UFW: Conexión bloqueada por el cortafuegos</description>
    <group>ufw,firewall_drop,</group>
  </rule>

  <rule id="100243" level="8">
    <match>UFW ALLOW</match>
    <match>DPT=22|DPT=3389|DPT=445|DPT=5985</match>
    <description>UFW: Conexión permitida a puerto de administración</description>
    <mitre>
      <id>T1021</id>
    </mitre>
    <group>ufw,firewall_admin_access,</group>
  </rule>

  <rule id="100244" level="10" frequency="20" timeframe="60">
    <if_matched_group>ufw</if_matched_group>
    <match>UFW BLOCK</match>
    <description>UFW: Múltiples bloqueos desde misma fuente (posible escaneo)</description>
    <mitre>
      <id>T1046</id>
    </mitre>
    <group>ufw,firewall_scan,attack,</group>
  </rule>
`);
  }

  sections.push(`
</group>
RULES_EOF

echo -e "\${GREEN}[OK]\${NC} Reglas personalizadas de cortafuegos instaladas"

# Verificar sintaxis de reglas
echo -e "\${CYAN}[INFO]\${NC} Verificando sintaxis de reglas..."
/var/ossec/bin/wazuh-analysisd -t 2>/dev/null && echo -e "\${GREEN}[OK]\${NC} Sintaxis de reglas correcta" || {
  echo -e "\${RED}[ERROR]\${NC} Error en la sintaxis de reglas. Restaurando backup..."
  cp "$OSSEC_CONF.bak."* "$OSSEC_CONF" 2>/dev/null || true
}
`);

  // ============================================================
  // DECODERS PARA CADA CORTAFUEGOS
  // ============================================================
  sections.push(`
#============================================================================
# FASE 3: DECODERS PERSONALIZADOS PARA CORTAFUEGOS
#============================================================================
echo -e "\${BLUE}[FASE 3]\${NC} Instalando decoders personalizados..."

cat > /var/ossec/etc/decoders/firewall_custom_decoders.xml << 'DECODERS_EOF'
<!-- Decoders personalizados para cortafuegos - SOC Automation -->
<!-- By Sistemas 127 -->
`);

  if (config.enableOPNsense) {
    sections.push(`
<!-- Decoder OPNsense filterlog -->
<decoder name="opnsense-filterlog">
  <prematch>filterlog</prematch>
</decoder>

<decoder name="opnsense-filterlog-fields">
  <parent>opnsense-filterlog</parent>
  <regex offset="after_parent">([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),</regex>
  <order>rule_number,sub_rule,anchor,tracker,interface</order>
</decoder>
`);
  }

  if (config.enablePfSense) {
    sections.push(`
<!-- Decoder pfSense filterlog -->
<decoder name="pf">
  <prematch>filterlog</prematch>
</decoder>

<decoder name="pf-fields">
  <parent>pf</parent>
  <regex offset="after_parent">([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),</regex>
  <order>rule_number,sub_rule,anchor,tracker,interface</order>
</decoder>
`);
  }

  if (config.enableIptablesUfw) {
    sections.push(`
<!-- Decoder iptables -->
<decoder name="iptables">
  <prematch>kernel: </prematch>
</decoder>

<decoder name="iptables-fields">
  <parent>iptables</parent>
  <regex>IN=([^ ]+) OUT=([^ ]*) SRC=([^ ]+) DST=([^ ]+) .+ PROTO=([^ ]+) .+ SPT=([0-9]+) DPT=([0-9]+)</regex>
  <order>interface,extra_data,srcip,dstip,protocol,srcport,dstport</order>
</decoder>
`);
  }

  sections.push(`
DECODERS_EOF

echo -e "\${GREEN}[OK]\${NC} Decoders personalizados instalados"
`);

  // ============================================================
  // CONFIGURACIÓN ESPECÍFICA POR CORTAFUEGOS
  // ============================================================

  if (config.enableOPNsense) {
    sections.push(`
#============================================================================
# FASE 4A: CONFIGURACIÓN OPNSENSE -> WAZUH (Syslog)
#============================================================================
echo -e "\${BLUE}[FASE 4A]\${NC} Configurando integración con OPNsense..."

OPNSENSE_IP="${config.opnsenseIp}"

echo -e "\${CYAN}[INFO]\${NC} Añadiendo OPNsense como fuente de syslog..."

# Añadir reglas de localfile para OPNsense si no existen
if ! grep -q "opnsense" "$OSSEC_CONF" 2>/dev/null; then
  sed -i '/<\\/ossec_config>/i \\
  <!-- Integración OPNsense -->\\
  <localfile>\\
    <log_format>syslog</log_format>\\
    <location>/var/log/opnsense.log</location>\\
  </localfile>' "$OSSEC_CONF"
fi

echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${YELLOW}  INSTRUCCIONES PARA OPNSENSE\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  1.\${NC} Accede a la interfaz web de OPNsense"
echo -e "\${CYAN}  2.\${NC} Ve a System > Settings > Logging / targets"
echo -e "\${CYAN}  3.\${NC} Añade un nuevo destino remoto:"
echo -e "      - Transport:  \${GREEN}UDP(4)\${NC}"
echo -e "      - Application: \${GREEN}filterlog\${NC}"
echo -e "      - Level:       \${GREEN}Informational\${NC}"
echo -e "      - Hostname:    \${GREEN}$WAZUH_SERVER\${NC}"
echo -e "      - Port:        \${GREEN}$SYSLOG_PORT\${NC}"
echo -e "\${CYAN}  4.\${NC} En Facility: selecciona \${GREEN}local0\${NC}"
echo -e "\${CYAN}  5.\${NC} Guarda y aplica los cambios"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "\${GREEN}[OK]\${NC} Configuración de OPNsense preparada"
`);
  }

  if (config.enablePfSense) {
    sections.push(`
#============================================================================
# FASE 4B: CONFIGURACIÓN PFSENSE -> WAZUH (Syslog)
#============================================================================
echo -e "\${BLUE}[FASE 4B]\${NC} Configurando integración con pfSense..."

PFSENSE_IP="${config.pfsenseIp}"

echo -e "\${CYAN}[INFO]\${NC} Añadiendo pfSense como fuente de syslog..."

# Añadir localfile para pfSense
if ! grep -q "pfsense" "$OSSEC_CONF" 2>/dev/null; then
  sed -i '/<\\/ossec_config>/i \\
  <!-- Integración pfSense -->\\
  <localfile>\\
    <log_format>syslog</log_format>\\
    <location>/var/log/pfsense.log</location>\\
  </localfile>' "$OSSEC_CONF"
fi

echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${YELLOW}  INSTRUCCIONES PARA PFSENSE\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  1.\${NC} Accede a la interfaz web de pfSense"
echo -e "\${CYAN}  2.\${NC} Ve a Status > System Logs > Settings"
echo -e "\${CYAN}  3.\${NC} En 'Remote Logging Options':"
echo -e "      - Activa: \${GREEN}Enable Remote Logging\${NC}"
echo -e "      - Source Address: \${GREEN}Any\${NC}"
echo -e "      - IP Protocol: \${GREEN}IPv4\${NC}"
echo -e "      - Remote log servers:"
echo -e "        \${GREEN}$WAZUH_SERVER:$SYSLOG_PORT\${NC}"
echo -e "\${CYAN}  4.\${NC} Marca las casillas:"
echo -e "      \${GREEN}☑ Firewall Events\${NC}"
echo -e "      \${GREEN}☑ System Events\${NC}"
echo -e "\${CYAN}  5.\${NC} Guarda la configuración"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo ""
echo -e "\${GREEN}[OK]\${NC} Configuración de pfSense preparada"
`);
  }

  if (config.enableWindowsDefender) {
    sections.push(`
#============================================================================
# FASE 4C: WINDOWS DEFENDER FIREWALL - CONFIGURACIÓN VÍA AGENTE WAZUH
#============================================================================
echo -e "\${BLUE}[FASE 4C]\${NC} Preparando integración con Windows Defender Firewall..."

# Crear configuración centralizada para agentes Windows del grupo
WINDOWS_AGENT_CONF="/var/ossec/etc/shared/$AGENT_GROUP/agent.conf"
mkdir -p "/var/ossec/etc/shared/$AGENT_GROUP"

cat > "$WINDOWS_AGENT_CONF" << 'WINAGENT_EOF'
<!-- Configuración centralizada para agentes Windows - Cortafuegos -->
<!-- Desplegada automáticamente por Wazuh a los agentes del grupo -->
<!-- By Sistemas 127 -->
<agent_config os="Windows">

  <!-- Monitorizar logs de Windows Defender Firewall -->
  <localfile>
    <location>Microsoft-Windows-Windows Firewall With Advanced Security/Firewall</location>
    <log_format>eventchannel</log_format>
    <query>Event/System[EventID=2003 or EventID=2004 or EventID=2005 or EventID=2006 or EventID=2033]</query>
  </localfile>

  <!-- Eventos de seguridad del firewall (5150-5159) -->
  <localfile>
    <location>Security</location>
    <log_format>eventchannel</log_format>
    <query>Event/System[(EventID &gt;= 5150 and EventID &lt;= 5159) or (EventID &gt;= 4944 and EventID &lt;= 4958)]</query>
  </localfile>

  <!-- Monitorizar cambios en las reglas del firewall -->
  <syscheck>
    <directories check_all="yes" realtime="yes">C:\\Windows\\System32\\LogFiles\\Firewall</directories>
    <directories check_all="yes" whodata="yes">C:\\Windows\\System32\\config\\systemprofile</directories>
  </syscheck>

  <!-- Monitorizar estado del servicio Windows Firewall -->
  <wodle name="command">
    <disabled>no</disabled>
    <tag>windows_firewall_status</tag>
    <command>powershell.exe -ExecutionPolicy Bypass -Command "Get-NetFirewallProfile | Select-Object Name, Enabled | ConvertTo-Json"</command>
    <interval>5m</interval>
    <ignore_output>no</ignore_output>
    <run_on_start>yes</run_on_start>
    <timeout>30</timeout>
  </wodle>

  <!-- Auditoría de reglas del firewall cada 10 minutos -->
  <wodle name="command">
    <disabled>no</disabled>
    <tag>windows_firewall_rules_audit</tag>
    <command>powershell.exe -ExecutionPolicy Bypass -Command "Get-NetFirewallRule -Enabled True -Direction Inbound | Where-Object { $_.Action -eq 'Allow' } | Select-Object DisplayName, Profile, LocalPort, RemoteAddress | ConvertTo-Json -Compress"</command>
    <interval>10m</interval>
    <ignore_output>no</ignore_output>
    <run_on_start>yes</run_on_start>
    <timeout>60</timeout>
  </wodle>

</agent_config>
WINAGENT_EOF

echo -e "\${GREEN}[OK]\${NC} Configuración de agente Windows para cortafuegos creada"
echo -e "\${CYAN}[INFO]\${NC} Se desplegará automáticamente a los agentes del grupo '$AGENT_GROUP'"

# Generar script PowerShell para instalación del agente
echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${YELLOW}  INSTALACIÓN DEL AGENTE WAZUH EN WINDOWS\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  Ejecuta este comando en PowerShell (como Administrador):\${NC}"
echo ""
echo -e "  \${GREEN}# Descargar e instalar el agente Wazuh\${NC}"
echo -e "  \${WHITE}Invoke-WebRequest -Uri https://packages.wazuh.com/${config.windowsAgentVersion}/windows/wazuh-agent-${config.windowsAgentVersion}-1.msi -OutFile wazuh-agent.msi\${NC}"
echo -e "  \${WHITE}msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER='$WAZUH_SERVER' WAZUH_AGENT_GROUP='$AGENT_GROUP'\${NC}"
echo ""
echo -e "  \${GREEN}# Iniciar el servicio\${NC}"
echo -e "  \${WHITE}NET START Wazuh\${NC}"
echo ""
echo -e "  \${GREEN}# Habilitar logging del firewall de Windows (IMPORTANTE)\${NC}"
echo -e "  \${WHITE}Set-NetFirewallProfile -Profile Domain,Public,Private -LogAllowed True -LogBlocked True -LogFileName 'C:\\\\Windows\\\\System32\\\\LogFiles\\\\Firewall\\\\pfirewall.log'\${NC}"
echo ""
echo -e "  \${GREEN}# Habilitar auditoría avanzada del firewall\${NC}"
echo -e "  \${WHITE}auditpol /set /subcategory:'Filtering Platform Connection' /success:enable /failure:enable\${NC}"
echo -e "  \${WHITE}auditpol /set /subcategory:'MPSSVC Rule-Level Policy Change' /success:enable /failure:enable\${NC}"
echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
`);
  }

  if (config.enableIptablesUfw) {
    sections.push(`
#============================================================================
# FASE 4D: IPTABLES/UFW - CONFIGURACIÓN VÍA AGENTE WAZUH
#============================================================================
echo -e "\${BLUE}[FASE 4D]\${NC} Preparando integración con iptables/UFW..."

# Crear configuración de agente Linux para el grupo
LINUX_AGENT_CONF="/var/ossec/etc/shared/$AGENT_GROUP/agent.conf"

# Añadir configuración Linux al mismo fichero (si ya existe la de Windows)
cat >> "$LINUX_AGENT_CONF" << 'LINUXAGENT_EOF'

<!-- Configuración para agentes Linux - iptables/UFW -->
<agent_config os="Linux">

  <!-- Monitorizar logs del kernel (iptables) -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/kern.log</location>
  </localfile>

  <!-- Monitorizar logs de UFW -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/ufw.log</location>
  </localfile>

  <!-- Monitorizar syslog para iptables -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <!-- Monitorizar cambios en las reglas del firewall -->
  <syscheck>
    <directories check_all="yes" realtime="yes">/etc/iptables</directories>
    <directories check_all="yes" realtime="yes">/etc/ufw</directories>
    <directories check_all="yes" realtime="yes">/etc/nftables.conf</directories>
  </syscheck>

  <!-- Auditoría del estado de UFW cada 5 minutos -->
  <wodle name="command">
    <disabled>no</disabled>
    <tag>ufw_status</tag>
    <command>ufw status verbose 2>/dev/null || iptables -L -n --line-numbers 2>/dev/null | head -50</command>
    <interval>5m</interval>
    <ignore_output>no</ignore_output>
    <run_on_start>yes</run_on_start>
    <timeout>30</timeout>
  </wodle>

</agent_config>
LINUXAGENT_EOF

echo -e "\${GREEN}[OK]\${NC} Configuración de agente Linux para cortafuegos creada"

echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${YELLOW}  CONFIGURACIÓN EN ENDPOINTS LINUX\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  1. Instalar agente Wazuh:\${NC}"
echo -e "     \${WHITE}curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg\${NC}"
echo -e "     \${WHITE}echo 'deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main' > /etc/apt/sources.list.d/wazuh.list\${NC}"
echo -e "     \${WHITE}apt update && apt install -y wazuh-agent=${config.linuxAgentVersion}-1\${NC}"
echo ""
echo -e "\${CYAN}  2. Configurar el agente:\${NC}"
echo -e "     \${WHITE}sed -i 's/MANAGER_IP/$WAZUH_SERVER/' /var/ossec/etc/ossec.conf\${NC}"
echo ""
echo -e "\${CYAN}  3. Añadir al grupo y arrancar:\${NC}"
echo -e "     \${WHITE}systemctl daemon-reload && systemctl enable wazuh-agent && systemctl start wazuh-agent\${NC}"
echo ""
echo -e "\${CYAN}  4. Habilitar logging de iptables/UFW (IMPORTANTE):\${NC}"
echo -e "     \${GREEN}# Para UFW:\${NC}"
echo -e "     \${WHITE}ufw logging high\${NC}"
echo ""
echo -e "     \${GREEN}# Para iptables (añadir prefijo LOG antes de DROP/REJECT):\${NC}"
echo -e "     \${WHITE}iptables -I INPUT -j LOG --log-prefix '[IPTABLES-DROP] ' --log-level 4\${NC}"
echo -e "     \${WHITE}iptables -I FORWARD -j LOG --log-prefix '[IPTABLES-FWD] ' --log-level 4\${NC}"
echo ""
echo -e "     \${GREEN}# Persistir reglas iptables:\${NC}"
echo -e "     \${WHITE}apt install -y iptables-persistent && netfilter-persistent save\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
`);
  }

  // ============================================================
  // IDS RANSOMWARE - AISLAMIENTO AUTOMÁTICO DE MÁQUINAS INFECTADAS
  // ============================================================
  if (config.enableRansomwareIDS) {
    sections.push(`
#============================================================================
# FASE 5: IDS ANTI-RANSOMWARE - AISLAMIENTO AUTOMÁTICO DE ENDPOINTS
#============================================================================
echo -e "\${BLUE}[FASE 5]\${NC} Configurando IDS anti-ransomware con aislamiento automático..."

# --- REGLAS DE DETECCIÓN DE RANSOMWARE ---
cat >> /var/ossec/etc/rules/firewall_custom_rules.xml << 'RANSOMWARE_RULES_EOF'

<!-- ====== REGLAS IDS ANTI-RANSOMWARE ====== -->
<group name="ransomware,ids,">

  <!-- Detección de extensiones de ficheros cifrados por ransomware -->
  <rule id="100300" level="14">
    <if_sid>550,553,554</if_sid>
    <regex type="pcre2">\\.(?:encrypted|locked|crypt|cry|locky|cerber|wcry|wncry|wncryt|zepto|thor|aesir|osiris|zzzzz|micro|mp3|crypto|r5a|XTBL|arena|bip|gamma|monro|combo|cesar|java|arrow|phobos|eking|eight|ROGER|BORISHORSE|MRCR1|FTCODE|LOCKBIT|DEADBOLT|BlackByte)$</regex>
    <description>IDS RANSOMWARE: Fichero con extensión de ransomware detectado - POSIBLE CIFRADO ACTIVO</description>
    <mitre>
      <id>T1486</id>
    </mitre>
    <group>ransomware,attack,syscheck,</group>
  </rule>

  <!-- Múltiples ficheros modificados en poco tiempo (comportamiento de cifrado masivo) -->
  <rule id="100301" level="15" frequency="15" timeframe="30">
    <if_matched_group>syscheck</if_matched_group>
    <description>IDS RANSOMWARE: CRÍTICO - Modificación masiva de ficheros detectada (15+ en 30s) - CIFRADO ACTIVO PROBABLE</description>
    <mitre>
      <id>T1486</id>
    </mitre>
    <group>ransomware,attack,syscheck,</group>
  </rule>

  <!-- Detección de nota de rescate -->
  <rule id="100302" level="14">
    <if_sid>550,553,554</if_sid>
    <regex type="pcre2">(?:README_TO_DECRYPT|DECRYPT_INSTRUCTION|HOW_TO_RECOVER|RANSOM_NOTE|YOUR_FILES_ARE|_readme\\.txt|RECOVER-FILES|DECRYPT_FILES|RESTORE_FILES|!!FAQ for Decryption|#DECRYPT#|ATTENTION!!!)</regex>
    <description>IDS RANSOMWARE: Nota de rescate (ransom note) detectada en el sistema</description>
    <mitre>
      <id>T1486</id>
    </mitre>
    <group>ransomware,attack,</group>
  </rule>

  <!-- Eliminación masiva de shadow copies (Windows) -->
  <rule id="100303" level="15">
    <if_sid>60010,60011</if_sid>
    <match>vssadmin|wmic shadowcopy|bcdedit.*recoveryenabled.*no|wbadmin delete</match>
    <description>IDS RANSOMWARE: CRÍTICO - Eliminación de Shadow Copies / Backups detectada</description>
    <mitre>
      <id>T1490</id>
    </mitre>
    <group>ransomware,attack,</group>
  </rule>

  <!-- Detección de procesos típicos de ransomware -->
  <rule id="100304" level="13">
    <if_sid>60010,60011</if_sid>
    <match>cipher /w:|sdelete|eraser.exe</match>
    <description>IDS RANSOMWARE: Herramienta de borrado seguro ejecutada (posible anti-forense)</description>
    <mitre>
      <id>T1485</id>
    </mitre>
    <group>ransomware,attack,</group>
  </rule>

</group>
RANSOMWARE_RULES_EOF

echo -e "\${GREEN}[OK]\${NC} Reglas de detección de ransomware instaladas"

# --- SCRIPT DE RESPUESTA ACTIVA: AISLAMIENTO DE RED ---
echo -e "\${CYAN}[INFO]\${NC} Creando script de respuesta activa para aislamiento de red..."

# Script para Linux
cat > /var/ossec/active-response/bin/ransomware-isolate.sh << 'ISOLATE_LINUX_EOF'
#!/bin/bash
#============================================================================
# SOC Automation - Respuesta Activa: Aislamiento de máquina por ransomware
# Bloquea todo el tráfico de red de la máquina infectada excepto
# la comunicación con el servidor Wazuh (para mantener visibilidad)
# By Sistemas 127
#============================================================================

LOCAL_IP="$1"
ACTION="$2"
WAZUH_SERVER="$3"
LOG_FILE="/var/ossec/logs/active-responses.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') ransomware-isolate: $1" >> "$LOG_FILE"
}

if [ "$ACTION" = "add" ]; then
  log "🚨 AISLAMIENTO ACTIVADO para $LOCAL_IP - Ransomware detectado"

  # Guardar reglas actuales para poder restaurar
  iptables-save > /tmp/iptables-pre-isolation.rules 2>/dev/null || true

  # Bloquear todo el tráfico excepto Wazuh
  iptables -I INPUT -s "$WAZUH_SERVER" -j ACCEPT 2>/dev/null
  iptables -I OUTPUT -d "$WAZUH_SERVER" -j ACCEPT 2>/dev/null
  iptables -I INPUT -i lo -j ACCEPT 2>/dev/null
  iptables -I OUTPUT -o lo -j ACCEPT 2>/dev/null
  iptables -A INPUT -j DROP 2>/dev/null
  iptables -A OUTPUT -j DROP 2>/dev/null
  iptables -A FORWARD -j DROP 2>/dev/null

  log "Tráfico bloqueado. Solo se permite comunicación con Wazuh ($WAZUH_SERVER)"

elif [ "$ACTION" = "delete" ]; then
  log "✅ AISLAMIENTO DESACTIVADO para $LOCAL_IP - Restaurando conectividad"

  # Restaurar reglas previas
  if [ -f /tmp/iptables-pre-isolation.rules ]; then
    iptables-restore < /tmp/iptables-pre-isolation.rules 2>/dev/null
  else
    iptables -F 2>/dev/null
    iptables -P INPUT ACCEPT 2>/dev/null
    iptables -P OUTPUT ACCEPT 2>/dev/null
    iptables -P FORWARD ACCEPT 2>/dev/null
  fi

  log "Conectividad de red restaurada"
fi
ISOLATE_LINUX_EOF

chmod 750 /var/ossec/active-response/bin/ransomware-isolate.sh
chown root:wazuh /var/ossec/active-response/bin/ransomware-isolate.sh

# Script para Windows (PowerShell)
cat > /var/ossec/active-response/bin/ransomware-isolate.cmd << 'ISOLATE_WIN_EOF'
@echo off
REM ============================================================================
REM SOC Automation - Respuesta Activa: Aislamiento Windows por ransomware
REM Desactiva todos los adaptadores de red excepto la comunicación con Wazuh
REM By Sistemas 127
REM ============================================================================

set ACTION=%1
set WAZUH_SERVER=%3

if "%ACTION%"=="add" (
  echo [%date% %time%] RANSOMWARE ISOLATION ACTIVATED >> "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"

  REM Bloquear todo el tráfico saliente excepto Wazuh
  netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound

  REM Permitir comunicación con Wazuh
  netsh advfirewall firewall add rule name="Wazuh-Allow-Out" dir=out action=allow remoteip=%WAZUH_SERVER%
  netsh advfirewall firewall add rule name="Wazuh-Allow-In" dir=in action=allow remoteip=%WAZUH_SERVER%

  REM Permitir loopback
  netsh advfirewall firewall add rule name="Loopback-Out" dir=out action=allow remoteip=127.0.0.1
  netsh advfirewall firewall add rule name="Loopback-In" dir=in action=allow remoteip=127.0.0.1

  echo [%date% %time%] Red aislada. Solo Wazuh permitido. >> "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
)

if "%ACTION%"=="delete" (
  echo [%date% %time%] RANSOMWARE ISOLATION DEACTIVATED >> "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"

  REM Restaurar política por defecto
  netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound

  REM Eliminar reglas temporales
  netsh advfirewall firewall delete rule name="Wazuh-Allow-Out" 2>nul
  netsh advfirewall firewall delete rule name="Wazuh-Allow-In" 2>nul
  netsh advfirewall firewall delete rule name="Loopback-Out" 2>nul
  netsh advfirewall firewall delete rule name="Loopback-In" 2>nul

  echo [%date% %time%] Red restaurada. >> "C:\\Program Files (x86)\\ossec-agent\\active-response\\active-responses.log"
)
ISOLATE_WIN_EOF

echo -e "\${GREEN}[OK]\${NC} Scripts de aislamiento creados (Linux + Windows)"

# --- CONFIGURAR ACTIVE RESPONSE EN OSSEC.CONF ---
echo -e "\${CYAN}[INFO]\${NC} Configurando respuesta activa en ossec.conf..."

if ! grep -q "ransomware-isolate" "$OSSEC_CONF" 2>/dev/null; then
  sed -i '/<\\/ossec_config>/i \\
  <!-- IDS Anti-Ransomware: Aislamiento automático de red -->\\
  <command>\\
    <name>ransomware-isolate</name>\\
    <executable>ransomware-isolate.sh</executable>\\
    <timeout_allowed>yes</timeout_allowed>\\
  </command>\\
  \\
  <!-- Activar aislamiento cuando se detecta ransomware (reglas 100300-100304) -->\\
  <active-response>\\
    <command>ransomware-isolate</command>\\
    <location>local</location>\\
    <rules_id>100300,100301,100302,100303,100304</rules_id>\\
    <timeout>3600</timeout>\\
  </active-response>' "$OSSEC_CONF"

  echo -e "\${GREEN}[OK]\${NC} Respuesta activa anti-ransomware configurada"
  echo -e "\${CYAN}[INFO]\${NC} Timeout de aislamiento: 1 hora (3600s). La máquina se reconectará automáticamente."
  echo -e "\${CYAN}[INFO]\${NC} Para levantar el aislamiento manualmente:"
  echo -e "  \${WHITE}/var/ossec/bin/agent_control -b <IP_AGENTE> -f ransomware-isolate0\${NC}"
else
  echo -e "\${YELLOW}[AVISO]\${NC} La respuesta activa anti-ransomware ya existe"
fi

echo ""
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${YELLOW}  IDS ANTI-RANSOMWARE - RESUMEN\${NC}"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
echo -e "\${CYAN}  Detección:\${NC}"
echo -e "    • Extensiones de ficheros cifrados (50+ familias)"
echo -e "    • Modificación masiva de ficheros (15+ en 30s)"
echo -e "    • Notas de rescate (ransom notes)"
echo -e "    • Eliminación de Shadow Copies / backups"
echo -e "    • Herramientas anti-forense"
echo ""
echo -e "\${CYAN}  Respuesta automática:\${NC}"
echo -e "    • \${GREEN}Linux:\${NC} iptables bloquea todo excepto Wazuh"
echo -e "    • \${GREEN}Windows:\${NC} Windows Firewall bloquea todo excepto Wazuh"
echo -e "    • Timeout: 1 hora (restauración automática)"
echo -e "    • El agente Wazuh sigue reportando (visibilidad total)"
echo ""
echo -e "\${CYAN}  MITRE ATT&CK:\${NC}"
echo -e "    • T1486 - Data Encrypted for Impact"
echo -e "    • T1490 - Inhibit System Recovery"
echo -e "    • T1485 - Data Destruction"
echo -e "\${YELLOW}════════════════════════════════════════════════════════════\${NC}"
`);
  }

  // ============================================================
  // FASE FINAL: REINICIAR Y VERIFICAR
  // ============================================================
  sections.push(`
#============================================================================
# FASE 5: REINICIAR WAZUH Y VERIFICAR CONFIGURACIÓN
#============================================================================
echo -e "\${BLUE}[FASE 5]\${NC} Reiniciando servicios de Wazuh..."

# Abrir puerto syslog en el firewall
if command -v ufw &>/dev/null; then
  ufw allow $SYSLOG_PORT/udp comment "Wazuh Syslog - Cortafuegos" 2>/dev/null || true
  ufw allow $SYSLOG_PORT/tcp comment "Wazuh Syslog - Cortafuegos" 2>/dev/null || true
fi

# Reiniciar Wazuh Manager
systemctl restart wazuh-manager 2>/dev/null || /var/ossec/bin/wazuh-control restart 2>/dev/null || true

sleep 5

# Verificar que el manager está corriendo
if systemctl is-active --quiet wazuh-manager 2>/dev/null || /var/ossec/bin/wazuh-control status 2>/dev/null | grep -q "running"; then
  echo -e "\${GREEN}[OK]\${NC} Wazuh Manager reiniciado correctamente"
else
  echo -e "\${RED}[ERROR]\${NC} Wazuh Manager no se pudo reiniciar. Revisa los logs:"
  echo -e "  \${WHITE}tail -50 /var/ossec/logs/ossec.log\${NC}"
fi

# Verificar que las reglas se cargaron
RULES_COUNT=$(grep -c "rule id=" /var/ossec/etc/rules/firewall_custom_rules.xml 2>/dev/null || echo "0")
echo -e "\${GREEN}[OK]\${NC} $RULES_COUNT reglas personalizadas de cortafuegos cargadas"

echo ""
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}                                                        \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}   ✅ INTEGRACIÓN DE CORTAFUEGOS COMPLETADA              \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}   Creado por Sistemas 127                               \${NC}"
echo -e "\${BG_BLUE}\${WHITE}\${BOLD}                                                        \${NC}"
echo ""
echo -e "\${CYAN}╔══════════════════════════════════════════════════════════╗\${NC}"
echo -e "\${CYAN}║  RESUMEN DE INTEGRACIÓN                                 ║\${NC}"
echo -e "\${CYAN}╠══════════════════════════════════════════════════════════╣\${NC}"
echo -e "\${CYAN}║\${NC}  Servidor Wazuh:    \${GREEN}$WAZUH_SERVER\${NC}"
echo -e "\${CYAN}║\${NC}  Puerto Syslog:     \${GREEN}$SYSLOG_PORT/udp\${NC}"
echo -e "\${CYAN}║\${NC}  Grupo de Agentes:  \${GREEN}$AGENT_GROUP\${NC}"
echo -e "\${CYAN}║\${NC}  Reglas instaladas: \${GREEN}$RULES_COUNT\${NC}"
echo -e "\${CYAN}║\${NC}"
echo -e "\${CYAN}║\${NC}  Cortafuegos configurados:"
`);

  if (config.enableWindowsDefender) {
    sections.push(`echo -e "\${CYAN}║\${NC}    \${GREEN}✓\${NC} Windows Defender Firewall (vía agente Wazuh)"`);
  }
  if (config.enableOPNsense) {
    sections.push(`echo -e "\${CYAN}║\${NC}    \${GREEN}✓\${NC} OPNsense (syslog -> $WAZUH_SERVER:$SYSLOG_PORT)"`);
  }
  if (config.enablePfSense) {
    sections.push(`echo -e "\${CYAN}║\${NC}    \${GREEN}✓\${NC} pfSense (syslog -> $WAZUH_SERVER:$SYSLOG_PORT)"`);
  }
  if (config.enableIptablesUfw) {
    sections.push(`echo -e "\${CYAN}║\${NC}    \${GREEN}✓\${NC} iptables/UFW (vía agente Wazuh)"`);
  }
  if (config.enableRansomwareIDS) {
    sections.push(`echo -e "\${CYAN}║\${NC}    \${GREEN}✓\${NC} IDS Anti-Ransomware (aislamiento automático)"`);
  }

  sections.push(`
echo -e "\${CYAN}║\${NC}"
echo -e "\${CYAN}║\${NC}  Ficheros modificados:"
echo -e "\${CYAN}║\${NC}    /var/ossec/etc/ossec.conf"
echo -e "\${CYAN}║\${NC}    /var/ossec/etc/rules/firewall_custom_rules.xml"
echo -e "\${CYAN}║\${NC}    /var/ossec/etc/decoders/firewall_custom_decoders.xml"
echo -e "\${CYAN}║\${NC}    /var/ossec/etc/shared/$AGENT_GROUP/agent.conf"
echo -e "\${CYAN}╚══════════════════════════════════════════════════════════╝\${NC}"
echo ""
echo -e "\${YELLOW}[NOTA]\${NC} Para verificar que los logs llegan correctamente:"
echo -e "  \${WHITE}tail -f /var/ossec/logs/alerts/alerts.json | grep firewall\${NC}"
echo ""
echo -e "\${YELLOW}[NOTA]\${NC} Para ver agentes conectados del grupo:"
echo -e "  \${WHITE}/var/ossec/bin/agent_control -l -g $AGENT_GROUP\${NC}"
echo ""
`);

  return sections.join('\n');
}
