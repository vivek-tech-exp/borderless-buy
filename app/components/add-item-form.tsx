"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { hasDuplicateWishlistQuery, normalizeProductQuery } from "@/app/lib/product-query";
import type { WishlistItem } from "@/types";

const ANONYMOUS_ID_KEY = "borderless-buy-anonymous-id";
const SESSION_GEMINI_KEY = "borderless-buy-session-gemini-key";
const LOCAL_GEMINI_KEY = "borderless-buy-local-gemini-key";

interface AddItemFormProps {
  items: WishlistItem[];
  onAdd: (item: WishlistItem, prompt?: string) => void;
}

type AddItemResponse = {
  item?: WishlistItem;
  prompt?: string;
  error?: string;
  message?: string;
  requiresUserKey?: boolean;
};

function getAnonymousId(): string {
  const stored = globalThis.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (stored) {
    return stored;
  }

  const id =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  globalThis.localStorage.setItem(ANONYMOUS_ID_KEY, id);
  return id;
}

function getStoredGeminiKey(): string {
  return (
    globalThis.sessionStorage.getItem(SESSION_GEMINI_KEY) ??
    globalThis.localStorage.getItem(LOCAL_GEMINI_KEY) ??
    ""
  );
}

function storeGeminiKey(apiKey: string, remember: boolean) {
  if (remember) {
    globalThis.localStorage.setItem(LOCAL_GEMINI_KEY, apiKey);
    globalThis.sessionStorage.removeItem(SESSION_GEMINI_KEY);
    return;
  }

  globalThis.sessionStorage.setItem(SESSION_GEMINI_KEY, apiKey);
  globalThis.localStorage.removeItem(LOCAL_GEMINI_KEY);
}

export function AddItemForm({ items, onAdd }: Readonly<AddItemFormProps>) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showByok, setShowByok] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);

  async function submitSearch(apiKeyOverride?: string) {
    const q = query.trim();
    if (!q) return;

    const normalizedQuery = normalizeProductQuery(q);
    if (hasDuplicateWishlistQuery(items, normalizedQuery)) {
      setError("That item is already in your plan.");
      return;
    }

    const userGeminiApiKey = apiKeyOverride ?? getStoredGeminiKey();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, string> = {
        query: q,
        anonymousId: getAnonymousId(),
      };

      if (userGeminiApiKey) {
        body.userGeminiApiKey = userGeminiApiKey;
      }

      const res = await fetch("/api/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AddItemResponse;

      if (!res.ok) {
        if (data.error === "FREE_QUOTA_EXHAUSTED" || data.requiresUserKey) {
          setShowByok(true);
          setError(data.message ?? "You have used your 2 free AI searches.");
          return;
        }

        throw new Error(data.error ?? "Failed to add item");
      }

      if (!data.item) {
        throw new Error("Pricing response did not include an item.");
      }

      onAdd(data.item, data.prompt);
      setQuery("");
      setShowByok(false);
      setGeminiApiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitSearch();
  }

  async function handleUseKey() {
    const key = geminiApiKey.trim();
    if (!key) {
      setError("Enter a Gemini API key to continue.");
      return;
    }

    storeGeminiKey(key, rememberKey);
    await submitSearch(key);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Input
          type="text"
          placeholder="What is the next thing you want to own? (e.g., MacBook Pro, Sony Camera...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={loading} className="shrink-0 px-6">
          {loading ? "Adding..." : "Add to Plan"}
        </Button>
      </div>

      {showByok && (
        <div className="rounded-[12px] border p-4" style={{ borderColor: "var(--border-primary)", backgroundColor: "var(--bg-secondary)" }}>
          <div className="mb-3 space-y-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              You&apos;ve used your 2 free AI searches.
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Add your Gemini API key to continue.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="password"
              placeholder="Gemini API key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              disabled={loading}
              className="min-w-0 flex-1"
              autoComplete="off"
            />
            <Button type="button" onClick={handleUseKey} disabled={loading} className="shrink-0 px-6">
              Use key
            </Button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              disabled={loading}
              className="h-4 w-4"
            />
            Remember on this device
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
