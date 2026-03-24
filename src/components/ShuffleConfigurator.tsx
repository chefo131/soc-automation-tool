import { useState } from "react";
import { Workflow, Download, Terminal, BookOpen } from "lucide-react";
import { generateShuffleScript, type ShuffleConfig } from "@/lib/socToolsGenerators";
import { downloadManual, getShuffleManual } from "@/lib/manualGenerators";

const ShuffleConfigurator = () => {
  const [config, setConfig] = useState<ShuffleConfig>({
    adminPassword: "Shuffle_S3cur3!", port: "3001", opensearchPort: "9201", serverIp: "auto", installDir: "/opt/shuffle",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => { setScript(generateShuffleScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "install-shuffle-soar.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const updateConfig = (key: keyof ShuffleConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const handleDownloadManual = () => { downloadManual(getShuffleManual(config), "manual-shuffle-soar.md"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Workflow className="w-8 h-8 text-primary" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">Shuffle SOAR</h3>
            <p className="text-xs font-mono text-muted-foreground">Orquestación y automatización de respuesta a incidentes</p>
          </div>
        </div>
        <button onClick={handleDownloadManual}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
        </button>
      </div>

      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-primary">Shuffle</strong> es la plataforma SOAR (Security Orchestration, Automation and Response) del SOC. Permite crear flujos de trabajo visuales que automatizan la respuesta a incidentes: por ejemplo, cuando Wazuh detecta una amenaza, Shuffle puede automáticamente crear un caso en TheHive, consultar VirusTotal, bloquear la IP en el firewall y enviar una notificación por Slack/Teams. Reduce drásticamente el tiempo de respuesta (MTTR) y elimina tareas repetitivas del equipo de analistas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ["adminPassword", "Contraseña Admin", "password"],
          ["port", "Puerto Frontend", "text"],
          ["opensearchPort", "Puerto OpenSearch", "text"],
          ["serverIp", "IP del Servidor (auto = detectar)", "text"],
          ["installDir", "Directorio de Instalación", "text"],
        ] as [keyof ShuffleConfig, string, string][]).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-sm font-mono text-muted-foreground mb-1.5">{label}</label>
            <input type={type} value={config[key]} onChange={e => updateConfig(key, e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity">
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

export default ShuffleConfigurator;
