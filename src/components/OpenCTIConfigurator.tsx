import { useState } from "react";
import { Search, Download, Terminal, BookOpen } from "lucide-react";
import { generateOpenCTIScript, type OpenCTIConfig } from "@/lib/socToolsGenerators";
import { downloadManual, getOpenCTIManual } from "@/lib/manualGenerators";

const OpenCTIConfigurator = () => {
  const [config, setConfig] = useState<OpenCTIConfig>({
    adminEmail: "admin@opencti.local", adminPassword: "OpenCTI_S3cur3!",
    port: "8080", connectorPort: "4000", serverIp: "auto", mispUrl: "", mispApiKey: "",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => { setScript(generateOpenCTIScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "install-opencti.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const updateConfig = (key: keyof OpenCTIConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const handleDownloadManual = () => { downloadManual(getOpenCTIManual(config), "manual-opencti.md"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8 text-accent" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">OpenCTI</h3>
            <p className="text-xs font-mono text-muted-foreground">Plataforma de inteligencia de amenazas (Cyber Threat Intelligence)</p>
          </div>
        </div>
        <button onClick={handleDownloadManual}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-accent/30 transition-colors text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
        </button>
      </div>

      <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-accent">OpenCTI</strong> es la plataforma de Cyber Threat Intelligence (CTI) del SOC. Centraliza, estructura y visualiza toda la inteligencia de amenazas en formato STIX2: indicadores de compromiso (IoCs), TTPs de atacantes (MITRE ATT&CK), campañas, actores de amenazas y vulnerabilidades. Se integra con MISP, TheHive y fuentes externas (CIRCL, AlienVault OTX) para dar a los analistas una visión completa del panorama de amenazas que afecta a la organización.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ["adminEmail", "Email Admin", "email"],
          ["adminPassword", "Contraseña Admin", "password"],
          ["port", "Puerto Web UI", "text"],
          ["serverIp", "IP del Servidor (auto = detectar)", "text"],
          ["mispUrl", "URL MISP (opcional, para integración)", "text"],
          ["mispApiKey", "API Key MISP (opcional)", "text"],
        ] as [keyof OpenCTIConfig, string, string][]).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-sm font-mono text-muted-foreground mb-1.5">{label}</label>
            <input type={type} value={config[key]} onChange={e => updateConfig(key, e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-heading font-bold rounded-lg hover:opacity-90 transition-opacity">
          <Terminal className="w-5 h-5" /> Generar Script
        </button>
        {generated && (
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue-soft hover:opacity-90 transition-opacity">
            <Download className="w-5 h-5" /> Descargar .sh
          </button>
        )}
      </div>

      {generated && (
        <div className="relative">
          <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">bash</div>
          <pre className="terminal-bg p-4 rounded-lg border border-border overflow-x-auto max-h-96 overflow-y-auto">
            <code className="text-xs font-mono text-cyber-terminal whitespace-pre">{script.slice(0, 2000)}...</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default OpenCTIConfigurator;
