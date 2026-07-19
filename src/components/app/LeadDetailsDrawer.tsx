import { useLeadsStore } from "@/stores";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemperatureBadge, ScoreBadge } from "@/components/shared/Badges";
import { formatBRL, formatDate, formatDateTime, formatDistance, digitsOnly } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calculateScore } from "@/lib/score";
import { MessageCircle, Phone, Mail, Instagram, Globe, MapPin, Sparkles, Info, Star, Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ActivityType } from "@/types";

export function LeadDetailsDrawer() {
  const detailsId = useLeadsStore((s) => s.detailsId);
  const setDetails = useLeadsStore((s) => s.setDetails);
  const lead = useLeadsStore((s) => s.leads.find((l) => l.id === detailsId));
  const addNote = useLeadsStore((s) => s.addNote);
  const removeNote = useLeadsStore((s) => s.removeNote);
  const addActivity = useLeadsStore((s) => s.addActivity);
  const [noteText, setNoteText] = useState("");
  const [act, setAct] = useState<{ type: ActivityType; title: string; date: string; note: string }>({ type: "call", title: "", date: new Date().toISOString().slice(0, 10), note: "" });

  if (!lead) return null;
  const breakdown = calculateScore(lead).breakdown;
  const insights: { icon: string; text: string; level: "high" | "med" | "low" }[] = [];
  if (!lead.hasWebsite) insights.push({ icon: "🌐", text: "Empresa sem site — alta oportunidade de abordagem", level: "high" });
  if ((lead.rating ?? 0) >= 4.5) insights.push({ icon: "⭐", text: "Excelentes avaliações", level: "med" });
  if (lead.whatsapp) insights.push({ icon: "💬", text: "WhatsApp encontrado — contato direto", level: "high" });
  if (!lead.instagram) insights.push({ icon: "📷", text: "Sem Instagram — presença social incompleta", level: "med" });
  if (lead.temperature === "hot") insights.push({ icon: "🔥", text: "Lead quente — priorize o contato", level: "high" });

  const openWhats = () => {
    const num = digitsOnly(lead.whatsapp ?? lead.phone);
    if (!num) return toast.error("Sem WhatsApp/telefone");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <Sheet open={!!detailsId} onOpenChange={(v) => !v && setDetails(null)}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="border-b p-5">
          <SheetHeader className="p-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg">{lead.companyName}</SheetTitle>
                <p className="text-sm text-muted-foreground">{lead.category} • {lead.neighborhood ?? ""} • {lead.city}, {lead.state}</p>
              </div>
              <div className="flex items-center gap-2">
                <TemperatureBadge temperature={lead.temperature} />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-semibold" aria-label="Composição do score">
                      <ScoreBadge score={lead.score} />
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <p className="mb-2 text-xs font-semibold">Composição do score</p>
                    <div className="space-y-1.5">
                      {breakdown.map((b, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 text-xs">
                          <div><p className="font-medium">{b.label}</p><p className="text-muted-foreground text-[11px]">{b.explanation}</p></div>
                          <span className="font-mono font-semibold text-primary">+{b.points}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openWhats} className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</Button>
            {lead.phone && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`tel:${lead.phone}`)}><Phone className="h-3.5 w-3.5" />Ligar</Button>}
            {lead.email && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`mailto:${lead.email}`)}><Mail className="h-3.5 w-3.5" />E-mail</Button>}
            {lead.instagram && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(`https://instagram.com/${lead.instagram!.replace("@", "")}`, "_blank")}><Instagram className="h-3.5 w-3.5" />Instagram</Button>}
            {lead.website && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(lead.website, "_blank")}><Globe className="h-3.5 w-3.5" />Site</Button>}
          </div>
        </div>

        <Tabs defaultValue="info" className="p-5">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="insights">Oportunidade</TabsTrigger>
            <TabsTrigger value="notes">Notas ({lead.notes.length})</TabsTrigger>
            <TabsTrigger value="activities">Atividades</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <InfoRow icon={MapPin} label="Endereço">{lead.address}, {lead.neighborhood ?? ""}, {lead.city} - {lead.state}</InfoRow>
            <InfoRow icon={Phone} label="Telefone">{lead.phone ?? "—"}</InfoRow>
            <InfoRow icon={MessageCircle} label="WhatsApp">{lead.whatsapp ?? "—"}</InfoRow>
            <InfoRow icon={Mail} label="E-mail">{lead.email ?? "—"}</InfoRow>
            <InfoRow icon={Instagram} label="Instagram">{lead.instagram ?? "—"}</InfoRow>
            <InfoRow icon={Globe} label="Website">{lead.website ?? "—"}</InfoRow>
            <InfoRow icon={Star} label="Nota / Avaliações">{lead.rating?.toFixed(1) ?? "—"} ({lead.reviewCount ?? 0})</InfoRow>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MiniStat label="Distância" value={formatDistance(lead.distanceKm)} />
              <MiniStat label="Estágio" value={STAGE_LABELS[lead.stage]} />
              <MiniStat label="Valor estimado" value={formatBRL(lead.estimatedValue)} />
              <MiniStat label="Descoberto em" value={formatDate(lead.discoveredAt)} />
            </div>
            {lead.openingHours && (
              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Horário de funcionamento</p>
                {lead.openingHours.map((h) => <p key={h}>{h}</p>)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-2 mt-4">
            {insights.length === 0 && <p className="text-sm text-muted-foreground">Nenhum insight destacado.</p>}
            {insights.map((i, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border bg-surface p-3">
                <span className="text-lg">{i.icon}</span>
                <div className="flex-1">
                  <p className="text-sm">{i.text}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${i.level === "high" ? "bg-hot/15 text-hot" : i.level === "med" ? "bg-warm/20 text-warm-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i.level === "high" ? "Alto impacto" : i.level === "med" ? "Médio impacto" : "Baixo impacto"}
                  </span>
                </div>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 mt-4">
            <div className="flex gap-2">
              <Textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Adicionar uma nota..." />
              <Button onClick={() => { if (!noteText.trim()) return; addNote(lead.id, { content: noteText.trim() }); setNoteText(""); toast.success("Nota adicionada"); }}>Salvar</Button>
            </div>
            <div className="space-y-2">
              {lead.notes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>}
              {lead.notes.map((n) => (
                <div key={n.id} className="rounded-md border bg-surface p-3">
                  <p className="text-sm">{n.content}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDateTime(n.createdAt)}</span>
                    <div className="flex gap-1">
                      <button aria-label="Fixar" className="hover:text-foreground"><Pin className="h-3 w-3" /></button>
                      <button aria-label="Excluir" className="hover:text-destructive" onClick={() => removeNote(lead.id, n.id)}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activities" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={act.type} onValueChange={(v) => setAct({ ...act, type: v as ActivityType })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["call","Ligação"],["message","Mensagem"],["meeting","Reunião"],["followup","Retorno"],["proposal","Proposta"],["visit","Visita"],["other","Outra"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" className="h-8" value={act.date} onChange={(e) => setAct({ ...act, date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Título</Label>
                <Input className="h-8" value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} placeholder="Ex.: Retorno inicial" />
              </div>
              <div className="col-span-2">
                <Button size="sm" onClick={() => {
                  if (!act.title.trim()) return toast.error("Informe um título");
                  addActivity(lead.id, { type: act.type, title: act.title, date: act.date, note: act.note });
                  setAct({ ...act, title: "", note: "" });
                  toast.success("Atividade criada");
                }}>Criar atividade</Button>
              </div>
            </div>
            <div className="space-y-2">
              {lead.activities.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade agendada.</p>}
              {lead.activities.map((a) => (
                <div key={a.id} className="rounded-md border bg-surface p-3 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground">{a.type} • {formatDate(a.date)}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <ol className="space-y-3">
              {lead.timeline.map((t) => (
                <li key={t.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(t.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-foreground">{children}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-surface p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
