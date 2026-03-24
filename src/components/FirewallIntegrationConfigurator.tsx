import { useState } from "react";
import { Flame, Download, Terminal, Shield, Monitor, Server, ShieldAlert, BookOpen } from "lucide-react";
import { generateFirewallIntegrationScript, type FirewallIntegrationConfig } from "@/lib/firewallIntegrationGenerators";
import { downloadManual, getFirewallIntegrationManual } from "@/lib/manualGenerators";

const firewallOptions = [
  {
    key: "enableWindowsDefender" as const,
    label: "🛡️ Windows Defender Firewall",
    desc: "Monitoriza eventos del firewall de Windows (EventIDs 5150-5159, 4944-4958, 2003). Detecta desactivación del firewall, cambios en reglas y conexiones sospechosas. Se despliega automáticamente vía agente Wazuh.",
    icon: <Monitor className="w-5 h-5" />,
    color: "primary",
  },
  {
    key: "enableOPNsense" as const,
    label: "🔥 OPNsense",
    desc: "Recibe logs del firewall OPNsense vía syslog (filterlog). Detecta escaneos de puertos, bloqueos masivos y accesos a puertos de administración.",
    icon: <Shield className="w-5 h-5" />,
    color: "accent",
  },
  {
    key: "enablePfSense" as const,
    label: "🧱 pfSense",
    desc: "Integración con pfSense vía syslog remoto. Analiza logs del packet filter para detectar amenazas, escaneos y patrones de ataque.",
    icon: <Shield className="w-5 h-5" />,
    color: "secondary",
  },
  {
    key: "enableIptablesUfw" as const,
    label: "🐧 iptables / UFW",
    desc: "Monitoriza logs de iptables y UFW en endpoints Linux. Detecta bloqueos, escaneos de puertos y cambios en reglas del firewall. Se despliega vía agente Wazuh con logging de nivel alto.",
    icon: <Server className="w-5 h-5" />,
    color: "secondary",
  },
  {
    key: "enableRansomwareIDS" as const,
    label: "🔒 IDS Anti-Ransomware",
    desc: "Detecta infecciones por ransomware (extensiones cifradas, modificación masiva de ficheros, notas de rescate, eliminación de Shadow Copies) y aísla automáticamente la máquina infectada de la red, manteniendo solo la comunicación con Wazuh para visibilidad. Funciona en Windows y Linux.",
    icon: <ShieldAlert className="w-5 h-5" />,
    color: "primary",
  },
];

