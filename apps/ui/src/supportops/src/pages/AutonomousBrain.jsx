import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function AutonomousBrain() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Autonomous Brain
        </h1>
      </div>

      {/* Runbook card */}
      <Card title="Runbook" hint="Automations and playbooks">
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Start Routine
          </Button>
          <Button
            variant="ghost"
            className="hover:bg-white/10 text-slate-200 border border-white/10"
          >
            View Logs
          </Button>
        </div>
      </Card>

      {/* Insight card */}
      <Card title="Insights" hint="System recommendations">
        <p className="text-slate-300 leading-relaxed">
          The Autonomous Brain continuously optimizes workflows and reduces
          manual intervention. Review logs to monitor automation efficiency and
          adjust playbooks for maximum impact.
        </p>
      </Card>
    </div>
  );
}