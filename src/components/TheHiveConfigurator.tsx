import { useState } from "react";
import { Shield, Download, Terminal, AlertTriangle, BookOpen } from "lucide-react";
import { generateTheHiveCortexMISPScript, generateRandomKey, type TheHiveConfig } from "@/lib/scriptGenerators";
import { downloadManual, getTheHiveManual } from "@/lib/manualGenerators";

const TheHiveConfigurator = () => {
  const [config, setConfig] = useState<TheHiveConfig>({
    orgName: "My SOC",
    adminEmail: "admin@soc.local",
    adminPassword: "Ch4ng3M3!S3cur3",
    thehivePort: "9000",
    cortexPort: "9001",
    mispPort: "443",
    elasticPassword: "Elastic_S3cur3!",
    mispApiKey: generateRandomKey(),
    cortexApiKey: generateRandomKey(),
    thehiveApiKey: generateRandomKey(),
    serverIp: "auto",
    installDir: "/opt/soc-stack",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => {
    const s = generateTheHiveCortexMISPScript(config);
    setScript(s);
    setGenerated(true);
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "install-thehive-cortex-misp.sh";
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateConfig = (key: keyof TheHiveConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setGenerated(false);
  };

  const regenerateKeys = () => {
    setConfig((prev) => ({
      ...prev,
      thehiveApiKey: generateRandomKey(),
      cortexApiKey: generateRandomKey(),
      mispApiKey: generateRandomKey(),
    }));
    setGenerated(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <h3 className="text-2xl font-heading font-bold text-foreground">
          TheHive + Cortex + MISP
        </h3>
      </div>

      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-primary">TheHive</strong> es la plataforma central de gestión de incidentes del SOC. Permite crear, asignar y seguir casos de seguridad de forma colaborativa.{" "}
          <strong className="text-secondary">Cortex</strong> es su motor de análisis automático sobre observables.{" "}
          <strong className="text-accent">MISP</strong> es la base de inteligencia de amenazas compartida. Juntos forman el núcleo de respuesta a incidentes de un SOC.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          ["orgName", "Nombre de Organización", "text"],
          ["adminEmail", "Email del Admin", "email"],
          ["adminPassword", "Contraseña Admin", "password"],
          ["elasticPassword", "Contraseña Elasticsearch/MinIO", "password"],
          ["thehivePort", "Puerto TheHive", "text"],
          ["cortexPort", "Puerto Cortex", "text"],
          ["mispPort", "Puerto MISP (HTTPS)", "text"],
          ["serverIp", "IP del Servidor (auto = detectar)", "text"],
          ["installDir", "Directorio de Instalación", "text"],
        ] as [keyof TheHiveConfig, string, string][]).map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-sm font-mono text-muted-foreground mb-1.5">
              {label}
            </label>
            <input
              type={type}
              value={config[key]}
              onChange={(e) => updateConfig(key, e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg border border-border bg-muted/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold font-mono text-foreground">API Keys Generadas</span>
          <button
            onClick={regenerateKeys}
            className="text-xs font-mono px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            🔄 Regenerar
          </button>
        </div>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">TheHive:</span>
            <span className="text-primary">{config.thehiveApiKey}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cortex:</span>
            <span className="text-secondary">{config.cortexApiKey}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">MISP:</span>
            <span className="text-accent">{config.mispApiKey}</span>
          </div>
        </div>
      </div>

      {generated && (
        <div className="p-4 rounded-lg border-2 border-warning bg-warning/10">
          <p className="blink-warning text-warning font-bold font-mono text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ⚠ COPIA Y GUARDA LAS API KEYS ANTES DE CONTINUAR ⚠
            <AlertTriangle className="w-5 h-5" />
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity"
        >
          <Terminal className="w-5 h-5" />
          Generar Script
        </button>
        {generated && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue-soft hover:opacity-90 transition-opacity"
          >
            <Download className="w-5 h-5" />
            Descargar .sh
          </button>
        )}
      </div>

      {generated && (
        <div className="relative">
          <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            bash
          </div>
          <pre className="terminal-bg p-4 rounded-lg border border-border overflow-x-auto max-h-96 overflow-y-auto">
            <code className="text-xs font-mono text-cyber-terminal whitespace-pre">
              {script.slice(0, 2000)}...
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default TheHiveConfigurator;