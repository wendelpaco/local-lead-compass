import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/stores";
import { clearAllState } from "@/lib/storage";
import { toast } from "sonner";

export function SettingsDialog() {
  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Configurações"><Settings className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="prospect">Prospecção</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-3 mt-4">
            <div><Label>Nome do usuário</Label><Input placeholder="Seu nome" /></div>
            <div><Label>Nome da empresa</Label><Input placeholder="Sua empresa" /></div>
            <div>
              <Label>Densidade</Label>
              <div className="mt-1 flex gap-2">
                {(["compact", "comfortable"] as const).map((d) => (
                  <Button key={d} size="sm" variant={density === d ? "default" : "outline"} onClick={() => setDensity(d)}>{d === "compact" ? "Compacto" : "Confortável"}</Button>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="prospect" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Padrões de prospecção podem ser ajustados aqui em versões futuras.</p>
          </TabsContent>
          <TabsContent value="data" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Gerencie seus dados locais.</p>
            <Button variant="destructive" size="sm" onClick={() => { clearAllState(); toast.success("Dados limpos. Recarregue a página."); }}>
              <Trash2 className="mr-1 h-4 w-4" />Limpar todos os dados
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
