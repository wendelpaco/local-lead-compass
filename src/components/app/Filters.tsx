import { useLeadsStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { QUICK_FILTERS } from "@/lib/filters";
import { SORT_OPTIONS, type SortValue } from "@/lib/constants";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import type { LeadFilters } from "@/types";

export function QuickFilters() {
  const filters = useLeadsStore((s) => s.filters);
  const toggle = useLeadsStore((s) => s.toggleQuickFilter);
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_FILTERS.map((f) => {
        const active = filters.quick.includes(f.id);
        return (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:border-primary/60 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

export function SortSelect() {
  const sort = useLeadsStore((s) => s.sort);
  const setSort = useLeadsStore((s) => s.setSort);
  return (
    <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
      <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function AdvancedFilters() {
  const filters = useLeadsStore((s) => s.filters);
  const setFilters = useLeadsStore((s) => s.setFilters);
  const clearFilters = useLeadsStore((s) => s.clearFilters);
  const activeCount =
    filters.quick.length +
    (filters.minRating != null ? 1 : 0) +
    (filters.minReviews != null ? 1 : 0) +
    (filters.maxDistance != null ? 1 : 0) +
    (filters.minScore != null ? 1 : 0);

  const [draft, setDraft] = useState<LeadFilters>(filters);
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setDraft(filters); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros avançados</SheetTitle>
          <SheetDescription>Refine os leads exibidos em todas as visualizações.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4 px-4">
          <FilterField label={`Nota mínima: ${draft.minRating ?? "—"}`}>
            <Slider value={[draft.minRating ?? 0]} min={0} max={5} step={0.5} onValueChange={([v]) => setDraft((d) => ({ ...d, minRating: v || undefined }))} />
          </FilterField>
          <FilterField label={`Avaliações mínimas: ${draft.minReviews ?? "—"}`}>
            <Slider value={[draft.minReviews ?? 0]} min={0} max={500} step={10} onValueChange={([v]) => setDraft((d) => ({ ...d, minReviews: v || undefined }))} />
          </FilterField>
          <FilterField label={`Distância máxima (km): ${draft.maxDistance ?? "—"}`}>
            <Slider value={[draft.maxDistance ?? 100]} min={1} max={100} step={1} onValueChange={([v]) => setDraft((d) => ({ ...d, maxDistance: v }))} />
          </FilterField>
          <div className="grid grid-cols-2 gap-3">
            <FilterField label="Score mínimo">
              <Input type="number" min={0} max={100} value={draft.minScore ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minScore: e.target.value ? Number(e.target.value) : undefined }))} />
            </FilterField>
            <FilterField label="Score máximo">
              <Input type="number" min={0} max={100} value={draft.maxScore ?? ""} onChange={(e) => setDraft((d) => ({ ...d, maxScore: e.target.value ? Number(e.target.value) : undefined }))} />
            </FilterField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FilterField label="Valor mínimo (R$)">
              <Input type="number" value={draft.valueMin ?? ""} onChange={(e) => setDraft((d) => ({ ...d, valueMin: e.target.value ? Number(e.target.value) : undefined }))} />
            </FilterField>
            <FilterField label="Valor máximo (R$)">
              <Input type="number" value={draft.valueMax ?? ""} onChange={(e) => setDraft((d) => ({ ...d, valueMax: e.target.value ? Number(e.target.value) : undefined }))} />
            </FilterField>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.onlyUncontacted} onChange={(e) => setDraft((d) => ({ ...d, onlyUncontacted: e.target.checked }))} /> Somente não contatados</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.onlyWithTask} onChange={(e) => setDraft((d) => ({ ...d, onlyWithTask: e.target.checked }))} /> Somente com próxima tarefa</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.hasWhatsapp ?? false} onChange={(e) => setDraft((d) => ({ ...d, hasWhatsapp: e.target.checked || undefined }))} /> Possui WhatsApp</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.hasEmail ?? false} onChange={(e) => setDraft((d) => ({ ...d, hasEmail: e.target.checked || undefined }))} /> Possui e-mail</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.hasInstagram ?? false} onChange={(e) => setDraft((d) => ({ ...d, hasInstagram: e.target.checked || undefined }))} /> Possui Instagram</label>
          </div>
        </div>
        <SheetFooter className="flex-row justify-between gap-2">
          <Button variant="ghost" onClick={() => { clearFilters(); setDraft({ quick: [] }); }}><X className="mr-1 h-4 w-4" />Limpar</Button>
          <Button onClick={() => { setFilters({ ...draft, quick: filters.quick }); setOpen(false); }}>Aplicar filtros</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
