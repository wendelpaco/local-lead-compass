import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { MapView } from "@/components/app/MapView";
import { useLeadsStore } from "@/stores";
import { applyFilters, sortLeads } from "@/lib/filters";
import { EmptyState } from "@/components/shared/EmptyState";
import { MapIcon } from "lucide-react";

export const Route = createFileRoute("/app/mapa")({
  component: MapaPage,
  head: () => ({ meta: [{ title: "Mapa — Radar Local" }] }),
});

function MapaPage() {
  const leads = useLeadsStore((s) => s.leads);
  const filters = useLeadsStore((s) => s.filters);
  const sort = useLeadsStore((s) => s.sort);
  const loaded = useLeadsStore((s) => s.loaded);
  const filtered = useMemo(() => sortLeads(applyFilters(leads, filters), sort), [leads, filters, sort]);

  if (!loaded && leads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-lg text-center space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-primary-foreground shadow-elevated">
            <MapIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Encontre sua próxima oportunidade local</h1>
          <p className="text-sm text-muted-foreground">Pesquise empresas por nicho e localização, identifique quem tem baixa presença digital e organize os leads em um funil comercial.</p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-left">
            {[
              "Descoberta e enriquecimento simulado de leads.",
              "Mapa, Kanban e painel sincronizados.",
              "Preparação de mensagens em massa.",
            ].map((b) => (
              <li key={b} className="rounded-lg border bg-surface p-3 text-xs text-muted-foreground">{b}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return <div className="grid h-full place-items-center"><EmptyState icon={MapIcon} title="Nenhum lead no mapa" description="Ajuste os filtros ou faça uma nova busca." /></div>;
  }

  return <MapView leads={filtered} />;
}
