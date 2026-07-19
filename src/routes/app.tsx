import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/AppSidebar";
import { LeadDetailsDrawer } from "@/components/app/LeadDetailsDrawer";
import { BulkMessageDialog } from "@/components/app/BulkBar";
import { useEffect, useState } from "react";
import { useThemeSync } from "@/hooks/useThemeSync";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

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
      <main className="flex-1 min-w-0 overflow-hidden">
        <Outlet />
      </main>
      <LeadDetailsDrawer />
      <BulkMessageDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}

// redirect /app -> /app/mapa
export const IndexRedirect = () => {
  throw redirect({ to: "/app/mapa" });
};
