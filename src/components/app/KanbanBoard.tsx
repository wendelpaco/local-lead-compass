import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";
import { useLeadsStore } from "@/stores";
import type { Lead, LeadStage } from "@/types";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/constants";
import { TemperatureBadge, ScoreBadge } from "@/components/shared/Badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL, formatRelative, digitsOnly } from "@/lib/format";
import { MessageCircle, Search, Filter as FilterIcon, MoreHorizontal, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DISCARD_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { applyFilters } from "@/lib/filters";

const stageColor: Record<LeadStage, string> = {
  new: "border-t-cold",
  qualified: "border-t-info",
  contacted: "border-t-warm",
  won: "border-t-success",
  discarded: "border-t-destructive",
};

function KanbanCard({ lead, density }: { lead: Lead; density: "compact" | "comfortable" }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const setDetails = useLeadsStore((s) => s.setDetails);
  const openWhats = (e: React.MouseEvent) => {
    e.stopPropagation();
    const num = digitsOnly(lead.whatsapp ?? lead.phone);
    if (!num) return toast.error("Sem WhatsApp/telefone");
    window.open(`https://wa.me/${num}`, "_blank");
  };
  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => setDetails(lead.id)}
      className={cn(
        "cursor-grab active:cursor-grabbing border-border/70 shadow-elegant hover:border-primary/50 transition-all",
        density === "compact" ? "p-2" : "p-2.5",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold text-foreground", density === "compact" ? "text-[12px]" : "text-[13px]")}>{lead.companyName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{lead.category} • {lead.neighborhood ?? lead.city}</p>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      {density === "comfortable" && (
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <TemperatureBadge temperature={lead.temperature} size="xs" />
          {lead.estimatedValue != null && <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{formatBRL(lead.estimatedValue)}</span>}
        </div>
      )}
      {density === "comfortable" && lead.lastInteractionAt && (
        <p className="mt-1 text-[10px] text-muted-foreground">{formatRelative(lead.lastInteractionAt)}</p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] gap-1" onClick={openWhats}><MessageCircle className="h-3 w-3" /></Button>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">{lead.phone ?? ""}</span>
      </div>
    </Card>
  );
}

function KanbanColumn({ stage, leads, density }: { stage: LeadStage; leads: Lead[]; density: "compact" | "comfortable" }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = leads.reduce((s, l) => s + (l.stage === "won" ? l.closedValue ?? 0 : l.estimatedValue ?? 0), 0);
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={cn("flex items-center justify-between gap-2 rounded-t-lg border border-b-0 bg-surface px-3 py-2 border-t-2", stageColor[stage])}>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{STAGE_LABELS[stage]}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{leads.length} leads • {formatBRL(total)}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Ações"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[300px] space-y-2 rounded-b-lg border bg-muted/30 p-2 overflow-y-auto",
          isOver && "bg-primary/5 ring-1 ring-primary/40"
        )}
      >
        {leads.length === 0 ? (
          <div className="grid h-24 place-items-center text-[11px] text-muted-foreground/70">Arraste leads aqui</div>
        ) : (
          leads.map((l) => <KanbanCard key={l.id} lead={l} density={density} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ leads, density }: { leads: Lead[]; density: "compact" | "comfortable" }) {
  const setStage = useLeadsStore((s) => s.setStage);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingWin, setPendingWin] = useState<Lead | null>(null);
  const [pendingDiscard, setPendingDiscard] = useState<Lead | null>(null);
  const [wonForm, setWonForm] = useState({ value: "", service: "", note: "" });
  const [discardReason, setDiscardReason] = useState(DISCARD_REASONS[0]);
  const [discardNote, setDiscardNote] = useState("");

  const grouped = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = { new: [], qualified: [], contacted: [], won: [], discarded: [] };
    leads.forEach((l) => map[l.stage].push(l));
    return map;
  }, [leads]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id as LeadStage | undefined;
    if (!overId || !STAGE_ORDER.includes(overId)) return;
    const lead = leads.find((l) => l.id === e.active.id);
    if (!lead || lead.stage === overId) return;
    if (overId === "won") { setPendingWin(lead); setWonForm({ value: String(lead.estimatedValue ?? ""), service: "", note: "" }); return; }
    if (overId === "discarded") { setPendingDiscard(lead); setDiscardReason(DISCARD_REASONS[0]); setDiscardNote(""); return; }
    setStage(lead.id, overId);
    toast.success(`Movido para ${STAGE_LABELS[overId]}`);
  };

  const activeLead = leads.find((l) => l.id === activeId);

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
        <div className="flex h-full gap-3 overflow-x-auto p-4">
          {STAGE_ORDER.map((s) => <KanbanColumn key={s} stage={s} leads={grouped[s]} density={density} />)}
        </div>
        <DragOverlay>{activeLead ? <KanbanCard lead={activeLead} density={density} /> : null}</DragOverlay>
      </DndContext>

      <Dialog open={!!pendingWin} onOpenChange={(v) => !v && setPendingWin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar negócio ganho — {pendingWin?.companyName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Valor fechado (R$)</Label><Input type="number" value={wonForm.value} onChange={(e) => setWonForm({ ...wonForm, value: e.target.value })} /></div>
            <div><Label>Serviço vendido</Label><Input value={wonForm.service} onChange={(e) => setWonForm({ ...wonForm, service: e.target.value })} /></div>
            <div><Label>Observação</Label><Textarea value={wonForm.note} onChange={(e) => setWonForm({ ...wonForm, note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingWin(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (!pendingWin) return;
              setStage(pendingWin.id, "won", { closedValue: Number(wonForm.value) || 0, closedService: wonForm.service, closedAt: new Date().toISOString() });
              toast.success("Negócio marcado como ganho");
              setPendingWin(null);
            }}>Confirmar ganho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDiscard} onOpenChange={(v) => !v && setPendingDiscard(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Descartar lead — {pendingDiscard?.companyName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Motivo</Label>
              <Select value={discardReason} onValueChange={setDiscardReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCARD_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observação (opcional)</Label><Textarea value={discardNote} onChange={(e) => setDiscardNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDiscard(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (!pendingDiscard) return;
              setStage(pendingDiscard.id, "discarded", { discardReason });
              toast.success("Lead descartado");
              setPendingDiscard(null);
            }}>Descartar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function KanbanTopBar({ search, setSearch, density, setDensity, count, selected, onPrepareMessages }: {
  search: string; setSearch: (v: string) => void;
  density: "compact" | "comfortable"; setDensity: (d: "compact" | "comfortable") => void;
  count: number; selected: number; onPrepareMessages: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-surface/95 px-4 py-2.5 backdrop-blur">
      <span className="text-xs text-muted-foreground"><b className="text-foreground">{count}</b> leads</span>
      {selected > 0 && <span className="text-xs text-muted-foreground">• <b className="text-primary">{selected}</b> selecionados</span>}
      <div className="relative ml-2 flex-1 max-w-xs">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="h-8 pl-7 text-xs" />
        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
          {(["compact", "comfortable"] as const).map((d) => (
            <button key={d} onClick={() => setDensity(d)} className={cn("rounded px-2 py-1 text-[10px] font-medium", density === d ? "bg-surface text-foreground shadow-elegant" : "text-muted-foreground")}>{d === "compact" ? "Compacto" : "Confortável"}</button>
          ))}
        </div>
        <Button size="sm" onClick={onPrepareMessages} disabled={selected === 0} className="h-8 gap-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" />Preparar mensagens</Button>
      </div>
    </div>
  );
}

export { applyFilters, FilterIcon };
