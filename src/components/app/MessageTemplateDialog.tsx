import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMessageStore } from "@/stores";
import { MessageSquare, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MESSAGE_TEMPLATE } from "@/lib/constants";

const VARS = ["empresa", "responsavel", "cidade", "categoria", "bairro", "meu_nome"];

export function MessageTemplateDialog() {
  const template = useMessageStore((s) => s.template);
  const templateName = useMessageStore((s) => s.templateName);
  const setTemplate = useMessageStore((s) => s.setTemplate);
  const setTemplateName = useMessageStore((s) => s.setTemplateName);
  const reset = useMessageStore((s) => s.reset);
  const [draft, setDraft] = useState(template);
  const [nameDraft, setNameDraft] = useState(templateName);
  const preview = draft
    .replace(/\{\{empresa\}\}/g, "Clínica Nova Vida")
    .replace(/\{\{categoria\}\}/g, "clínicas médicas")
    .replace(/\{\{cidade\}\}/g, "Porto Alegre")
    .replace(/\{\{bairro\}\}/g, "Moinhos de Vento")
    .replace(/\{\{meu_nome\}\}/g, "João")
    .replace(/\{\{responsavel\}\}/g, "responsável");

  return (
    <Dialog
      onOpenChange={(v) => {
        if (v) {
          setDraft(template);
          setNameDraft(templateName);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-2 w-full text-xs h-8">
          <MessageSquare className="h-3.5 w-3.5" />
          Editar mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modelo de mensagem do WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="tpl-name" className="text-xs">
              Nome do modelo
            </Label>
            <input
              id="tpl-name"
              className="mt-1 w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ex.: Abordagem padrão"
            />
          </div>
          <div>
            <Label className="text-xs">Modelo</Label>
            <Textarea rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{draft.length} caracteres</span>
              <div className="flex gap-1 flex-wrap">
                {VARS.map((v) => (
                  <button
                    key={v}
                    className="rounded border px-1.5 py-0.5 hover:bg-accent"
                    onClick={() => setDraft((d) => d + ` {{${v}}}`)}
                  >{`{{${v}}}`}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs">Pré-visualização</Label>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">{preview}</div>
          </div>
        </div>
        <DialogFooter className="justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(DEFAULT_MESSAGE_TEMPLATE);
                reset();
                toast.success("Modelo restaurado");
              }}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Restaurar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(draft);
                toast.success("Modelo copiado");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copiar
            </Button>
          </div>
          <Button
            onClick={() => {
              setTemplate(draft);
              setTemplateName(nameDraft.trim() || "Abordagem padrão");
              toast.success("Modelo salvo");
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
