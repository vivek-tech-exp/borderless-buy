"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import type { WishlistItem } from "@/types";

interface AddItemFormProps {
  onAdd: (item: WishlistItem, prompt?: string) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add item");
      const item = data.item ?? data;
      const prompt = data.prompt;
      onAdd(item as WishlistItem, prompt);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          type="text"
          placeholder="e.g., MacBook, camera, motorcycle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={loading} className="shrink-0 px-6">
          {loading ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <p className="text-xs text-zinc-500">
        💬 Tip: Sign in to keep your list forever. Your future self will thank you!
      </p>
    </form>
  );
}
