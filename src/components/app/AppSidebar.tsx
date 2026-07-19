import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Radar, Moon, Sun, MapIcon, LayoutGrid, BarChart3, FileDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore, useLeadsStore, applyPresenceFilter } from "@/stores";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { SearchForm } from "./SearchForm";
import { QuickFilters, SortSelect, AdvancedFilters } from "./Filters";
import { LeadCard } from "./LeadCard";
import { MessageTemplateDialog } from "./MessageTemplateDialog";
import { HistoryDrawer } from "./HistoryDrawer";
import { SettingsDialog } from "./SettingsDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { applyFilters, sortLeads } from "@/lib/filters";
import { exportCSV, exportExcel } from "@/lib/export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BulkBar } from "./BulkBar";
import { Search } from "lucide-react";

export function AppSidebar() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const leads = useLeadsStore((s) => s.leads);
  const search = useLeadsStore((s) => s.currentSearch);
  const filters = useLeadsStore((s) => s.filters);
  const sort = useLeadsStore((s) => s.sort);
  const bulkMode = useLeadsStore((s) => s.bulkMode);
  const setBulkMode = useLeadsStore((s) => s.setBulkMode);

  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const filtered = useMemo(() => sortLeads(applyFilters(leads, filters), sort), [leads, filters, sort]);

  const summary = useMemo(() => {
    if (!leads.length) return null;
    const noSite = leads.filter((l) => !l.hasWebsite).length;
    const withSite = leads.length - noSite;
    const enriched = leads.filter((l) => l.phone || l.whatsapp || l.email).length;
    const wa = leads.filter((l) => l.whatsapp).length;
    const emails = leads.filter((l) => l.email).length;
    return { noSite, withSite, enriched, wa, emails, total: leads.length, phones: leads.filter((l) => l.phone).length };
  }, [leads]);

  const tabs = [
    { to: "/app/mapa", icon: MapIcon, label: "Mapa" },
    { to: "/app/kanban", icon: LayoutGrid, label: "Kanban" },
    { to: "/app/painel", icon: BarChart3, label: "Painel" },
  ];

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-14 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center justify-center border-b">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCollapsed(false)} aria-label="Expandir"><ChevronsRight className="h-4 w-4" /></Button>
        </div>
        <nav className="flex flex-col items-center gap-1 py-3">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link key={t.to} to={t.to} className={cn("grid h-9 w-9 place-items-center rounded-md", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")} title={t.label}>
                <t.icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex w-full max-w-[400px] shrink-0 flex-col border-r bg-sidebar">
      <header className="flex items-center gap-2 border-b p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-elegant">
          <Radar className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="truncate text-[10px] text-muted-foreground">{APP_TAGLINE}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleTheme} aria-label="Alternar tema">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <SettingsDialog />
        <Button size="icon" variant="ghost" className="h-8 w-8 hidden md:flex" onClick={() => setCollapsed(true)} aria-label="Recolher"><ChevronsLeft className="h-4 w-4" /></Button>
      </header>

      <div className="border-b p-3">
        <SearchForm />
      </div>

      <nav className="border-b p-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((t) => {
            const active = pathname === t.to;
            return (
              <Link key={t.to} to={t.to} className={cn("flex flex-col items-center gap-0.5 rounded-md py-2 text-[11px] font-medium transition-colors", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-b p-3 space-y-2">
        <MessageTemplateDialog />
        <HistoryDrawer />
      </div>

      {summary && (
        <div className="border-b bg-muted/30 p-3">
          <p className="text-[11px] font-medium text-foreground">
            <b className="text-hot tabular-nums">{summary.noSite}</b> sem site, de <b className="tabular-nums">{summary.total}</b> empresas encontradas
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <b className="text-foreground tabular-nums">{summary.enriched}</b> de {summary.noSite} leads enriquecidos
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
            <MiniStat label="WhatsApp" value={summary.wa} />
            <MiniStat label="Telefones" value={summary.phones} />
            <MiniStat label="E-mails" value={summary.emails} />
          </div>
        </div>
      )}

      <div className="border-b p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <SortSelect />
          <AdvancedFilters />
        </div>
        <QuickFilters />
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => { exportCSV(filtered); toast.success("CSV exportado"); }}>
            <FileDown className="h-3.5 w-3.5" />CSV
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => { exportExcel(filtered); toast.success("Excel exportado"); }}>
            <FileDown className="h-3.5 w-3.5" />Excel
          </Button>
        </div>
      </div>

      <BulkBar visibleIds={filtered.map((l) => l.id)} onOpenPrepare={() => window.dispatchEvent(new CustomEvent("open-bulk-messages"))} />

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum lead" description="Ajuste os filtros ou faça uma nova busca." />
        ) : (
          filtered.map((l) => <LeadCard key={l.id} lead={l} bulk={bulkMode} />)
        )}
      </div>
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface border p-1.5">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// re-export for convenience
export { applyPresenceFilter };
