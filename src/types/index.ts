export type LeadStage = "new" | "qualified" | "contacted" | "won" | "discarded";
export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadChannel = "phone" | "whatsapp" | "email" | "instagram" | "website";
export type PresenceFilter = "no-website" | "with-website" | "all";
export type ActivityType = "call" | "message" | "meeting" | "followup" | "proposal" | "visit" | "other";

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
}

export interface LeadActivity {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  time?: string;
  note?: string;
  priority?: "low" | "medium" | "high";
  done?: boolean;
}

export interface TimelineEvent {
  id: string;
  kind: string;
  label: string;
  at: string;
}

export interface Lead {
  id: string;
  companyName: string;
  category: string;
  description?: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  website?: string;
  hasWebsite: boolean;
  rating?: number;
  reviewCount?: number;
  score: number;
  temperature: LeadTemperature;
  stage: LeadStage;
  estimatedValue?: number;
  closedValue?: number;
  closedService?: string;
  closedAt?: string;
  discardReason?: string;
  lastInteractionAt?: string;
  discoveredAt: string;
  openingHours?: string[];
  nextActivity?: LeadActivity;
  notes: LeadNote[];
  activities: LeadActivity[];
  timeline: TimelineEvent[];
}

export interface Search {
  id: string;
  niche: string;
  location: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  presence: PresenceFilter;
  createdAt: string;
  totalFound: number;
  enrichedCount: number;
  addedToPipeline: number;
  contactsFound: number;
}

export interface SearchProgress {
  step: number;
  stepLabel: string;
  percent: number;
  partialCount: number;
  cancelled?: boolean;
}

export interface LeadFilters {
  quick: string[];
  minRating?: number;
  minReviews?: number;
  maxDistance?: number;
  minScore?: number;
  maxScore?: number;
  hasPhone?: boolean;
  hasWhatsapp?: boolean;
  hasInstagram?: boolean;
  hasEmail?: boolean;
  hasWebsite?: boolean | null;
  temperatures?: LeadTemperature[];
  stages?: LeadStage[];
  categories?: string[];
  cities?: string[];
  neighborhoods?: string[];
  valueMin?: number;
  valueMax?: number;
  onlyUncontacted?: boolean;
  onlyWithTask?: boolean;
}

export interface MessageTemplate {
  name: string;
  content: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: LeadFilters;
}
