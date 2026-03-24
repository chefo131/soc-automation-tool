import { useState } from "react";
import { Bug, Download, Terminal, BookOpen } from "lucide-react";
import { generateGRRScript, type GRRConfig } from "@/lib/socToolsGenerators";
import { downloadManual, getGRRManual } from "@/lib/manualGenerators";

const GRRConfigurator = () => {
  const [config, setConfig] = useState<GRRConfig>({
    adminPassword: "GRR_S3cur3!", guiPort: "8443", serverIp: "auto",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => { setScript(generateGRRScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "install-grr.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const updateConfig = (key: keyof GRRConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const handleDownloadManual = () => { downloadManual(getGRRManual(config), "manual-grr.md"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bug className="w-8 h-8 text-destructive" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">GRR Rapid Response</h3>
            <p className="text-xs font-mono text-muted-foreground">Framework de respuesta a incidentes y forense remoto (Google)</p>
          </div>
        </div>
        <button onClick={handleDownloadManual}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-destructive/30 transition-colors text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
        </button>
      </div>

      <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-destructive">GRR Rapid Response</strong> es el framework de respuesta a incidentes y forense remoto desarrollado por Google. Permite investigar y recopilar artefactos forenses de forma masiva en miles de máquinas: recoger memoria RAM, ficheros del disco, logs del sistema, procesos en ejecución y conexiones de red. Complementa a Velociraptor ofreciendo capacidades de respuesta a gran escala en entornos corporativos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ["adminPassword", "Contraseña Admin", "password"],
          ["guiPort", "Puerto Admin UI", "text"],
          ["serverIp", "IP del Servidor (auto = detectar)", "text"],
        ] as [keyof GRRConfig, string, string][]).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-sm font-mono text-muted-foreground mb-1.5">{label}</label>
            <input type={type} value={config[key]} onChange={e => updateConfig(key, e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive transition-colors" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground font-heading font-bold rounded-lg hover:opacity-90 transition-opacity">
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

export default GRRConfigurator;
