import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLeadsStore } from "@/stores";
import { formatDate, formatNumber } from "@/lib/format";
import { History, RotateCcw, Trash2, Eye } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function HistoryDrawer() {
  const history = useLeadsStore((s) => s.history);
  const removeSearch = useLeadsStore((s) => s.removeSearch);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-2 w-full text-xs h-8"><History className="h-3.5 w-3.5" />Buscas anteriores</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Buscas anteriores</SheetTitle>
          <SheetDescription>Histórico das últimas buscas realizadas.</SheetDescription>
        </SheetHeader>
        <div className="p-4 space-y-2">
          {history.length === 0 ? (
            <EmptyState icon={History} title="Nenhuma busca ainda" description="Faça a primeira busca para começar a construir seu histórico." />
          ) : (
            history.map((h) => (
              <div key={h.id} className="rounded-lg border bg-surface p-3 shadow-elegant">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{h.niche}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{h.location} • {h.radiusKm} km • {h.presence === "no-website" ? "Sem site" : h.presence === "with-website" ? "Com site" : "Todos"}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(h.createdAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Repetir"><RotateCcw className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Ver"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" aria-label="Excluir" onClick={() => removeSearch(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span><b className="text-foreground tabular-nums">{formatNumber(h.totalFound)}</b> empresas</span>
                  <span><b className="text-foreground tabular-nums">{formatNumber(h.contactsFound)}</b> contatos</span>
                  <span><b className="text-foreground tabular-nums">{formatNumber(h.addedToPipeline)}</b> no funil</span>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
