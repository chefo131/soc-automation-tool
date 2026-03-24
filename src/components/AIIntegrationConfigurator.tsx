import { useState } from "react";
import { Brain, Download, Terminal, BookOpen } from "lucide-react";
import { generateAIEnrichmentScript, type AIEnrichmentConfig } from "@/lib/aiIntegrationGenerators";
import { downloadManual, getAIEnrichmentManual } from "@/lib/manualGenerators";

const AIIntegrationConfigurator = () => {
  const [config, setConfig] = useState<AIEnrichmentConfig>({
    serverIp: "auto", ollamaModel: "llama3.2", ollamaPort: "11434",
    enableOllama: true, enableGemini: false, geminiApiKey: "", geminiModel: "gemini-2.0-flash",
    enableVirusTotal: true, virustotalApiKey: "",
    enableAbuseIPDB: true, abuseipdbApiKey: "", enableOTX: true, otxApiKey: "",
    thehiveUrl: "", thehiveApiKey: "", wazuhIntegration: true,
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");

  const handleGenerate = () => { setScript(generateAIEnrichmentScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "install-ai-enrichment.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const toggle = (key: keyof AIEnrichmentConfig) => { setConfig(prev => ({ ...prev, [key]: !prev[key as keyof AIEnrichmentConfig] })); setGenerated(false); };
  const update = (key: keyof AIEnrichmentConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const handleDownloadManual = () => { downloadManual(getAIEnrichmentManual(config), "manual-ia-enrichment.md"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground">Integración IA & Threat Intelligence</h3>
            <p className="text-xs font-mono text-muted-foreground">Enriquecimiento automático de alertas con IA y fuentes de inteligencia</p>
          </div>
        </div>
        <button onClick={handleDownloadManual}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
        </button>
      </div>

      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          Este módulo añade <strong className="text-primary">inteligencia artificial y enriquecimiento automático</strong> al SOC.{" "}
          <strong className="text-primary">Ollama</strong> ejecuta modelos LLM locales (Llama 3, Mistral) para analizar alertas con IA sin enviar datos a la nube.{" "}
          <strong className="text-primary">Google Gemini</strong> proporciona análisis avanzado en la nube con modelos de última generación.{" "}
          <strong className="text-primary">VirusTotal</strong>, <strong className="text-primary">AbuseIPDB</strong> y <strong className="text-primary">OTX AlienVault</strong> enriquecen automáticamente IPs, hashes y dominios sospechosos con threat intelligence externa.
        </p>
      </div>

      {/* General config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">IP del Servidor (auto = detectar)</label>
          <input type="text" value={config.serverIp} onChange={e => update("serverIp", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">URL TheHive (para webhook)</label>
          <input type="text" value={config.thehiveUrl} onChange={e => update("thehiveUrl", e.target.value)}
            placeholder="http://192.168.1.100:9000"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-mono text-muted-foreground mb-1.5">API Key TheHive</label>
          <input type="text" value={config.thehiveApiKey} onChange={e => update("thehiveApiKey", e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors" />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.wazuhIntegration} onChange={() => toggle("wazuhIntegration")} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-mono text-muted-foreground">Integrar con Wazuh Active Response</span>
          </label>
        </div>
      </div>

      {/* Module toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ollama */}
        <div className={`p-4 rounded-lg border ${config.enableOllama ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'} transition-colors`}>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={config.enableOllama} onChange={() => toggle("enableOllama")} className="w-4 h-4 accent-primary" />
            <span className="font-heading font-bold text-foreground text-sm">🧠 Ollama (LLM Local)</span>
          </label>
          {config.enableOllama && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Modelo</label>
                <select value={config.ollamaModel} onChange={e => update("ollamaModel", e.target.value)}
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground">
                  <option value="llama3.2">Llama 3.2 (8B - Recomendado)</option>
                  <option value="llama3.2:1b">Llama 3.2 (1B - Ligero)</option>
                  <option value="mistral">Mistral 7B</option>
                  <option value="phi3">Phi-3 Mini</option>
                  <option value="gemma2:2b">Gemma 2 (2B - Muy ligero)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Puerto</label>
                <input type="text" value={config.ollamaPort} onChange={e => update("ollamaPort", e.target.value)}
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Gratuito, 100% privado. Requiere 4GB+ RAM. Detiene instancias previas automáticamente.</p>
            </div>
          )}
        </div>

        {/* Google Gemini */}
        <div className={`p-4 rounded-lg border ${config.enableGemini ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'} transition-colors`}>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={config.enableGemini} onChange={() => toggle("enableGemini")} className="w-4 h-4 accent-primary" />
            <span className="font-heading font-bold text-foreground text-sm">✨ Google Gemini (IA Cloud)</span>
          </label>
          {config.enableGemini && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Modelo</label>
                <select value={config.geminiModel} onChange={e => update("geminiModel", e.target.value)}
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Rápido - Recomendado)</option>
                  <option value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro (Más potente)</option>
                  <option value="gemini-2.5-flash-preview-05-20">Gemini 2.5 Flash (Equilibrado)</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Económico)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">API Key (gratuita en aistudio.google.com)</label>
                <input type="text" value={config.geminiApiKey} onChange={e => update("geminiApiKey", e.target.value)}
                  placeholder="Tu API key de Google AI Studio"
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">15 RPM gratis. Análisis avanzado con razonamiento multimodal.</p>
              {config.enableOllama && (
                <p className="text-xs text-primary font-semibold">⚡ Modo dual: analiza con IA local + cloud y compara resultados.</p>
              )}
            </div>
          )}
        </div>

        {/* VirusTotal */}
        <div className={`p-4 rounded-lg border ${config.enableVirusTotal ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'} transition-colors`}>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={config.enableVirusTotal} onChange={() => toggle("enableVirusTotal")} className="w-4 h-4 accent-primary" />
            <span className="font-heading font-bold text-foreground text-sm">🔍 VirusTotal</span>
          </label>
          {config.enableVirusTotal && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">API Key (gratuita en virustotal.com)</label>
                <input type="text" value={config.virustotalApiKey} onChange={e => update("virustotalApiKey", e.target.value)}
                  placeholder="Tu API key de VirusTotal"
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">4 consultas/minuto en plan gratuito.</p>
            </div>
          )}
        </div>

        {/* AbuseIPDB */}
        <div className={`p-4 rounded-lg border ${config.enableAbuseIPDB ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'} transition-colors`}>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={config.enableAbuseIPDB} onChange={() => toggle("enableAbuseIPDB")} className="w-4 h-4 accent-primary" />
            <span className="font-heading font-bold text-foreground text-sm">🛡️ AbuseIPDB</span>
          </label>
          {config.enableAbuseIPDB && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">API Key (gratuita en abuseipdb.com)</label>
                <input type="text" value={config.abuseipdbApiKey} onChange={e => update("abuseipdbApiKey", e.target.value)}
                  placeholder="Tu API key de AbuseIPDB"
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">1000 consultas/día gratis.</p>
            </div>
          )}
        </div>

        {/* OTX */}
        <div className={`p-4 rounded-lg border ${config.enableOTX ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'} transition-colors`}>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" checked={config.enableOTX} onChange={() => toggle("enableOTX")} className="w-4 h-4 accent-primary" />
            <span className="font-heading font-bold text-foreground text-sm">👽 OTX AlienVault</span>
          </label>
          {config.enableOTX && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">API Key (gratuita en otx.alienvault.com)</label>
                <input type="text" value={config.otxApiKey} onChange={e => update("otxApiKey", e.target.value)}
                  placeholder="Tu API key de OTX"
                  className="w-full px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Sin límite. Threat intelligence abierta.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity">
          <Terminal className="w-5 h-5" /> Generar Script de Integración
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
            <code className="text-xs font-mono text-cyber-terminal whitespace-pre">{script.slice(0, 3000)}...</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default AIIntegrationConfigurator;
