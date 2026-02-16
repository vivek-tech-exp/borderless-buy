import { supabase } from "@/app/lib/supabase";
import type { WishlistItem } from "@/types";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type WishlistApiPayload = {
  error?: string;
  items?: WishlistItem[];
};

function authHeaders(token: string): HeadersInit {
  return { ...JSON_HEADERS, Authorization: `Bearer ${token}` };
}

async function parseApiPayload(response: Response): Promise<WishlistApiPayload> {
  try {
    return (await response.json()) as WishlistApiPayload;
  } catch {
    return {};
  }
}

function buildErrorMessage(response: Response, payload: WishlistApiPayload, fallback: string): string {
  return payload.error ?? response.statusText ?? fallback;
}

export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function fetchWishlistItems(token: string): Promise<WishlistItem[]> {
  const response = await fetch("/api/wishlist", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await parseApiPayload(response);
  if (!response.ok) {
    throw new Error(buildErrorMessage(response, payload, "Failed to load wishlist"));
  }
  return payload.items ?? [];
}

export async function createWishlistItem(token: string, item: WishlistItem): Promise<void> {
  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ item }),
  });
  if (response.ok || response.status === 409) {
    return;
  }
  const payload = await parseApiPayload(response);
  throw new Error(buildErrorMessage(response, payload, "Failed to save wishlist item"));
}

export async function createWishlistItemWithRetry(
  token: string,
  item: WishlistItem,
  retryDelaysMs: number[] = [100, 200]
): Promise<boolean> {
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      await createWishlistItem(token, item);
      return true;
    } catch {
      if (attempt === retryDelaysMs.length) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
    }
  }
  return false;
}

export async function deleteWishlistItem(token: string, id: string): Promise<void> {
  const response = await fetch(`/api/wishlist?id=${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const payload = await parseApiPayload(response);
    throw new Error(buildErrorMessage(response, payload, "Failed to delete wishlist item"));
  }
}

export async function updateWishlistTag(token: string, id: string, tag: string | null): Promise<void> {
  const response = await fetch("/api/wishlist", {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ id, tag }),
  });
  if (!response.ok) {
    const payload = await parseApiPayload(response);
    throw new Error(buildErrorMessage(response, payload, "Failed to update wishlist tag"));
  }
}
