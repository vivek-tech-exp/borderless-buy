import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/app/lib/logger";

const logger = createLogger("AiUsage");

export const FREE_AI_CREDITS = 2;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

export const isAiUsageConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

type AiUsageRow = {
  anonymous_id: string | null;
  free_credits_used: number;
};

export type AiProviderName = "gemini" | "mock";

export type AiRequestLogParams = {
  anonymousId: string | null;
  provider: AiProviderName;
  model?: string;
  usedPlatformKey: boolean;
  usedUserKey: boolean;
  cacheHit: boolean;
  success: boolean;
  errorCode?: string;
  latencyMs: number;
  normalizedProductName?: string;
};

let aiUsageClient: ReturnType<typeof createClient<any>> | null = null;

function getAiUsageClient() {
  if (!isAiUsageConfigured) {
    return null;
  }

  aiUsageClient ??= createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  return aiUsageClient;
}

export function sanitizeAnonymousId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }

  return trimmed;
}

export function hashIpAddress(ipAddress: string | null): string | null {
  if (!ipAddress) {
    return null;
  }

  return createHash("sha256").update(ipAddress).digest("hex");
}

export function getFreeCreditsRemaining(freeCreditsUsed: number): number {
  return Math.max(FREE_AI_CREDITS - freeCreditsUsed, 0);
}

export async function getOrCreateAiUsage(params: {
  anonymousId: string | null;
  ipHash: string | null;
}): Promise<{ freeCreditsUsed: number; freeCreditsRemaining: number }> {
  const client = getAiUsageClient();
  if (!client || !params.anonymousId) {
    return {
      freeCreditsUsed: 0,
      freeCreditsRemaining: FREE_AI_CREDITS,
    };
  }

  const { data, error } = await client
    .from("ai_usage")
    .select("anonymous_id, free_credits_used")
    .eq("anonymous_id", params.anonymousId)
    .maybeSingle();

  if (error) {
    logger.warn("AI usage lookup failed", {
      anonymousId: params.anonymousId,
      message: error.message,
    });
    return {
      freeCreditsUsed: 0,
      freeCreditsRemaining: FREE_AI_CREDITS,
    };
  }

  if (data) {
    const row = data as AiUsageRow;
    const used = Math.max(Number(row.free_credits_used) || 0, 0);
    return {
      freeCreditsUsed: used,
      freeCreditsRemaining: getFreeCreditsRemaining(used),
    };
  }

  const nowIso = new Date().toISOString();
  const { error: insertError } = await client.from("ai_usage").insert({
    anonymous_id: params.anonymousId,
    ip_hash: params.ipHash,
    free_credits_used: 0,
    updated_at: nowIso,
  });

  if (insertError) {
    logger.warn("AI usage insert failed", {
      anonymousId: params.anonymousId,
      message: insertError.message,
    });
  }

  return {
    freeCreditsUsed: 0,
    freeCreditsRemaining: FREE_AI_CREDITS,
  };
}

export async function incrementFreeAiUsage(params: {
  anonymousId: string | null;
  ipHash: string | null;
}): Promise<{ freeCreditsUsed: number; freeCreditsRemaining: number }> {
  const current = await getOrCreateAiUsage(params);
  const client = getAiUsageClient();

  if (!client || !params.anonymousId) {
    return {
      freeCreditsUsed: current.freeCreditsUsed + 1,
      freeCreditsRemaining: getFreeCreditsRemaining(current.freeCreditsUsed + 1),
    };
  }

  const nextUsed = current.freeCreditsUsed + 1;
  const { error } = await client
    .from("ai_usage")
    .update({
      free_credits_used: nextUsed,
      ip_hash: params.ipHash,
      updated_at: new Date().toISOString(),
    })
    .eq("anonymous_id", params.anonymousId);

  if (error) {
    logger.warn("AI usage increment failed", {
      anonymousId: params.anonymousId,
      message: error.message,
    });
    return {
      freeCreditsUsed: nextUsed,
      freeCreditsRemaining: getFreeCreditsRemaining(nextUsed),
    };
  }

  return {
    freeCreditsUsed: nextUsed,
    freeCreditsRemaining: getFreeCreditsRemaining(nextUsed),
  };
}

export async function logAiRequest(params: AiRequestLogParams): Promise<void> {
  const client = getAiUsageClient();
  if (!client) {
    return;
  }

  const { error } = await client.from("ai_request_logs").insert({
    anonymous_id: params.anonymousId,
    provider: params.provider,
    model: params.model,
    used_platform_key: params.usedPlatformKey,
    used_user_key: params.usedUserKey,
    cache_hit: params.cacheHit,
    success: params.success,
    error_code: params.errorCode,
    latency_ms: params.latencyMs,
    normalized_product_name: params.normalizedProductName,
  });

  if (error) {
    logger.warn("AI request log insert failed", {
      anonymousId: params.anonymousId,
      provider: params.provider,
      message: error.message,
    });
  }
}
