import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/AppSidebar";
import { LeadDetailsDrawer } from "@/components/app/LeadDetailsDrawer";
import { BulkMessageDialog } from "@/components/app/BulkBar";
import { WonDialog, DiscardDialog } from "@/components/app/StageDialogs";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapIcon, LayoutGrid, BarChart3, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useThemeSync } from "@/hooks/useThemeSync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function MobileNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const tabs = [
    { to: "/app/mapa", icon: MapIcon, label: "Mapa" },
    { to: "/app/kanban", icon: LayoutGrid, label: "Kanban" },
    { to: "/app/painel", icon: BarChart3, label: "Painel" },
  ];
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-auto flex-1 flex-col items-center gap-0.5 rounded-none py-2.5 text-[11px] font-medium text-muted-foreground"
            aria-label="Abrir busca e lista de leads"
          >
            <Search className="h-5 w-5" />
            Buscar
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-md p-0">
          <SheetTitle className="sr-only">Busca e lista de leads</SheetTitle>
          <AppSidebar mobile />
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function AppLayout() {
  useThemeSync();
  const [bulkOpen, setBulkOpen] = useState(false);
  useEffect(() => {
    const h = () => setBulkOpen(true);
    window.addEventListener("open-bulk-messages", h);
    return () => window.removeEventListener("open-bulk-messages", h);
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 min-w-0 overflow-hidden pb-14 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      <LeadDetailsDrawer />
      <BulkMessageDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      <WonDialog />
      <DiscardDialog />
    </div>
  );
}
