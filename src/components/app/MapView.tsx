import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lead } from "@/types";
import { useLeadsStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Crosshair, ZoomIn, Circle as CircleIcon, Moon } from "lucide-react";
import { useState } from "react";

const tempColor: Record<Lead["temperature"], string> = {
  hot: "oklch(0.72 0.17 55)",
  warm: "oklch(0.83 0.15 90)",
  cold: "oklch(0.72 0.04 250)",
};

function markerIcon(lead: Lead, selected: boolean) {
  const color = lead.stage === "won" ? "oklch(0.62 0.15 155)" : lead.stage === "discarded" ? "oklch(0.60 0.22 27)" : selected ? "oklch(0.62 0.16 245)" : tempColor[lead.temperature];
  const html = `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid white;">${lead.score}</div>`;
  return L.divIcon({ html, className: "lead-marker", iconSize: [26, 26], iconAnchor: [13, 13] });
}

export function MapView({ leads }: { leads: Lead[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);
  const centerRef = useRef<L.Marker | null>(null);
  const currentSearch = useLeadsStore((s) => s.currentSearch);
  const focusedId = useLeadsStore((s) => s.focusedId);
  const setFocused = useLeadsStore((s) => s.setFocused);
  const setDetails = useLeadsStore((s) => s.setDetails);
  const [showCircle, setShowCircle] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(
      [currentSearch?.latitude ?? -30.0346, currentSearch?.longitude ?? -51.2177],
      13
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentSearch) return;
    map.setView([currentSearch.latitude, currentSearch.longitude], 13);
    if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }
    if (showCircle) {
      circleRef.current = L.circle([currentSearch.latitude, currentSearch.longitude], {
        radius: currentSearch.radiusKm * 1000,
        color: "oklch(0.58 0.14 155)",
        fillColor: "oklch(0.58 0.14 155)",
        fillOpacity: 0.06,
        weight: 1.5,
      }).addTo(map);
    }
    if (centerRef.current) map.removeLayer(centerRef.current);
    centerRef.current = L.marker([currentSearch.latitude, currentSearch.longitude], {
      icon: L.divIcon({ html: '<div style="width:12px;height:12px;border-radius:50%;background:oklch(0.58 0.14 155);border:2px solid white;box-shadow:0 0 0 3px oklch(0.58 0.14 155 / 0.25);"></div>', className: "", iconSize: [12, 12] }),
    }).addTo(map);
  }, [currentSearch, showCircle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();
    leads.forEach((l) => {
      const m = L.marker([l.latitude, l.longitude], { icon: markerIcon(l, l.id === focusedId) })
        .addTo(map)
        .on("click", () => setFocused(l.id));
      const popupHtml = `
        <div style="min-width:200px;font-family:inherit;">
          <div style="font-weight:600;font-size:13px;">${l.companyName}</div>
          <div style="color:#666;font-size:11px;margin-bottom:6px;">${l.category} • ${l.neighborhood ?? l.city}</div>
          <div style="font-size:11px;">Score: <b>${l.score}</b> • Nota: <b>${l.rating?.toFixed(1) ?? "—"}</b> (${l.reviewCount ?? 0})</div>
          <div style="font-size:11px;color:#666;margin-top:4px;">${l.phone ?? ""}</div>
          <div style="margin-top:8px;display:flex;gap:4px;">
            <button data-action="details" data-id="${l.id}" style="flex:1;padding:4px 8px;border-radius:6px;background:oklch(0.58 0.14 155);color:white;font-size:11px;border:none;cursor:pointer;">Ver detalhes</button>
          </div>
        </div>`;
      m.bindPopup(popupHtml);
      m.on("popupopen", () => {
        setTimeout(() => {
          document.querySelectorAll<HTMLButtonElement>('[data-action="details"]').forEach((btn) => {
            btn.onclick = () => setDetails(btn.dataset.id!);
          });
        }, 50);
      });
      markersRef.current.set(l.id, m);
    });
  }, [leads, focusedId, setFocused, setDetails]);

  useEffect(() => {
    if (!focusedId) return;
    const marker = markersRef.current.get(focusedId);
    if (marker && mapRef.current) {
      const ll = marker.getLatLng();
      mapRef.current.panTo(ll, { animate: true });
      marker.openPopup();
    }
  }, [focusedId]);

  const fitAll = () => {
    if (!mapRef.current || leads.length === 0) return;
    const bounds = L.latLngBounds(leads.map((l) => [l.latitude, l.longitude]));
    mapRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  const recenter = () => {
    if (mapRef.current && currentSearch) mapRef.current.setView([currentSearch.latitude, currentSearch.longitude], 13);
  };

  const legend = useMemo(() => [
    { label: "Quente", color: tempColor.hot },
    { label: "Morno", color: tempColor.warm },
    { label: "Frio", color: tempColor.cold },
    { label: "Ganho", color: "oklch(0.62 0.15 155)" },
  ], []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-elevated" onClick={recenter} aria-label="Centralizar"><Crosshair className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-elevated" onClick={fitAll} aria-label="Ajustar zoom"><ZoomIn className="h-4 w-4" /></Button>
        <Button size="icon" variant={showCircle ? "default" : "secondary"} className="h-8 w-8 shadow-elevated" onClick={() => setShowCircle((v) => !v)} aria-label="Alternar raio"><CircleIcon className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-elevated" onClick={() => document.documentElement.classList.toggle("dark")} aria-label="Alternar tema do mapa"><Moon className="h-4 w-4" /></Button>
      </div>
      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-lg border bg-surface/95 px-3 py-2 shadow-elevated backdrop-blur">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
      <div className="absolute top-3 left-3 z-[400] rounded-lg border bg-surface/95 px-3 py-1.5 text-xs font-medium shadow-elevated backdrop-blur">
        {leads.length} <span className="text-muted-foreground">leads visíveis</span>
      </div>
    </div>
  );
}
