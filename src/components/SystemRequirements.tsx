import { Cpu, HardDrive, MemoryStick, CheckCircle, XCircle } from "lucide-react";

interface Requirement {
  label: string;
  icon: React.ReactNode;
  thehive: string;
  wazuh: string;
}

const requirements: Requirement[] = [
  {
    label: "RAM",
    icon: <MemoryStick className="w-5 h-5" />,
    thehive: "8 GB mínimo (16 GB recomendado)",
    wazuh: "4 GB mínimo (8 GB recomendado)",
  },
  {
    label: "CPU",
    icon: <Cpu className="w-5 h-5" />,
    thehive: "4 cores mínimo",
    wazuh: "2 cores mínimo",
  },
  {
    label: "Disco",
    icon: <HardDrive className="w-5 h-5" />,
    thehive: "50 GB mínimo (SSD recomendado)",
    wazuh: "30 GB mínimo (SSD recomendado)",
  },
];

const SystemRequirements = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-heading font-bold text-foreground text-center mb-8">
        Requisitos Mínimos del Sistema
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-mono text-sm text-muted-foreground">Recurso</th>
              <th className="px-4 py-3 text-left font-mono text-sm text-primary">TheHive + Cortex + MISP</th>
              <th className="px-4 py-3 text-left font-mono text-sm text-secondary">Wazuh SIEM</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr key={req.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-foreground flex items-center gap-2">
                  {req.icon}
                  {req.label}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-card-foreground">{req.thehive}</td>
                <td className="px-4 py-3 font-mono text-xs text-card-foreground">{req.wazuh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <h4 className="font-heading font-bold text-primary mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Incluido en los scripts
          </h4>
          <ul className="space-y-1 text-xs font-mono text-muted-foreground">
            <li>✓ Detección y adaptación automática de recursos</li>
            <li>✓ Configuración de firewall</li>
            <li>✓ Optimización del kernel</li>
            <li>✓ Docker con Cassandra, MinIO, ES, Redis</li>
            <li>✓ Acceso LAN (bind 0.0.0.0)</li>
            <li>✓ Generación de API Keys seguras</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <h4 className="font-heading font-bold text-secondary mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> Recomendaciones
          </h4>
          <ul className="space-y-1 text-xs font-mono text-muted-foreground">
            <li>→ Usa una instalación limpia del SO</li>
            <li>→ Configura un IP estático antes</li>
            <li>→ Realiza un snapshot/backup previo</li>
            <li>→ Ejecuta como root o con sudo</li>
            <li>→ Asegura conexión a internet estable</li>
            <li>→ Cambia contraseñas por defecto</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SystemRequirements;