// Generadores de scripts de integración de IA para enriquecimiento SOC
// Ollama, VirusTotal, AbuseIPDB, OTX AlienVault

export interface AIEnrichmentConfig {
  serverIp: string;
  ollamaModel: string;
  ollamaPort: string;
  enableOllama: boolean;
  enableGemini: boolean;
  geminiApiKey: string;
  geminiModel: string;
  enableVirusTotal: boolean;
  virustotalApiKey: string;
  enableAbuseIPDB: boolean;
  abuseipdbApiKey: string;
  enableOTX: boolean;
  otxApiKey: string;
  thehiveUrl: string;
  thehiveApiKey: string;
  wazuhIntegration: boolean;
}

export function generateAIEnrichmentScript(config: AIEnrichmentConfig): string {
  const sections: string[] = [];

  sections.push(`#!/bin/bash
#============================================================================
# SOC Automation - AI Enrichment & Threat Intelligence Integration
# Integración de IA para enriquecimiento de alertas SOC
# By Sistemas 127
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
echo -e "\${BG_BLUE}\${WHITE}        AI Enrichment - Integración de Inteligencia             \${NC}"
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

ENRICHMENT_DIR="/opt/soc-enrichment"
mkdir -p \$ENRICHMENT_DIR/{scripts,logs,config}
cd \$ENRICHMENT_DIR

apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv jq curl > /dev/null 2>&1
ok "Dependencias base instaladas"

# Crear entorno virtual de Python
python3 -m venv \$ENRICHMENT_DIR/venv
source \$ENRICHMENT_DIR/venv/bin/activate
pip install --quiet requests urllib3
ok "Entorno Python configurado"
add_summary "Python venv: \$ENRICHMENT_DIR/venv"
`);

  // Ollama section
  if (config.enableOllama) {
    sections.push(`
#============================================================================
# OLLAMA - LLM LOCAL PARA ANÁLISIS DE ALERTAS
#============================================================================
status "Instalando Ollama (LLM local)..."

# Detener instancias previas de Ollama para evitar conflicto de puertos
if systemctl is-active --quiet ollama 2>/dev/null; then
    status "Deteniendo instancia previa de Ollama..."
    systemctl stop ollama
    sleep 2
    ok "Instancia previa detenida"
fi

# Matar cualquier proceso ollama huérfano que ocupe el puerto
if lsof -i :${config.ollamaPort} -t &>/dev/null; then
    status "Liberando puerto ${config.ollamaPort}..."
    kill -9 \$(lsof -i :${config.ollamaPort} -t) 2>/dev/null || true
    sleep 2
    ok "Puerto ${config.ollamaPort} liberado"
fi

# Instalar Ollama (si ya existe, se actualiza)
curl -fsSL https://ollama.ai/install.sh | sh
ok "Ollama instalado"

# Configurar Ollama para escuchar en todas las interfaces (acceso LAN)
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf << OLLAMAEOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:${config.ollamaPort}"
OLLAMAEOF
systemctl daemon-reload

# Iniciar Ollama vía systemd (NO con ollama serve manual para evitar doble bind)
systemctl enable ollama
systemctl start ollama

# Esperar a que Ollama esté listo
status "Esperando a que Ollama esté disponible..."
for i in {1..30}; do
    if curl -sf http://localhost:${config.ollamaPort}/api/tags &>/dev/null; then
        ok "Ollama respondiendo en puerto ${config.ollamaPort}"
        break
    fi
    sleep 2
done

status "Descargando modelo ${config.ollamaModel} (puede tardar varios minutos)..."
ollama pull ${config.ollamaModel}
ok "Modelo ${config.ollamaModel} descargado"
add_summary "Ollama: modelo ${config.ollamaModel} en puerto ${config.ollamaPort}"

# Crear script de análisis de alertas
cat > \$ENRICHMENT_DIR/scripts/ollama_analyze.py << PYEOF
#!/usr/bin/env python3
"""Analiza alertas SOC usando Ollama LLM local"""
import requests
import json
import sys

OLLAMA_URL = "http://\$SERVER_IP:${config.ollamaPort}/api/generate"
MODEL = "${config.ollamaModel}"

def analyze_alert(alert_data: str) -> str:
    prompt = f"""Eres un analista SOC experto. Analiza la siguiente alerta de seguridad y proporciona:
1. Nivel de severidad (Crítico/Alto/Medio/Bajo)
2. Tipo de amenaza
3. Indicadores de compromiso (IOCs)
4. Acciones recomendadas
5. Posibles falsos positivos

Alerta:
{alert_data}

Responde en español de forma concisa y técnica."""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=120)
        return response.json().get("response", "Error: sin respuesta")
    except Exception as e:
        return f"Error al conectar con Ollama: {e}"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        alert = " ".join(sys.argv[1:])
    else:
        alert = sys.stdin.read()
    print(analyze_alert(alert))
PYEOF

chmod +x \$ENRICHMENT_DIR/scripts/ollama_analyze.py
ok "Script de análisis Ollama creado"
`);
  }

  // Google Gemini section
  if (config.enableGemini) {
    const gl: string[] = [];
    gl.push('');
    gl.push('#============================================================================');
    gl.push('# GOOGLE GEMINI - IA EN LA NUBE PARA ANALISIS AVANZADO');
    gl.push('#============================================================================');
    gl.push('status "Configurando integracion Google Gemini..."');
    gl.push('');
    gl.push('source $ENRICHMENT_DIR/venv/bin/activate');
    gl.push('pip install --quiet google-generativeai 2>/dev/null || pip install --quiet google-generativeai');
    gl.push('ok "SDK Google Gemini instalado"');
    gl.push('');
    gl.push("cat > $ENRICHMENT_DIR/scripts/gemini_analyze.py << PYEOF");
    gl.push('#!/usr/bin/env python3');
    gl.push('"""Analiza alertas SOC usando Google Gemini API"""');
    gl.push('import json, sys, os');
    gl.push('try:');
    gl.push('    import google.generativeai as genai');
    gl.push('except ImportError:');
    gl.push('    import subprocess');
    gl.push('    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai"])');
    gl.push('    import google.generativeai as genai');
    gl.push('');
    gl.push('GEMINI_API_KEY = "' + config.geminiApiKey + '"');
    gl.push('MODEL = "' + config.geminiModel + '"');
    gl.push('genai.configure(api_key=GEMINI_API_KEY)');
    gl.push('');
    gl.push('def analyze_alert(alert_data):');
    gl.push('    prompt = "Eres un analista SOC experto de nivel 3. Analiza la siguiente alerta de seguridad.\\n"');
    gl.push('    prompt += "1. Severidad con justificacion\\n2. Tecnica MITRE ATT&CK\\n3. IOCs\\n4. Acciones recomendadas\\n5. Probabilidad de falso positivo\\n\\n"');
    gl.push('    prompt += "Alerta:\\n" + alert_data');
    gl.push('    try:');
    gl.push('        model = genai.GenerativeModel(MODEL)');
    gl.push('        response = model.generate_content(prompt)');
    gl.push('        return response.text');
    gl.push('    except Exception as e:');
    gl.push('        return "Error Gemini: " + str(e)');
    gl.push('');
    gl.push('if __name__ == "__main__":');
    gl.push('    alert = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else sys.stdin.read()');
    gl.push('    print(analyze_alert(alert))');
    gl.push('PYEOF');
    gl.push('');
    gl.push('chmod +x $ENRICHMENT_DIR/scripts/gemini_analyze.py');
    gl.push('ok "Script de analisis Gemini creado"');
    gl.push('add_summary "Google Gemini: modelo ' + config.geminiModel + ' (API cloud)"');

    if (config.enableOllama) {
      gl.push('');
      gl.push('# Script combinado: analiza con Ollama local + Gemini cloud');
      gl.push("cat > $ENRICHMENT_DIR/scripts/dual_ai_analyze.sh << 'DUALEOF'");
      gl.push('#!/bin/bash');
      gl.push('ENRICHMENT_DIR="/opt/soc-enrichment"');
      gl.push('ALERT="$1"');
      gl.push('echo "============================================================"');
      gl.push('echo "ANALISIS LOCAL (Ollama):"');
      gl.push('echo "============================================================"');
      gl.push('$ENRICHMENT_DIR/venv/bin/python3 $ENRICHMENT_DIR/scripts/ollama_analyze.py "$ALERT"');
      gl.push('echo ""');
      gl.push('echo "============================================================"');
      gl.push('echo "ANALISIS CLOUD (Gemini):"');
      gl.push('echo "============================================================"');
      gl.push('$ENRICHMENT_DIR/venv/bin/python3 $ENRICHMENT_DIR/scripts/gemini_analyze.py "$ALERT"');
      gl.push('DUALEOF');
      gl.push('');
      gl.push('chmod +x $ENRICHMENT_DIR/scripts/dual_ai_analyze.sh');
      gl.push('ok "Script de analisis dual (Ollama + Gemini) creado"');
      gl.push('add_summary "Analisis dual: Ollama local + Gemini cloud"');
    }

    sections.push(gl.join('\n'));
  }

  // VirusTotal section
  if (config.enableVirusTotal) {
    sections.push(`
#============================================================================
# VIRUSTOTAL - ANÁLISIS DE HASHES, IPs Y URLs
#============================================================================
status "Configurando integración VirusTotal..."

cat > \$ENRICHMENT_DIR/scripts/virustotal_check.py << 'PYEOF'
#!/usr/bin/env python3
"""Consulta VirusTotal para hashes, IPs, URLs y dominios"""
import requests
import json
import sys

VT_API_KEY = "${config.virustotalApiKey}"
VT_BASE = "https://www.virustotal.com/api/v3"

def check_hash(file_hash: str) -> dict:
    headers = {"x-apikey": VT_API_KEY}
    r = requests.get(f"{VT_BASE}/files/{file_hash}", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})
        return {
            "hash": file_hash,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "undetected": stats.get("undetected", 0),
            "reputation": data.get("reputation", "N/A"),
            "tags": data.get("tags", [])[:5]
        }
    return {"error": f"HTTP {r.status_code}", "hash": file_hash}

def check_ip(ip: str) -> dict:
    headers = {"x-apikey": VT_API_KEY}
    r = requests.get(f"{VT_BASE}/ip_addresses/{ip}", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})
        return {
            "ip": ip,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "country": data.get("country", "N/A"),
            "as_owner": data.get("as_owner", "N/A")
        }
    return {"error": f"HTTP {r.status_code}", "ip": ip}

def check_url(url: str) -> dict:
    import base64
    headers = {"x-apikey": VT_API_KEY}
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    r = requests.get(f"{VT_BASE}/urls/{url_id}", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})
        return {
            "url": url,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0)
        }
    return {"error": f"HTTP {r.status_code}", "url": url}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: virustotal_check.py <hash|ip|url> <valor>")
        sys.exit(1)
    check_type = sys.argv[1]
    value = sys.argv[2]
    if check_type == "hash":
        print(json.dumps(check_hash(value), indent=2))
    elif check_type == "ip":
        print(json.dumps(check_ip(value), indent=2))
    elif check_type == "url":
        print(json.dumps(check_url(value), indent=2))
PYEOF

chmod +x \$ENRICHMENT_DIR/scripts/virustotal_check.py
ok "Script VirusTotal creado"
add_summary "VirusTotal: integrado (API key configurada)"
`);
  }

  // AbuseIPDB section
  if (config.enableAbuseIPDB) {
    sections.push(`
#============================================================================
# ABUSEIPDB - REPUTACIÓN DE IPs MALICIOSAS
#============================================================================
status "Configurando integración AbuseIPDB..."

cat > \$ENRICHMENT_DIR/scripts/abuseipdb_check.py << 'PYEOF'
#!/usr/bin/env python3
"""Consulta AbuseIPDB para reputación de IPs"""
import requests
import json
import sys

ABUSEIPDB_KEY = "${config.abuseipdbApiKey}"
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2"

def check_ip(ip: str) -> dict:
    headers = {"Key": ABUSEIPDB_KEY, "Accept": "application/json"}
    params = {"ipAddress": ip, "maxAgeInDays": 90, "verbose": True}
    r = requests.get(f"{ABUSEIPDB_URL}/check", headers=headers, params=params, timeout=30)
    if r.status_code == 200:
        data = r.json()["data"]
        return {
            "ip": ip,
            "abuse_confidence": data["abuseConfidenceScore"],
            "country": data.get("countryCode", "N/A"),
            "isp": data.get("isp", "N/A"),
            "domain": data.get("domain", "N/A"),
            "total_reports": data.get("totalReports", 0),
            "is_tor": data.get("isTor", False),
            "is_whitelisted": data.get("isWhitelisted", False),
            "last_reported": data.get("lastReportedAt", "N/A")
        }
    return {"error": f"HTTP {r.status_code}", "ip": ip}

def report_ip(ip: str, categories: str, comment: str) -> dict:
    headers = {"Key": ABUSEIPDB_KEY, "Accept": "application/json"}
    data = {"ip": ip, "categories": categories, "comment": comment}
    r = requests.post(f"{ABUSEIPDB_URL}/report", headers=headers, data=data, timeout=30)
    return r.json()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: abuseipdb_check.py <ip> [report <categories> <comment>]")
        sys.exit(1)
    ip = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == "report":
        cats = sys.argv[3] if len(sys.argv) > 3 else "18"
        comment = sys.argv[4] if len(sys.argv) > 4 else "Reported by SOC Automation"
        print(json.dumps(report_ip(ip, cats, comment), indent=2))
    else:
        print(json.dumps(check_ip(ip), indent=2))
PYEOF

chmod +x \$ENRICHMENT_DIR/scripts/abuseipdb_check.py
ok "Script AbuseIPDB creado"
add_summary "AbuseIPDB: integrado"
`);
  }

  // OTX AlienVault section
  if (config.enableOTX) {
    sections.push(`
#============================================================================
# OTX ALIENVAULT - THREAT INTELLIGENCE ABIERTA
#============================================================================
status "Configurando integración OTX AlienVault..."

cat > \$ENRICHMENT_DIR/scripts/otx_check.py << 'PYEOF'
#!/usr/bin/env python3
"""Consulta OTX AlienVault para threat intelligence"""
import requests
import json
import sys

OTX_API_KEY = "${config.otxApiKey}"
OTX_BASE = "https://otx.alienvault.com/api/v1"

def check_ip(ip: str) -> dict:
    headers = {"X-OTX-API-KEY": OTX_API_KEY}
    r = requests.get(f"{OTX_BASE}/indicators/IPv4/{ip}/general", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        return {
            "ip": ip,
            "pulse_count": data.get("pulse_info", {}).get("count", 0),
            "reputation": data.get("reputation", 0),
            "country": data.get("country_name", "N/A"),
            "asn": data.get("asn", "N/A"),
            "pulses": [p["name"] for p in data.get("pulse_info", {}).get("pulses", [])[:5]]
        }
    return {"error": f"HTTP {r.status_code}", "ip": ip}

def check_hash(file_hash: str) -> dict:
    headers = {"X-OTX-API-KEY": OTX_API_KEY}
    r = requests.get(f"{OTX_BASE}/indicators/file/{file_hash}/general", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        return {
            "hash": file_hash,
            "pulse_count": data.get("pulse_info", {}).get("count", 0),
            "pulses": [p["name"] for p in data.get("pulse_info", {}).get("pulses", [])[:5]]
        }
    return {"error": f"HTTP {r.status_code}", "hash": file_hash}

def check_domain(domain: str) -> dict:
    headers = {"X-OTX-API-KEY": OTX_API_KEY}
    r = requests.get(f"{OTX_BASE}/indicators/domain/{domain}/general", headers=headers, timeout=30)
    if r.status_code == 200:
        data = r.json()
        return {
            "domain": domain,
            "pulse_count": data.get("pulse_info", {}).get("count", 0),
            "alexa": data.get("alexa", "N/A"),
            "whois": data.get("whois", "N/A")[:200] if data.get("whois") else "N/A"
        }
    return {"error": f"HTTP {r.status_code}", "domain": domain}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: otx_check.py <ip|hash|domain> <valor>")
        sys.exit(1)
    t, v = sys.argv[1], sys.argv[2]
    fn = {"ip": check_ip, "hash": check_hash, "domain": check_domain}.get(t)
    if fn:
        print(json.dumps(fn(v), indent=2))
PYEOF

chmod +x \$ENRICHMENT_DIR/scripts/otx_check.py
ok "Script OTX AlienVault creado"
add_summary "OTX AlienVault: integrado"
`);
  }

  // Wazuh integration
  if (config.wazuhIntegration) {
    sections.push(`
#============================================================================
# INTEGRACIÓN CON WAZUH - ACTIVE RESPONSE
#============================================================================
status "Configurando integración con Wazuh..."

cat > \$ENRICHMENT_DIR/scripts/wazuh_enrichment.py << 'PYEOF'
#!/usr/bin/env python3
"""Script de enriquecimiento automático para alertas Wazuh"""
import json
import sys
import os
import subprocess

ENRICHMENT_DIR = "/opt/soc-enrichment"
SCRIPTS_DIR = f"{ENRICHMENT_DIR}/scripts"
LOG_FILE = f"{ENRICHMENT_DIR}/logs/enrichment.log"

def log(msg):
    import datetime
    with open(LOG_FILE, "a") as f:
        f.write(f"[{datetime.datetime.now().isoformat()}] {msg}\\n")

def enrich_ip(ip):
    results = {}
    # AbuseIPDB
    try:
        r = subprocess.run([f"{ENRICHMENT_DIR}/venv/bin/python3", f"{SCRIPTS_DIR}/abuseipdb_check.py", ip],
                          capture_output=True, text=True, timeout=30)
        results["abuseipdb"] = json.loads(r.stdout) if r.returncode == 0 else {"error": r.stderr}
    except: pass
    # VirusTotal
    try:
        r = subprocess.run([f"{ENRICHMENT_DIR}/venv/bin/python3", f"{SCRIPTS_DIR}/virustotal_check.py", "ip", ip],
                          capture_output=True, text=True, timeout=30)
        results["virustotal"] = json.loads(r.stdout) if r.returncode == 0 else {"error": r.stderr}
    except: pass
    # OTX
    try:
        r = subprocess.run([f"{ENRICHMENT_DIR}/venv/bin/python3", f"{SCRIPTS_DIR}/otx_check.py", "ip", ip],
                          capture_output=True, text=True, timeout=30)
        results["otx"] = json.loads(r.stdout) if r.returncode == 0 else {"error": r.stderr}
    except: pass
    return results

if __name__ == "__main__":
    alert = json.loads(sys.stdin.read())
    src_ip = alert.get("data", {}).get("srcip", alert.get("agent", {}).get("ip", ""))
    if src_ip:
        log(f"Enriching IP: {src_ip}")
        results = enrich_ip(src_ip)
        log(f"Results: {json.dumps(results)}")
        print(json.dumps(results, indent=2))
PYEOF

# Wazuh custom-ar script
cat > \$ENRICHMENT_DIR/scripts/wazuh-ar-enrich.sh << 'AREOF'
#!/bin/bash
# Wazuh Active Response - Enrich alert with threat intelligence
ENRICHMENT_DIR="/opt/soc-enrichment"
INPUT=\$(cat)
echo "\$INPUT" | \$ENRICHMENT_DIR/venv/bin/python3 \$ENRICHMENT_DIR/scripts/wazuh_enrichment.py >> \$ENRICHMENT_DIR/logs/enrichment.log 2>&1
AREOF

chmod +x \$ENRICHMENT_DIR/scripts/wazuh-ar-enrich.sh
chmod +x \$ENRICHMENT_DIR/scripts/wazuh_enrichment.py

# Configurar integración con Wazuh si ossec.conf existe
if [ -f /var/ossec/etc/ossec.conf ]; then
    status "Añadiendo integración a Wazuh ossec.conf..."
    if ! grep -q "soc-enrichment" /var/ossec/etc/ossec.conf; then
        sed -i '/<\\/ossec_config>/i\\
  <integration>\\
    <name>custom-soc-enrichment</name>\\
    <hook_url>http://localhost:${config.ollamaPort || "11434"}</hook_url>\\
    <alert_format>json</alert_format>\\
    <level>7</level>\\
  </integration>' /var/ossec/etc/ossec.conf
        ok "Integración añadida a ossec.conf"
    fi
    
    # Copiar script de Active Response
    cp \$ENRICHMENT_DIR/scripts/wazuh-ar-enrich.sh /var/ossec/active-response/bin/
    chown root:wazuh /var/ossec/active-response/bin/wazuh-ar-enrich.sh
    chmod 750 /var/ossec/active-response/bin/wazuh-ar-enrich.sh
    ok "Active Response configurado"
    add_summary "Wazuh: Active Response enriquecimiento configurado"
fi
`);
  }

  // TheHive integration
  if (config.thehiveUrl) {
    sections.push(`
#============================================================================
# INTEGRACIÓN CON THEHIVE - WEBHOOKS
#============================================================================
status "Configurando integración con TheHive..."

cat > \$ENRICHMENT_DIR/scripts/thehive_webhook.py << 'PYEOF'
#!/usr/bin/env python3
"""Webhook listener para TheHive - enriquece alertas automáticamente"""
import json
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler

ENRICHMENT_DIR = "/opt/soc-enrichment"
THEHIVE_URL = "${config.thehiveUrl}"
THEHIVE_API_KEY = "${config.thehiveApiKey}"

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
            self.process_alert(data)
        except Exception as e:
            print(f"Error: {e}")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
    
    def process_alert(self, data):
        observables = data.get("details", {}).get("observables", [])
        for obs in observables:
            if obs.get("dataType") == "ip":
                ip = obs.get("data")
                result = subprocess.run(
                    [f"{ENRICHMENT_DIR}/venv/bin/python3",
                     f"{ENRICHMENT_DIR}/scripts/abuseipdb_check.py", ip],
                    capture_output=True, text=True, timeout=30
                )
                print(f"Enriched {ip}: {result.stdout[:200]}")
    
    def log_message(self, format, *args):
        pass  # Suprimir logging por defecto

if __name__ == "__main__":
    port = 9500
    print(f"Webhook TheHive escuchando en puerto {port} (0.0.0.0)")
    HTTPServer(("0.0.0.0", port), WebhookHandler).serve_forever()
PYEOF

chmod +x \$ENRICHMENT_DIR/scripts/thehive_webhook.py

# Crear servicio systemd para el webhook
cat > /etc/systemd/system/soc-enrichment-webhook.service << SVCEOF
[Unit]
Description=Webhook de enriquecimiento SOC para TheHive
After=network.target

[Service]
Type=simple
ExecStart=\$ENRICHMENT_DIR/venv/bin/python3 \$ENRICHMENT_DIR/scripts/thehive_webhook.py
WorkingDirectory=\$ENRICHMENT_DIR
Restart=on-failure

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable soc-enrichment-webhook
systemctl start soc-enrichment-webhook
ok "Webhook TheHive activo en puerto 9500"
add_summary "TheHive webhook: puerto 9500"
`);
  }

  // Resumen final
  sections.push(`
#============================================================================
# RESUMEN FINAL
#============================================================================

# Configuración del firewall para servicios de enriquecimiento
if command -v ufw &>/dev/null; then
${config.enableOllama ? `    ufw allow ${config.ollamaPort}/tcp comment "Ollama LLM" > /dev/null 2>&1` : ''}
    ufw allow 9500/tcp comment "Webhook enriquecimiento" > /dev/null 2>&1
    ok "Firewall configurado para acceso LAN"
    add_summary "Firewall: puertos abiertos para acceso LAN"
fi

clear
echo ""
echo -e "\${BG_BLUE}\${WHITE}                  Creado por Sistemas 127                      \${NC}"
echo ""
echo -e "  \${GREEN}\${BOLD}  AI ENRICHMENT - INSTALACIÓN COMPLETADA\${NC}"
echo ""
echo -e "  \${BOLD}📋 Resumen:\${NC}"
while IFS= read -r item; do echo -e "    \${CYAN}•\${NC} \$item"; done < "\$SUMMARY_FILE"
rm -f "\$SUMMARY_FILE"
echo ""
echo -e "  \${BOLD}📁 Ubicación:\${NC} \$ENRICHMENT_DIR/"
echo -e "  \${BOLD}📂 Scripts:\${NC}   \$ENRICHMENT_DIR/scripts/"
echo -e "  \${BOLD}📝 Logs:\${NC}      \$ENRICHMENT_DIR/logs/"
echo ""
echo -e "  \${BOLD}🌐 Acceso desde la LAN:\${NC}"
${config.enableOllama ? `echo -e "    \${CYAN}Ollama API:\${NC}  http://\$SERVER_IP:${config.ollamaPort}"` : ''}
${config.thehiveUrl ? `echo -e "    \${CYAN}Webhook:\${NC}     http://\$SERVER_IP:9500"` : ''}
echo ""
echo -e "  \${BOLD}🔧 Uso de los scripts:\${NC}"
${config.enableOllama ? `echo -e "    \${CYAN}Ollama:\${NC}     python3 scripts/ollama_analyze.py 'texto de alerta'"` : ''}
${config.enableGemini ? `echo -e "    \${CYAN}Gemini:\${NC}     python3 scripts/gemini_analyze.py 'texto de alerta'"` : ''}
${config.enableGemini && config.enableOllama ? `echo -e "    \${CYAN}Dual IA:\${NC}    bash scripts/dual_ai_analyze.sh 'texto de alerta'"` : ''}
${config.enableVirusTotal ? `echo -e "    \${CYAN}VirusTotal:\${NC} python3 scripts/virustotal_check.py hash|ip|url <valor>"` : ''}
${config.enableAbuseIPDB ? `echo -e "    \${CYAN}AbuseIPDB:\${NC}  python3 scripts/abuseipdb_check.py <ip>"` : ''}
${config.enableOTX ? `echo -e "    \${CYAN}OTX:\${NC}        python3 scripts/otx_check.py ip|hash|domain <valor>"` : ''}
echo ""
echo -e "  \${BG_BLUE}\${WHITE}                  By Sistemas 127                      \${NC}"
`);

  return sections.join('\n');
}
