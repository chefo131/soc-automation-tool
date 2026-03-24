import { useState, useMemo } from "react";
import { Server, Download, Terminal, AlertTriangle, BookOpen, ShieldAlert, Zap, Search, CheckSquare, Square, ExternalLink } from "lucide-react";
import { generateWazuhScript, generateSOCFortressRulesScript, generateWazuhActiveResponseScript, SOCFORTRESS_RULES, SOCFORTRESS_CATEGORIES, type WazuhConfig, type WazuhActiveResponseConfig } from "@/lib/scriptGenerators";
import { downloadManual, getWazuhManual, getWazuhRulesManual, getWazuhActiveResponseManual } from "@/lib/manualGenerators";

const distros = ["Ubuntu 24.04", "Debian", "AlmaLinux", "CentOS 8", "Oracle Linux 9", "Arch Linux"];
const wazuhVersions = ["4.14", "4.12", "4.9"];

const WazuhConfigurator = () => {
  const [config, setConfig] = useState<WazuhConfig>({
    distro: "Ubuntu 24.04", wazuhVersion: "4.14", adminPassword: "W4zuh_S3cur3!",
    apiPort: "55000", dashboardPort: "443", serverIp: "auto",
  });
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [arConfig, setArConfig] = useState<WazuhActiveResponseConfig>({
    enableBlockIP: true, enableDisableUser: true, enableIsolateHost: true,
    enableKillProcess: true, enableCollectForensics: true,
    enableLinuxBlockIP: true, enableLinuxDisableUser: true, enableLinuxIsolateHost: true,
    enableLinuxKillProcess: true, enableLinuxCollectForensics: true,
    enableAutoDeployWindows: true, enableAutoDeployLinux: true,
    wazuhServerIp: "", wazuhApiUser: "wazuh-wui", wazuhApiPassword: "",
  });
  const [generated, setGenerated] = useState(false);
  const [script, setScript] = useState("");
  const [rulesGenerated, setRulesGenerated] = useState(false);
  const [rulesScript, setRulesScript] = useState("");
  const [arGenerated, setArGenerated] = useState(false);
  const [arScript, setArScript] = useState("");
  const [activeSection, setActiveSection] = useState<"install" | "rules" | "active-response">("install");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(SOCFORTRESS_CATEGORIES.map(c => c.id));

  const handleGenerate = () => { setScript(generateWazuhScript(config)); setGenerated(true); };
  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = `install-wazuh-${config.distro.toLowerCase().replace(/\s+/g, "-")}.sh`; a.click(); URL.revokeObjectURL(url);
  };
  const handleGenerateRules = () => { setRulesScript(generateSOCFortressRulesScript(selectedRules)); setRulesGenerated(true); };
  const handleDownloadRules = () => {
    const blob = new Blob([rulesScript], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = "install-socfortress-rules.sh"; a.click(); URL.revokeObjectURL(url);
  };
  const handleGenerateAR = () => { setArScript(generateWazuhActiveResponseScript(arConfig)); setArGenerated(true); };
  const handleDownloadAR = () => {
    const blob = new Blob([arScript], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
    a.download = "install-wazuh-active-response.sh"; a.click(); URL.revokeObjectURL(url);
  };

  const updateConfig = (key: keyof WazuhConfig, value: string) => { setConfig(prev => ({ ...prev, [key]: value })); setGenerated(false); };
  const toggleAR = (key: keyof WazuhActiveResponseConfig) => { setArConfig(prev => ({ ...prev, [key]: !prev[key as keyof WazuhActiveResponseConfig] })); setArGenerated(false); };
  const updateAR = (key: keyof WazuhActiveResponseConfig, value: string) => { setArConfig(prev => ({ ...prev, [key]: value })); setArGenerated(false); };

  const toggleRule = (ruleId: string) => {
    setSelectedRules(prev =>
      prev.includes(ruleId) ? prev.filter(r => r !== ruleId) : [...prev, ruleId]
    );
    setRulesGenerated(false);
  };

  const toggleCategory = (categoryId: string) => {
    const categoryRules = SOCFORTRESS_RULES.filter(r => r.category === categoryId).map(r => r.id);
    const allSelected = categoryRules.every(id => selectedRules.includes(id));
    if (allSelected) {
      setSelectedRules(prev => prev.filter(id => !categoryRules.includes(id)));
    } else {
      setSelectedRules(prev => [...new Set([...prev, ...categoryRules])]);
    }
    setRulesGenerated(false);
  };

  const selectAll = () => {
    setSelectedRules(SOCFORTRESS_RULES.map(r => r.id));
    setRulesGenerated(false);
  };
  const selectNone = () => { setSelectedRules([]); setRulesGenerated(false); };

  const toggleExpandCategory = (catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const filteredRules = useMemo(() => {
    if (!searchTerm) return SOCFORTRESS_RULES;
    const term = searchTerm.toLowerCase();
    return SOCFORTRESS_RULES.filter(r =>
      r.label.toLowerCase().includes(term) ||
      r.desc.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term) ||
      r.folder.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleDownloadManual = () => {
    if (activeSection === "install") downloadManual(getWazuhManual(config), "manual-wazuh.md");
    else if (activeSection === "rules") downloadManual(getWazuhRulesManual(), "manual-wazuh-reglas.md");
    else downloadManual(getWazuhActiveResponseManual(), "manual-wazuh-active-response.md");
  };

  const windowsARCategories: { key: keyof WazuhActiveResponseConfig; label: string; desc: string }[] = [
    { key: "enableBlockIP", label: "🛡️ Bloqueo de IP", desc: "Bloquea IPs atacantes via Windows Firewall (inbound + outbound)" },
    { key: "enableDisableUser", label: "👤 Deshabilitar Usuario", desc: "Deshabilita cuentas locales y AD comprometidas" },
    { key: "enableIsolateHost", label: "🔒 Aislamiento de Host", desc: "Aislamiento total de red, solo permite comunicación con Wazuh" },
    { key: "enableKillProcess", label: "💀 Matar Proceso", desc: "Termina procesos maliciosos con recolección forense previa" },
    { key: "enableCollectForensics", label: "🔍 Recolección Forense", desc: "Captura conexiones, procesos, eventos, autoruns, DNS cache, ARP" },
  ];

  const linuxARCategories: { key: keyof WazuhActiveResponseConfig; label: string; desc: string }[] = [
    { key: "enableLinuxBlockIP", label: "🛡️ Bloqueo de IP", desc: "iptables + nftables + firewalld automático" },
    { key: "enableLinuxDisableUser", label: "👤 Deshabilitar Usuario", desc: "Bloquea cuenta, expira y mata sesiones activas" },
    { key: "enableLinuxIsolateHost", label: "🔒 Aislamiento de Host", desc: "DROP total via iptables, solo permite Wazuh" },
    { key: "enableLinuxKillProcess", label: "💀 Matar Proceso", desc: "Kill -9 con protección de procesos críticos del sistema" },
    { key: "enableLinuxCollectForensics", label: "🔍 Recolección Forense", desc: "ss, ps, lsof, last, crontabs, módulos kernel, archivos recientes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 text-secondary" />
          <h3 className="text-2xl font-heading font-bold text-foreground">Wazuh SIEM</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadManual}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted hover:border-secondary/30 transition-colors text-muted-foreground hover:text-foreground">
            <BookOpen className="w-4 h-4" /> Descargar Manual (.md)
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-secondary/20 bg-secondary/5">
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          <strong className="text-secondary">Wazuh</strong> es el SIEM/XDR open source del SOC. Recopila logs de todos los endpoints y servidores, detecta intrusiones en tiempo real (HIDS), monitoriza la integridad de ficheros (FIM), evalúa el cumplimiento normativo (PCI-DSS, GDPR, HIPAA) y permite respuesta activa ante amenazas.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveSection("install")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-bold text-xs transition-all ${
            activeSection === "install"
              ? "bg-secondary text-secondary-foreground glow-blue-soft"
              : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
          <Terminal className="w-4 h-4" /> Instalación Wazuh
        </button>
        <button onClick={() => setActiveSection("rules")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-bold text-xs transition-all ${
            activeSection === "rules"
              ? "bg-secondary text-secondary-foreground glow-blue-soft"
              : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
          <ShieldAlert className="w-4 h-4" /> SOCFortress Rules
        </button>
        <button onClick={() => setActiveSection("active-response")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-bold text-xs transition-all ${
            activeSection === "active-response"
              ? "bg-orange-600 text-white glow-blue-soft"
              : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
          <Zap className="w-4 h-4" /> Active Response
        </button>
      </div>

      {activeSection === "install" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-mono text-muted-foreground mb-1.5">Distribución Linux</label>
              <select value={config.distro} onChange={e => updateConfig("distro", e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors">
                {distros.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-mono text-muted-foreground mb-1.5">Versión de Wazuh</label>
              <select value={config.wazuhVersion} onChange={e => updateConfig("wazuhVersion", e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors">
                {wazuhVersions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {([
              ["adminPassword", "Contraseña Admin", "password"],
              ["apiPort", "Puerto API", "text"],
              ["dashboardPort", "Puerto Dashboard", "text"],
              ["serverIp", "IP del Servidor (auto = detectar)", "text"],
            ] as [keyof WazuhConfig, string, string][]).map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-sm font-mono text-muted-foreground mb-1.5">{label}</label>
                <input type={type} value={config[key]} onChange={e => updateConfig(key, e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors" />
              </div>
            ))}
          </div>

          {generated && (
            <div className="p-4 rounded-lg border-2 border-warning bg-warning/10">
              <p className="blink-warning text-warning font-bold font-mono text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" /> ⚠ GUARDA LAS CREDENCIALES DEL RESUMEN FINAL ⚠ <AlertTriangle className="w-5 h-5" />
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleGenerate}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity">
              <Terminal className="w-5 h-5" /> Generar Script Instalación
            </button>
            {generated && (
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-green hover:opacity-90 transition-opacity">
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
        </>
      ) : activeSection === "rules" ? (
        <>
          {/* SOCFortress Rules section */}
          <div className="p-4 rounded-lg border border-secondary/20 bg-secondary/5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                  Reglas avanzadas de detección de la comunidad <strong className="text-secondary">SOCFortress</strong>. Selecciona las categorías que necesites e instálalas directamente desde el repositorio oficial de GitHub. Cada carpeta incluye ficheros XML de reglas, decodificadores y scripts de integración.
                </p>
                <a href="https://github.com/socfortress/Wazuh-Rules" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline mt-2">
                  <ExternalLink className="w-3 h-3" /> github.com/socfortress/Wazuh-Rules
                </a>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              ⚠️ <strong className="text-foreground">Importante:</strong> Si ya tienes reglas personalizadas, asegúrate de que no haya IDs de regla duplicados. El script crea un backup automático antes de instalar. Cada carpeta del repositorio contiene un <code className="text-primary">README.md</code> con instrucciones específicas de configuración para esa integración.
            </p>
          </div>

          {/* Search + Select all/none */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar reglas (ej: sysmon, phishing, aws...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-md font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll}
                className="flex items-center gap-1 px-3 py-2 text-xs font-mono border border-border rounded-lg hover:bg-secondary/10 hover:border-secondary/30 transition-colors text-muted-foreground hover:text-foreground">
                <CheckSquare className="w-3.5 h-3.5" /> Todas
              </button>
              <button onClick={selectNone}
                className="flex items-center gap-1 px-3 py-2 text-xs font-mono border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Square className="w-3.5 h-3.5" /> Ninguna
              </button>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {selectedRules.length} de {SOCFORTRESS_RULES.length} seleccionadas
            </span>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {SOCFORTRESS_CATEGORIES.map(cat => {
              const catRules = filteredRules.filter(r => r.category === cat.id);
              if (catRules.length === 0) return null;
              const allCatSelected = catRules.every(r => selectedRules.includes(r.id));
              const someCatSelected = catRules.some(r => selectedRules.includes(r.id));
              const isExpanded = expandedCategories.includes(cat.id);

              return (
                <div key={cat.id} className="rounded-lg border border-border overflow-hidden">
                  {/* Category header */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      someCatSelected ? 'bg-secondary/10 border-secondary/20' : 'bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={allCatSelected}
                      ref={el => { if (el) el.indeterminate = someCatSelected && !allCatSelected; }}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-4 h-4 accent-secondary flex-shrink-0"
                    />
                    <div className="flex-1 flex items-center gap-2" onClick={() => toggleExpandCategory(cat.id)}>
                      <span className="font-heading font-bold text-foreground text-sm">{cat.label}</span>
                      <span className="text-xs font-mono text-muted-foreground">— {cat.desc}</span>
                      <span className="ml-auto text-xs font-mono text-muted-foreground">
                        {catRules.filter(r => selectedRules.includes(r.id)).length}/{catRules.length}
                      </span>
                      <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </div>
                  </div>

                  {/* Individual rules */}
                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-border">
                      {catRules.map(rule => (
                        <div
                          key={rule.id}
                          className={`flex items-start gap-2 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-b-0 ${
                            selectedRules.includes(rule.id) ? 'bg-secondary/5' : 'hover:bg-muted/30'
                          }`}
                          onClick={() => toggleRule(rule.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRules.includes(rule.id)}
                            onChange={() => toggleRule(rule.id)}
                            className="w-3.5 h-3.5 accent-secondary mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-bold text-foreground text-xs">{rule.label}</span>
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{rule.folder}</span>
                            </div>
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 leading-relaxed">{rule.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerateRules} disabled={selectedRules.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-heading font-bold rounded-lg glow-blue hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              <ShieldAlert className="w-5 h-5" /> Generar Script ({selectedRules.length} reglas)
            </button>
            {rulesGenerated && (
              <button onClick={handleDownloadRules}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-green hover:opacity-90 transition-opacity">
                <Download className="w-5 h-5" /> Descargar .sh
              </button>
            )}
          </div>

          {rulesGenerated && (
            <div className="relative">
              <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">bash</div>
              <pre className="terminal-bg p-4 rounded-lg border border-border overflow-x-auto max-h-96 overflow-y-auto">
                <code className="text-xs font-mono text-cyber-terminal whitespace-pre">{rulesScript.slice(0, 3000)}...</code>
              </pre>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Active Response section */}
          <div className="p-4 rounded-lg border border-orange-500/20 bg-orange-500/5">
            <p className="text-sm font-mono text-muted-foreground leading-relaxed">
              <strong className="text-orange-400">Active Response</strong> permite ejecutar acciones automáticas en los agentes cuando se detectan amenazas: bloqueo de IPs, deshabilitación de usuarios, aislamiento de red, eliminación de procesos maliciosos y recolección forense. Los scripts se despliegan automáticamente a los agentes Windows y Linux.
            </p>
          </div>

          {/* Server IP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">IP del Servidor Wazuh (para aislamiento)</label>
              <input type="text" value={arConfig.wazuhServerIp} onChange={e => updateAR("wazuhServerIp", e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-2 py-1.5 bg-muted border border-border rounded text-xs font-mono text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Usuario API Wazuh</label>
              <input type="text" value={arConfig.wazuhApiUser} onChange={e => updateAR("wazuhApiUser", e.target.value)}
                className="w-full px-2 py-1.5 bg-muted border border-border rounded text-xs font-mono text-foreground" />
            </div>
          </div>

          {/* Windows AR */}
          <div>
            <h4 className="font-heading font-bold text-foreground text-sm mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-mono">WINDOWS</span>
              Active Response - Windows / Windows Server
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {windowsARCategories.map(cat => (
                <div key={cat.key}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    arConfig[cat.key] ? 'border-blue-500/50 bg-blue-500/5' : 'border-border bg-muted/30'
                  }`}
                  onClick={() => toggleAR(cat.key)}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!arConfig[cat.key]} onChange={() => toggleAR(cat.key)} className="w-4 h-4 accent-blue-500" />
                    <span className="font-heading font-bold text-foreground text-sm">{cat.label}</span>
                  </label>
                  <p className="text-xs font-mono text-muted-foreground mt-1 ml-6">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Linux AR */}
          <div>
            <h4 className="font-heading font-bold text-foreground text-sm mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-mono">LINUX</span>
              Active Response - Linux
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linuxARCategories.map(cat => (
                <div key={cat.key}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    arConfig[cat.key] ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-muted/30'
                  }`}
                  onClick={() => toggleAR(cat.key)}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!arConfig[cat.key]} onChange={() => toggleAR(cat.key)} className="w-4 h-4 accent-green-500" />
                    <span className="font-heading font-bold text-foreground text-sm">{cat.label}</span>
                  </label>
                  <p className="text-xs font-mono text-muted-foreground mt-1 ml-6">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-deploy */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-heading font-bold text-orange-400 text-sm mb-3">🚀 Auto-Despliegue a Agentes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                arConfig.enableAutoDeployWindows ? 'border-blue-500/50 bg-blue-500/5' : 'border-border bg-muted/30'
              }`} onClick={() => toggleAR("enableAutoDeployWindows")}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={arConfig.enableAutoDeployWindows} onChange={() => toggleAR("enableAutoDeployWindows")} className="w-4 h-4 accent-blue-500" />
                  <span className="font-heading font-bold text-foreground text-sm">📦 Deploy Windows</span>
                </label>
                <p className="text-xs font-mono text-muted-foreground mt-1 ml-6">Scripts PS1 + agent.conf con Sysmon, PowerShell logs, Defender, FIM del registro</p>
              </div>
              <div className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                arConfig.enableAutoDeployLinux ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-muted/30'
              }`} onClick={() => toggleAR("enableAutoDeployLinux")}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={arConfig.enableAutoDeployLinux} onChange={() => toggleAR("enableAutoDeployLinux")} className="w-4 h-4 accent-green-500" />
                  <span className="font-heading font-bold text-foreground text-sm">📦 Deploy Linux</span>
                </label>
                <p className="text-xs font-mono text-muted-foreground mt-1 ml-6">Scripts Bash + agent.conf con audit, rootcheck, FIM /etc, /usr/bin</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleGenerateAR}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white font-heading font-bold rounded-lg hover:opacity-90 transition-opacity">
              <Zap className="w-5 h-5" /> Generar Script Active Response
            </button>
            {arGenerated && (
              <button onClick={handleDownloadAR}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold rounded-lg glow-green hover:opacity-90 transition-opacity">
                <Download className="w-5 h-5" /> Descargar .sh
              </button>
            )}
          </div>

          {arGenerated && (
            <div className="relative">
              <div className="absolute top-2 right-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">bash</div>
              <pre className="terminal-bg p-4 rounded-lg border border-border overflow-x-auto max-h-96 overflow-y-auto">
                <code className="text-xs font-mono text-cyber-terminal whitespace-pre">{arScript.slice(0, 4000)}...</code>
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WazuhConfigurator;
