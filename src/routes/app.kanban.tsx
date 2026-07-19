import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KanbanBoard, KanbanTopBar } from "@/components/app/KanbanBoard";
import { useLeadsStore, useUIStore } from "@/stores";
import { applyFilters, sortLeads } from "@/lib/filters";

export const Route = createFileRoute("/app/kanban")({
  component: KanbanPage,
  head: () => ({ meta: [{ title: "Kanban — Radar Local" }] }),
});

function KanbanPage() {
  const leads = useLeadsStore((s) => s.leads);
  const filters = useLeadsStore((s) => s.filters);
  const sort = useLeadsStore((s) => s.sort);
  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);
  const selected = useLeadsStore((s) => s.selectedIds);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = sortLeads(applyFilters(leads, filters), sort);
    return search ? base.filter((l) => l.companyName.toLowerCase().includes(search.toLowerCase())) : base;
  }, [leads, filters, sort, search]);

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
      />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard leads={filtered} density={density} />
      </div>
    </div>
  );
}
