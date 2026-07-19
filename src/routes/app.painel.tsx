import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/app/Dashboard";
import { useLeadsStore } from "@/stores";

export const Route = createFileRoute("/app/painel")({
  component: PainelPage,
  head: () => ({ meta: [{ title: "Painel — Radar Local" }] }),
});

function PainelPage() {
  const leads = useLeadsStore((s) => s.leads);
  return (
    <div className="h-full overflow-y-auto">
      <Dashboard leads={leads} />
    </div>
  );
}
