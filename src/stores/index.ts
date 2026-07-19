import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Lead, LeadStage, LeadFilters, Search, PresenceFilter, LeadNote, LeadActivity } from "@/types";
import { DEFAULT_MESSAGE_TEMPLATE, STORAGE_KEY, BULK_SELECTION_LIMIT, type SortValue } from "@/lib/constants";

// ---- Theme & UI ----
interface UIState {
  theme: "light" | "dark";
  density: "compact" | "comfortable";
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setDensity: (d: "compact" | "comfortable") => void;
  setSidebarCollapsed: (v: boolean) => void;
}
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "light",
      density: "comfortable",
      sidebarCollapsed: false,
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: `${STORAGE_KEY}:ui`, storage: createJSONStorage(() => localStorage) }
  )
);

// ---- Leads store ----
interface LeadsState {
  leads: Lead[];
  loaded: boolean;
  currentSearch: Search | null;
  history: Search[];
  filters: LeadFilters;
  sort: SortValue;
  selectedIds: string[];
  bulkMode: boolean;
  focusedId: string | null;
  detailsId: string | null;
  setLeads: (leads: Lead[], search: Search) => void;
  reset: () => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setStage: (id: string, stage: LeadStage, extra?: Partial<Lead>) => void;
  addNote: (id: string, note: Omit<LeadNote, "id" | "createdAt">) => void;
  removeNote: (id: string, noteId: string) => void;
  addActivity: (id: string, act: Omit<LeadActivity, "id">) => void;
  setFilters: (patch: Partial<LeadFilters>) => void;
  toggleQuickFilter: (chip: string) => void;
  clearFilters: () => void;
  setSort: (s: SortValue) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setBulkMode: (v: boolean) => void;
  selectVisible: (ids: string[]) => void;
  setFocused: (id: string | null) => void;
  setDetails: (id: string | null) => void;
  removeSearch: (id: string) => void;
}

const defaultFilters: LeadFilters = { quick: [] };

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set, get) => ({
      leads: [],
      loaded: false,
      currentSearch: null,
      history: [],
      filters: defaultFilters,
      sort: "relevance",
      selectedIds: [],
      bulkMode: false,
      focusedId: null,
      detailsId: null,
      setLeads: (leads, search) =>
        set((s) => ({
          leads,
          loaded: true,
          currentSearch: search,
          history: [{ ...search }, ...s.history].slice(0, 20),
          selectedIds: [],
          focusedId: null,
        })),
      reset: () => set({ leads: [], loaded: false, currentSearch: null, selectedIds: [], focusedId: null, detailsId: null }),
      updateLead: (id, patch) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setStage: (id, stage, extra) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...extra,
                  stage,
                  lastInteractionAt: new Date().toISOString(),
                  timeline: [...l.timeline, { id: `t-${Date.now()}`, kind: "stage", label: `Movido para ${stage}`, at: new Date().toISOString() }],
                }
              : l
          ),
        })),
      addNote: (id, note) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  notes: [{ id: `n-${Date.now()}`, createdAt: new Date().toISOString(), ...note }, ...l.notes],
                  timeline: [...l.timeline, { id: `t-${Date.now()}`, kind: "note", label: "Nota criada", at: new Date().toISOString() }],
                }
              : l
          ),
        })),
      removeNote: (id, noteId) =>
        set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, notes: l.notes.filter((n) => n.id !== noteId) } : l)) })),
      addActivity: (id, act) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? {
                  ...l,
                  activities: [{ id: `a-${Date.now()}`, ...act }, ...l.activities],
                  nextActivity: { id: `a-${Date.now()}`, ...act },
                  timeline: [...l.timeline, { id: `t-${Date.now()}`, kind: "activity", label: `Atividade: ${act.title}`, at: new Date().toISOString() }],
                }
              : l
          ),
        })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      toggleQuickFilter: (chip) =>
        set((s) => {
          const has = s.filters.quick.includes(chip);
          return { filters: { ...s.filters, quick: has ? s.filters.quick.filter((c) => c !== chip) : [...s.filters.quick, chip] } };
        }),
      clearFilters: () => set({ filters: defaultFilters }),
      setSort: (sort) => set({ sort }),
      toggleSelect: (id) =>
        set((s) => {
          const has = s.selectedIds.includes(id);
          if (has) return { selectedIds: s.selectedIds.filter((x) => x !== id) };
          if (s.selectedIds.length >= BULK_SELECTION_LIMIT) return s;
          return { selectedIds: [...s.selectedIds, id] };
        }),
      clearSelection: () => set({ selectedIds: [] }),
      setBulkMode: (v) => set({ bulkMode: v, selectedIds: v ? get().selectedIds : [] }),
      selectVisible: (ids) => set({ selectedIds: ids.slice(0, BULK_SELECTION_LIMIT) }),
      setFocused: (focusedId) => set({ focusedId }),
      setDetails: (detailsId) => set({ detailsId }),
      removeSearch: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
    }),
    {
      name: `${STORAGE_KEY}:leads`,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        leads: s.leads,
        loaded: s.loaded,
        currentSearch: s.currentSearch,
        history: s.history,
        filters: s.filters,
        sort: s.sort,
      }),
    }
  )
);

// ---- Message template ----
interface MessageState {
  template: string;
  setTemplate: (t: string) => void;
  reset: () => void;
}
export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      template: DEFAULT_MESSAGE_TEMPLATE,
      setTemplate: (template) => set({ template }),
      reset: () => set({ template: DEFAULT_MESSAGE_TEMPLATE }),
    }),
    { name: `${STORAGE_KEY}:msg`, storage: createJSONStorage(() => localStorage) }
  )
);

// ---- Dashboard period ----
interface PeriodState {
  period: "today" | "7d" | "30d" | "90d" | "year";
  setPeriod: (p: PeriodState["period"]) => void;
}
export const usePeriodStore = create<PeriodState>()(
  persist(
    (set) => ({ period: "30d", setPeriod: (period) => set({ period }) }),
    { name: `${STORAGE_KEY}:period`, storage: createJSONStorage(() => localStorage) }
  )
);

export function applyPresenceFilter(presence: PresenceFilter, leads: Lead[]) {
  if (presence === "no-website") return leads.filter((l) => !l.hasWebsite);
  if (presence === "with-website") return leads.filter((l) => l.hasWebsite);
  return leads;
}
