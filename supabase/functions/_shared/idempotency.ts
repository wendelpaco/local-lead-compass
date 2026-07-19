import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Idempotency guard. Returns the stored response when the same
 * (organization, key, operation) already completed; otherwise runs `fn`,
 * stores its result and returns it.
 */
export async function withIdempotency<T>(
  admin: SupabaseClient,
  organizationId: string,
  key: string | null,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();

  const { data: existing } = await admin
    .from("idempotency_keys")
    .select("status, response")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .eq("operation", operation)
    .maybeSingle();

  if (existing?.status === "completed") return existing.response as T;

  const { error: insertError } = await admin.from("idempotency_keys").insert({
    organization_id: organizationId,
    key,
    operation,
    status: "pending",
    expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
  });
  // Unique violation => concurrent execution in flight; refuse duplicate work.
  if (insertError && existing?.status === "pending") {
    throw new Error("Operação idêntica em andamento. Aguarde a conclusão.");
  }

  try {
    const result = await fn();
    await admin
      .from("idempotency_keys")
      .update({ status: "completed", response: result as unknown as Record<string, unknown> })
      .eq("organization_id", organizationId)
      .eq("key", key)
      .eq("operation", operation);
    return result;
  } catch (err) {
    await admin
      .from("idempotency_keys")
      .update({ status: "failed" })
      .eq("organization_id", organizationId)
      .eq("key", key)
      .eq("operation", operation);
    throw err;
  }
}
