import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { AppError } from "./http.ts";

export interface QuotaStatus {
  searchLimit: number;
  searchUsed: number;
  placeLimit: number;
  placeUsed: number;
}

export async function getQuotaStatus(
  admin: SupabaseClient,
  organizationId: string,
): Promise<QuotaStatus> {
  const { data, error } = await admin.rpc("get_quota_status", {
    p_organization_id: organizationId,
  });
  if (error || !data) throw new AppError("INTERNAL_ERROR", "Falha ao verificar quota.");
  return data as QuotaStatus;
}

export async function assertSearchQuota(admin: SupabaseClient, organizationId: string) {
  const q = await getQuotaStatus(admin, organizationId);
  if (q.searchUsed >= q.searchLimit) {
    throw new AppError("PLAN_LIMIT_REACHED", "Limite mensal de buscas atingido.", {
      used: q.searchUsed,
      limit: q.searchLimit,
    });
  }
  if (q.placeUsed >= q.placeLimit) {
    throw new AppError("PLAN_LIMIT_REACHED", "Limite mensal de resultados atingido.", {
      used: q.placeUsed,
      limit: q.placeLimit,
    });
  }
  return q;
}

export async function recordUsage(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    userId?: string;
    eventType: string;
    provider?: string;
    quantity?: number;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("usage_events").insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    event_type: input.eventType,
    provider: input.provider ?? null,
    quantity: input.quantity ?? 1,
    metadata: input.metadata ?? null,
  });
}

/**
 * Simple sliding-window rate limit backed by usage_events.
 * Throws RATE_LIMIT_EXCEEDED when the caller exceeded maxPerMinute.
 */
export async function assertRateLimit(
  admin: SupabaseClient,
  organizationId: string,
  eventType: string,
  maxPerMinute: number,
) {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_type", eventType)
    .gte("created_at", oneMinuteAgo);
  if ((count ?? 0) >= maxPerMinute) {
    throw new AppError("RATE_LIMIT_EXCEEDED", "Limite temporário atingido.", {
      retryAfterSeconds: 30,
    });
  }
}

export async function writeAudit(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });
}
