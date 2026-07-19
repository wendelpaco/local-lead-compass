import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  KanbanBoard,
  KanbanTopBar,
  applyKanbanFilters,
  EMPTY_KANBAN_FILTERS,
  type KanbanFilters,
} from "@/components/app/KanbanBoard";
import { useLeadsStore, useUIStore } from "@/stores";
import { applyFilters, sortLeads } from "@/lib/filters";
import { LeadListSkeleton } from "@/components/shared/Skeletons";

export const Route = createFileRoute("/app/kanban")({
  component: KanbanPage,
  head: () => ({ meta: [{ title: "Kanban — Radar Local" }] }),
});

function KanbanPage() {
  const leads = useLeadsStore((s) => s.leads);
  const filters = useLeadsStore((s) => s.filters);
  const sort = useLeadsStore((s) => s.sort);
  const searching = useLeadsStore((s) => s.searching);
  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);
  const selected = useLeadsStore((s) => s.selectedIds);
  const [search, setSearch] = useState("");
  const [kFilters, setKFilters] = useState<KanbanFilters>(EMPTY_KANBAN_FILTERS);

  const cities = useMemo(() => [...new Set(leads.map((l) => l.city))].sort(), [leads]);
  const categories = useMemo(() => [...new Set(leads.map((l) => l.category))].sort(), [leads]);

  const filtered = useMemo(() => {
    let base = sortLeads(applyFilters(leads, filters), sort);
    base = applyKanbanFilters(base, kFilters);
    return search
      ? base.filter((l) => l.companyName.toLowerCase().includes(search.toLowerCase()))
      : base;
  }, [leads, filters, sort, search, kFilters]);

  if (searching && leads.length === 0) {
    return <LeadListSkeleton count={8} />;
  }

  return (
    <div className="flex h-full flex-col">
      <KanbanTopBar
        search={search}
        setSearch={setSearch}
        density={density}
        setDensity={setDensity}
        count={filtered.length}
        selected={selected.length}
        onPrepareMessages={() => window.dispatchEvent(new CustomEvent("open-bulk-messages"))}
        filters={kFilters}
        setFilters={setKFilters}
        cities={cities}
        categories={categories}
      />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard leads={filtered} density={density} />
      </div>
    </div>
  );
}