const FirewallIntegrationConfigurator = () => {
  const [config, setConfig] = useState<FirewallIntegrationConfig>({
    wazuhServerIp: "auto",
    wazuhApiPort: "55000",
    wazuhAgentGroup: "firewalls",
    enableWindowsDefender: false,
    enableOPNsense: false,
    enablePfSense: false,
    enableIptablesUfw: false,
    enableRansomwareIDS: false,
    opnsenseIp: "",
    pfsenseIp: "",
    syslogPort: "514",
    windowsAgentVersion: "4.14.0",
    linuxAgentVersion: "4.14.0",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => {
    if (!config.enableWindowsDefender && !config.enableOPNsense && !config.enablePfSense && !config.enableIptablesUfw && !config.enableRansomwareIDS) {
      alert("Selecciona al menos una opción para integrar.");
      return;
    }
    setScript(generateFirewallIntegrationScript(config));
    setGenerated(true);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "integrate-wazuh-firewalls.sh";
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (key: keyof FirewallIntegrationConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key as keyof FirewallIntegrationConfig] }));
    setGenerated(false);
  };

  const update = (key: keyof FirewallIntegrationConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setGenerated(false);
  };

  const anySelected = config.enableWindowsDefender || config.enableOPNsense || config.enablePfSense || config.enableIptablesUfw || config.enableRansomwareIDS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 text-green-500" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">Integración Cortafuegos & IDS</h3>
            <p className="text-xs font-mono text-muted-foreground">Wazuh + Windows Defender + OPNsense + pfSense + iptables/UFW + Anti-Ransomware</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          Este módulo configura <strong className="text-green-500">Wazuh</strong> para recibir y analizar logs de cortafuegos de toda la infraestructura.
          Para <strong className="text-primary">Windows Defender</strong> e <strong className="text-secondary">iptables/UFW</strong>, la configuración se despliega
          automáticamente a los endpoints a través del agente Wazuh (sin intervención manual en cada máquina).
          Para <strong className="text-accent">OPNsense</strong> y <strong className="text-secondary">pfSense</strong>, se configura la recepción vía syslog.
          El módulo <strong className="text-green-500">IDS Anti-Ransomware</strong> detecta cifrado activo y aísla automáticamente la máquina infectada de la red,
          bloqueando todo el tráfico excepto la comunicación con Wazuh para mantener visibilidad total.
        </p>
      </div>

      {/* Selección de cortafuegos */}
      <div>
        <h4 className="font-heading font-bold text-foreground text-sm mb-3">Selecciona los módulos a integrar:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {firewallOptions.map(fw => (
            <div
              key={fw.key}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                config[fw.key]
                  ? fw.key === "enableRansomwareIDS"
                    ? "border-green-500 bg-green-500/10 ring-1 ring-green-500/30"
                    : `border-${fw.color} bg-${fw.color}/5 ring-1 ring-${fw.color}/30`
                  : "border-border bg-muted/30 hover:border-muted-foreground/30"
              }`}
              onClick={() => toggle(fw.key)}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!config[fw.key]}
                  onChange={() => toggle(fw.key)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="font-heading font-bold text-foreground text-sm">{fw.label}</span>
              </label>
              <p className="text-xs font-mono text-muted-foreground mt-2 ml-6">{fw.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Configuración general */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">IP del Servidor Wazuh (auto = detectar)</label>
          <input
            type="text"
            value={config.wazuhServerIp}
            onChange={e => update("wazuhServerIp", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">Puerto Syslog (para OPNsense/pfSense)</label>
          <input
            type="text"
            value={config.syslogPort}
            onChange={e => update("syslogPort", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">Grupo de Agentes</label>
          <input
            type="text"
            value={config.wazuhAgentGroup}
            onChange={e => update("wazuhAgentGroup", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">Puerto API Wazuh</label>
          <input
            type="text"
            value={config.wazuhApiPort}
            onChange={e => update("wazuhApiPort", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
          />
        </div>
      </div>

      {/* Campos específicos por cortafuegos */}
      {config.enableOPNsense && (
        <div className="p-4 rounded-lg border border-accent/30 bg-accent/5">
          <h4 className="font-heading font-bold text-accent text-sm mb-3">🔥 Configuración OPNsense</h4>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">IP del firewall OPNsense</label>
            <input
              type="text"
              value={config.opnsenseIp}
              onChange={e => update("opnsenseIp", e.target.value)}
              placeholder="192.168.1.1"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
            />
          </div>
        </div>
      )}

      {config.enablePfSense && (
        <div className="p-4 rounded-lg border border-secondary/30 bg-secondary/5">
          <h4 className="font-heading font-bold text-secondary text-sm mb-3">🧱 Configuración pfSense</h4>
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1">IP del firewall pfSense</label>
            <input
              type="text"
              value={config.pfsenseIp}
              onChange={e => update("pfsenseIp", e.target.value)}
              placeholder="192.168.1.1"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-colors"
            />
          </div>
        </div>
      )}

      {(config.enableWindowsDefender || config.enableIptablesUfw) && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
          <h4 className="font-heading font-bold text-primary text-sm mb-3">📦 Versiones del Agente Wazuh</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.enableWindowsDefender && (
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Versión agente Windows</label>
                <select
                  value={config.windowsAgentVersion}
                  onChange={e => update("windowsAgentVersion", e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none"
                >
                  <option value="4.14.0">4.14.0 (Recomendada)</option>
                  <option value="4.12.0">4.12.0</option>
                  <option value="4.9.0">4.9.0</option>
                </select>
              </div>
            )}
            {config.enableIptablesUfw && (
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Versión agente Linux</label>
                <select
                  value={config.linuxAgentVersion}
                  onChange={e => update("linuxAgentVersion", e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none"
                >
                  <option value="4.14.0">4.14.0 (Recomendada)</option>
                  <option value="4.12.0">4.12.0</option>
                  <option value="4.9.0">4.9.0</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info IDS Ransomware */}
      {config.enableRansomwareIDS && (
        <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
          <h4 className="font-heading font-bold text-green-500 text-sm mb-3">🔒 IDS Anti-Ransomware - Detalle</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-muted-foreground">
            <div>
              <p className="font-bold text-foreground mb-1">Detección:</p>
              <ul className="space-y-0.5">
                <li>• 50+ extensiones de ransomware conocidas</li>
                <li>• Modificación masiva de ficheros (15+ en 30s)</li>
                <li>• Notas de rescate (README_TO_DECRYPT, etc.)</li>
                <li>• Eliminación de Shadow Copies / backups</li>
                <li>• Herramientas de borrado seguro</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">Respuesta automática:</p>
              <ul className="space-y-0.5">
                <li>• <strong className="text-green-500">Aísla solo la máquina infectada</strong></li>
                <li>• Bloquea todo tráfico excepto Wazuh</li>
                <li>• Funciona en Windows (netsh) y Linux (iptables)</li>
                <li>• Timeout: 1 hora (restauración automática)</li>
                <li>• Desbloqueo manual disponible desde el servidor</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de lo que se incluirá */}
      {anySelected && (
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <h4 className="font-heading font-bold text-foreground text-sm mb-2">📋 El script generará:</h4>
          <ul className="space-y-1 text-xs font-mono text-muted-foreground">
            <li>✓ Reglas de detección personalizadas con mapeo MITRE ATT&CK</li>
            <li>✓ Decoders personalizados para cada tipo de cortafuegos</li>
            <li>✓ Configuración de syslog remoto en el servidor Wazuh</li>
            {config.enableWindowsDefender && (
              <>
                <li>✓ Configuración centralizada agent.conf para agentes Windows</li>
                <li>✓ Monitorización de EventIDs del firewall de Windows</li>
                <li>✓ Auditoría de reglas del firewall vía PowerShell (autodespliegue)</li>
                <li>✓ Comando de instalación del agente Wazuh en Windows</li>
              </>
            )}
            {config.enableOPNsense && <li>✓ Instrucciones paso a paso para configurar syslog en OPNsense</li>}
            {config.enablePfSense && <li>✓ Instrucciones paso a paso para configurar syslog en pfSense</li>}
            {config.enableIptablesUfw && (
              <>
                <li>✓ Configuración centralizada agent.conf para agentes Linux</li>
                <li>✓ Monitorización de logs de UFW e iptables (autodespliegue)</li>
                <li>✓ Habilitar logging de nivel alto en UFW</li>
                <li>✓ Comando de instalación del agente Wazuh en Linux</li>
              </>
            )}
            {config.enableRansomwareIDS && (
              <>
                <li>✓ Reglas IDS para detección de ransomware (50+ familias)</li>
                <li>✓ Script de aislamiento automático de red (Linux + Windows)</li>
                <li>✓ Active Response con timeout de 1 hora</li>
                <li>✓ La máquina infectada se aísla pero sigue reportando a Wazuh</li>
              </>
            )}
            <li>✓ Verificación de sintaxis y reinicio automático de Wazuh Manager</li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={!anySelected}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-heading font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Terminal className="w-5 h-5" /> Generar Script de Integración
        </button>
        {generated && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue-soft hover:opacity-90 transition-opacity"
          >
            <Download className="w-5 h-5" /> Descargar .sh
          </button>
        )}
        <button
          onClick={() => downloadManual(getFirewallIntegrationManual(), "manual-integracion-cortafuegos.md")}
          className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground font-heading font-bold rounded-lg border border-green-500/30 hover:bg-green-500/10 transition-colors"
        >
          <BookOpen className="w-5 h-5 text-green-500" /> Manual .md
        </button>
      </div>

      {generated && (
        <div className="relative">
          <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">bash</div>
          <pre className="terminal-bg p-4 rounded-lg border border-border overflow-x-auto max-h-96 overflow-y-auto">
            <code className="text-xs font-mono text-cyber-terminal whitespace-pre">{script.slice(0, 3000)}...</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default FirewallIntegrationConfigurator;
