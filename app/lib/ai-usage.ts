import { createHmac } from "crypto";
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

type ConsumeFreeCreditRow = {
  allowed: boolean;
  free_credits_used: number;
  free_credits_remaining: number;
};

export type AiUsageSnapshot = {
  freeCreditsUsed: number;
  freeCreditsRemaining: number;
};

export type ConsumeFreeCreditResult = AiUsageSnapshot & {
  allowed: boolean;
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
  const secret = process.env.IP_HASH_SECRET;
  if (!ipAddress || !secret) {
    return null;
  }

  return createHmac("sha256", secret).update(ipAddress).digest("hex");
}

export function getFreeCreditsRemaining(freeCreditsUsed: number): number {
  return Math.max(FREE_AI_CREDITS - freeCreditsUsed, 0);
}

export async function getAiUsageSnapshot(params: {
  anonymousId: string | null;
}): Promise<AiUsageSnapshot> {
  const client = getAiUsageClient();
  if (!client || !params.anonymousId) {
    return {
      freeCreditsUsed: 0,
      freeCreditsRemaining: FREE_AI_CREDITS,
    };
  }

  const { data, error } = await client
    .from("onedaybaby_ai_usage")
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

  return {
    freeCreditsUsed: 0,
    freeCreditsRemaining: FREE_AI_CREDITS,
  };
}

export async function consumeFreeAiCredit(params: {
  anonymousId: string | null;
  ipHash: string | null;
}): Promise<ConsumeFreeCreditResult> {
  const client = getAiUsageClient();

  if (!client || !params.anonymousId) {
    logger.warn("AI usage quota cannot be consumed without Supabase and anonymousId", {
      hasClient: Boolean(client),
      hasAnonymousId: Boolean(params.anonymousId),
    });
    return {
      allowed: false,
      freeCreditsUsed: FREE_AI_CREDITS,
      freeCreditsRemaining: 0,
    };
  }

  const { data, error } = await client
    .rpc("consume_ai_free_credit", {
      p_anonymous_id: params.anonymousId,
      p_ip_hash: params.ipHash,
      p_max_credits: FREE_AI_CREDITS,
    })
    .single();

  if (error) {
    logger.warn("AI usage credit consumption failed", {
      anonymousId: params.anonymousId,
      message: error.message,
    });
    return {
      allowed: false,
      freeCreditsUsed: FREE_AI_CREDITS,
      freeCreditsRemaining: 0,
    };
  }

  const row = data as ConsumeFreeCreditRow;
  const used = Math.max(Number(row.free_credits_used) || 0, 0);
  const remaining = Math.max(Number(row.free_credits_remaining) || 0, 0);

  return {
    allowed: Boolean(row.allowed),
    freeCreditsUsed: used,
    freeCreditsRemaining: remaining,
  };
}

export async function logAiRequest(params: AiRequestLogParams): Promise<void> {
  const client = getAiUsageClient();
  if (!client) {
    return;
  }

  const { error } = await client.from("onedaybaby_ai_request_logs").insert({
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
