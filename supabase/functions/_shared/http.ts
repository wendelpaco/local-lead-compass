// Shared HTTP helpers: CORS, standardized errors, structured logs.
export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export function apiError(
  requestId: string,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): Response {
  const body: ApiError = { code, message, details, requestId };
  return json(body, status);
}

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 422,
  PLAN_LIMIT_REACHED: 402,
  RATE_LIMIT_EXCEEDED: 429,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_QUOTA_EXCEEDED: 429,
  INVALID_LOCATION: 422,
  SEARCH_NOT_FOUND: 404,
  LEAD_NOT_FOUND: 404,
  DUPLICATE_LEAD: 409,
  EXPORT_FAILED: 500,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
  toResponse(requestId: string): Response {
    return apiError(requestId, this.code, this.message, STATUS_BY_CODE[this.code] ?? 500, this.details);
  }
}

// Structured log — never log keys, tokens or full payloads.
export function logEvent(fields: Record<string, unknown>): void {
  console.log(JSON.stringify(fields));
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}
