import type { Lead } from "@/types";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TemperatureBadge, ScoreBadge } from "@/components/shared/Badges";
import { formatDistance, formatBRL, formatRelative, digitsOnly } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/constants";
import { MessageCircle, Phone, Instagram, Mail, Globe, GlobeLock, Star, MapPin, MoreVertical, ExternalLink } from "lucide-react";
import { useLeadsStore } from "@/stores";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  lead: Lead;
  bulk?: boolean;
  compact?: boolean;
}

export function LeadCard({ lead, bulk, compact }: Props) {
  const focusedId = useLeadsStore((s) => s.focusedId);
  const selectedIds = useLeadsStore((s) => s.selectedIds);
  const setFocused = useLeadsStore((s) => s.setFocused);
  const setDetails = useLeadsStore((s) => s.setDetails);
  const toggleSelect = useLeadsStore((s) => s.toggleSelect);
  const setStage = useLeadsStore((s) => s.setStage);
  const isFocused = focusedId === lead.id;
  const isSelected = selectedIds.includes(lead.id);

  const openWhats = () => {
    const num = digitsOnly(lead.whatsapp ?? lead.phone);
    if (!num) return toast.error("Sem WhatsApp/telefone");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <Card
      onClick={() => setFocused(lead.id)}
      className={cn(
        "group relative cursor-pointer border-border/70 shadow-elegant transition-all hover:border-primary/50 hover:shadow-elevated",
        isFocused && "border-info ring-1 ring-info/40",
        compact ? "p-2.5" : "p-3"
      )}
    >
      <div className="flex items-start gap-2">
        {bulk && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(lead.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Selecionar ${lead.companyName}`}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className={cn("truncate font-semibold text-foreground", compact ? "text-[13px]" : "text-sm")}>{lead.companyName}</h3>
                {lead.hasWebsite ? <Globe className="h-3 w-3 text-muted-foreground/60 shrink-0" aria-label="Com site" /> : <GlobeLock className="h-3 w-3 text-hot shrink-0" aria-label="Sem site" />}
              </div>
              <p className="text-[11px] text-muted-foreground">{lead.category}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <TemperatureBadge temperature={lead.temperature} size="xs" />
              <ScoreBadge score={lead.score} />
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{lead.neighborhood ?? lead.city}</span>
            <span>•</span>
            <span className="tabular-nums">{formatDistance(lead.distanceKm)}</span>
            {lead.rating != null && (
              <>
                <span>•</span>
                <Star className="h-3 w-3 fill-warm text-warm" />
                <span className="tabular-nums font-medium text-foreground">{lead.rating.toFixed(1)}</span>
                <span>({lead.reviewCount})</span>
              </>
            )}
          </div>

          {!compact && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                {lead.whatsapp && <MessageCircle className="h-3.5 w-3.5 text-success" />}
                {lead.phone && <Phone className="h-3.5 w-3.5" />}
                {lead.instagram && <Instagram className="h-3.5 w-3.5" />}
                {lead.email && <Mail className="h-3.5 w-3.5" />}
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{STAGE_LABELS[lead.stage]}</span>
                {lead.estimatedValue != null && (
                  <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground tabular-nums">{formatBRL(lead.estimatedValue)}</span>
                )}
              </div>
            </div>
          )}

          {lead.lastInteractionAt && !compact && (
            <p className="mt-1 text-[10px] text-muted-foreground">Última interação: {formatRelative(lead.lastInteractionAt)}</p>
          )}

          {!compact && (
            <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); openWhats(); }}>
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setDetails(lead.id); }}>
                <ExternalLink className="h-3 w-3" /> Detalhes
              </Button>
              <div className="ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Mais opções"><MoreVertical className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setStage(lead.id, "new")}>Mover para Novo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStage(lead.id, "qualified")}>Mover para Qualificado</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStage(lead.id, "contacted")}>Marcar como Contatado</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(lead.phone ?? ""); toast.success("Telefone copiado"); }}>Copiar telefone</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(`${lead.address}, ${lead.city}`); toast.success("Endereço copiado"); }}>Copiar endereço</DropdownMenuItem>
                    {lead.email && <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(lead.email!); toast.success("E-mail copiado"); }}>Copiar e-mail</DropdownMenuItem>}
                    {lead.instagram && <DropdownMenuItem onClick={() => window.open(`https://instagram.com/${lead.instagram!.replace("@", "")}`, "_blank")}>Abrir Instagram</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
