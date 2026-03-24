import { useState } from "react";
import { MonitorSmartphone, Download, Terminal, BookOpen } from "lucide-react";
import { generateVelociraptorScript, type VelociraptorConfig } from "@/lib/socToolsGenerators";
import { downloadManual, getVelociraptorManual } from "@/lib/manualGenerators";

const VelociraptorConfigurator = () => {
  const [config, setConfig] = useState<VelociraptorConfig>({
    adminPassword: "Velox_S3cur3!", guiPort: "8889", frontendPort: "8000", serverIp: "auto",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => { setScript(generateVelociraptorScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "install-velociraptor.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const updateConfig = (key: keyof VelociraptorConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const handleDownloadManual = () => { downloadManual(getVelociraptorManual(config), "manual-velociraptor.md"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MonitorSmartphone className="w-8 h-8 text-secondary" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">Velociraptor</h3>
            <p className="text-xs font-mono text-muted-foreground">Monitorización de endpoints y forense digital</p>
          </div>
        </div>
        <button onClick={handleDownloadManual}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-secondary/30 transition-colors text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
        </button>
      </div>

      <div className="p-4 rounded-lg border border-secondary/20 bg-secondary/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-secondary">Velociraptor</strong> es la herramienta de endpoint detection and response (EDR) y forense digital del SOC. Permite hacer consultas forenses en tiempo real sobre miles de endpoints simultáneamente usando VQL (Velociraptor Query Language): buscar procesos sospechosos, ficheros maliciosos, conexiones de red anómalas, artefactos de persistencia y evidencia forense. Ideal para threat hunting proactivo y respuesta rápida ante incidentes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ["adminPassword", "Contraseña Admin", "password"],
          ["guiPort", "Puerto GUI Web", "text"],
          ["frontendPort", "Puerto Frontend (Agentes)", "text"],
          ["serverIp", "IP del Servidor (auto = detectar)", "text"],
        ] as [keyof VelociraptorConfig, string, string][]).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-sm font-mono text-muted-foreground mb-1.5">{label}</label>
            <input type={type} value={config[key]} onChange={e => updateConfig(key, e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue-soft hover:opacity-90 transition-opacity">
          <Terminal className="w-5 h-5" /> Generar Script
        </button>
        {generated && (
          <button onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity">
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

export default VelociraptorConfigurator;
