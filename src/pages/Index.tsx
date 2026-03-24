import { Shield, Server, Terminal, Lock, Code2, Workflow, Search, MonitorSmartphone, Bug, Brain, Zap, Flame } from "lucide-react";
import { useState } from "react";
import TheHiveConfigurator from "@/components/TheHiveConfigurator";
import WazuhConfigurator from "@/components/WazuhConfigurator";
import ShuffleConfigurator from "@/components/ShuffleConfigurator";
import OpenCTIConfigurator from "@/components/OpenCTIConfigurator";
import VelociraptorConfigurator from "@/components/VelociraptorConfigurator";
import GRRConfigurator from "@/components/GRRConfigurator";
import FirewallIntegrationConfigurator from "@/components/FirewallIntegrationConfigurator";
import AIIntegrationConfigurator from "@/components/AIIntegrationConfigurator";
import SystemRequirements from "@/components/SystemRequirements";
import { downloadSourceAsZip } from "@/lib/downloadSource";

type TabKey = "thehive" | "wazuh" | "shuffle" | "opencti" | "velociraptor" | "grr" | "ai" | "firewalls";

const tabs: {key: TabKey;label: string;icon: React.ReactNode;color: string;activeClass: string;}[] = [
{ key: "thehive", label: "TheHive + Cortex + MISP", icon: <Shield className="w-4 h-4" />, color: "primary", activeClass: "bg-primary text-primary-foreground glow-blue" },
{ key: "wazuh", label: "Wazuh SIEM", icon: <Server className="w-4 h-4" />, color: "secondary", activeClass: "bg-secondary text-secondary-foreground glow-blue-soft" },
{ key: "shuffle", label: "Shuffle SOAR", icon: <Workflow className="w-4 h-4" />, color: "primary", activeClass: "bg-primary text-primary-foreground glow-blue" },
{ key: "opencti", label: "OpenCTI", icon: <Search className="w-4 h-4" />, color: "accent", activeClass: "bg-accent text-accent-foreground" },
{ key: "velociraptor", label: "Velociraptor", icon: <MonitorSmartphone className="w-4 h-4" />, color: "secondary", activeClass: "bg-secondary text-secondary-foreground glow-blue-soft" },
{ key: "grr", label: "GRR", icon: <Bug className="w-4 h-4" />, color: "destructive", activeClass: "bg-destructive text-destructive-foreground" },
{ key: "ai", label: "IA & Enrichment", icon: <Brain className="w-4 h-4" />, color: "primary", activeClass: "bg-primary text-primary-foreground glow-blue" },
{ key: "firewalls", label: "Cortafuegos", icon: <Flame className="w-4 h-4" />, color: "secondary", activeClass: "bg-green-600 text-white glow-blue" }];


const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("thehive");
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSource = async () => {
    setDownloading(true);
    try {await downloadSourceAsZip();} finally {setDownloading(false);}
  };

  const renderConfigurator = () => {
    switch (activeTab) {
      case "thehive":return <TheHiveConfigurator />;
      case "wazuh":return <WazuhConfigurator />;
      case "shuffle":return <ShuffleConfigurator />;
      case "opencti":return <OpenCTIConfigurator />;
      case "velociraptor":return <VelociraptorConfigurator />;
      case "grr":return <GRRConfigurator />;
      case "ai":return <AIIntegrationConfigurator />;
      case "firewalls":return <FirewallIntegrationConfigurator />;
    }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern relative overflow-hidden">
      <div className="scan-line fixed inset-0 pointer-events-none z-50" />
      <div className="hero-gradient fixed inset-0 pointer-events-none z-0" />

      {/* Hero */}
      <header className="relative z-10 pt-16 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-primary tracking-wider uppercase">SOC Security Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-heading font-bold text-foreground mb-6 glow-text leading-tight">
            SOC <span className="text-primary">Automation</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 font-mono leading-relaxed">
            Generador de scripts para{" "}
            <span className="text-primary">TheHive</span>,{" "}
            <span className="text-secondary">Cortex</span>,{" "}
            <span className="text-accent">MISP</span>,{" "}
            <span className="text-secondary">Wazuh</span>,{" "}
            <span className="text-primary">Shuffle</span>,{" "}
            <span className="text-accent">OpenCTI</span>,{" "}
            <span className="text-secondary">Velociraptor</span>,{" "}
            <span className="text-destructive">GRR</span>{" "}
            e integración <span className="text-primary">IA</span>
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a href="#configurator"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-all duration-300">
              <Terminal className="w-5 h-5" /> Generar Scripts
            </a>
            <button onClick={handleDownloadSource} disabled={downloading}
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground font-heading font-bold rounded-lg hover:bg-muted hover:border-primary/30 transition-all duration-300 disabled:opacity-50">
              <Code2 className="w-5 h-5" />
              {downloading ? "Generando ZIP..." : "Descargar Código Fuente (.zip)"}
            </button>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
          { icon: <Shield className="w-7 h-7 text-primary" />, title: "TheHive + Cortex + MISP", desc: "Respuesta a incidentes e inteligencia de amenazas con Cassandra, MinIO y Redis." },
          { icon: <Server className="w-7 h-7 text-secondary" />, title: "Wazuh SIEM", desc: "Detección de intrusiones y cumplimiento normativo. Multi-distro." },
          { icon: <Workflow className="w-7 h-7 text-primary" />, title: "Shuffle + OpenCTI", desc: "Orquestación SOAR y plataforma de Cyber Threat Intelligence." },
          { icon: <Brain className="w-7 h-7 text-accent" />, title: "IA & Enrichment", desc: "Ollama local, VirusTotal, AbuseIPDB, OTX AlienVault para enriquecer alertas." }].
          map((f, i) =>
          <div key={i} className="p-5 rounded-xl border border-border bg-card cyber-gradient card-hover">
              <div className="mb-3 animate-float" style={{ animationDelay: `${i * 0.5}s` }}>{f.icon}</div>
              <h3 className="text-sm font-heading font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground font-mono">{f.desc}</p>
            </div>
          )}
        </div>
      </section>

      {/* System Requirements */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto p-8 rounded-2xl border border-border bg-card gradient-border">
          <SystemRequirements />
        </div>
      </section>

      {/* Configurator */}
      <section id="configurator" className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground text-center mb-2 glow-text-soft">
            Configurador de Scripts
          </h2>
          <p className="text-center text-muted-foreground font-mono text-sm mb-10">
            Selecciona la herramienta, personaliza y genera tu script de instalación
          </p>

          {/* Tabs - responsive grid */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {tabs.map((tab) =>
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-heading font-bold text-xs transition-all duration-300 ${
              activeTab === tab.key ?
              tab.activeClass :
              "border border-border text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30"}`
              }>

                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )}
          </div>

          <div className="p-6 md:p-8 rounded-2xl border border-border bg-card gradient-border">
            {renderConfigurator()}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto text-center space-y-2">
          <p className="text-sm font-heading font-bold text-foreground glow-text-soft">
            By <span className="text-primary">Sistemas 127</span>
          </p>
          <p className="text-xs font-mono text-muted-foreground">


          </p>
        </div>
      </footer>
    </div>);
};

export default Index;