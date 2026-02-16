"use client";

import { useState, useCallback, useEffect, useMemo, useRef, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ChartPieIcon, CurrencyDollarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { AddItemForm } from "@/app/components/add-item-form";
import { WishlistCard } from "@/app/components/wishlist-card";
import { AnalyticsPie } from "@/app/components/analytics-pie";
import { CountryFlagSelector } from "@/app/components/country-flag-selector";
import { PromptInfoModal } from "@/app/components/prompt-info-modal";
import { ThemeSwitcher } from "@/app/components/theme-switcher";
import { ViewModeToggle, type ViewMode } from "@/app/components/view-mode-toggle";
import { MarketItemsList } from "@/app/components/market-items-list";
import { Input } from "@/app/components/ui/input";
import { useCurrency } from "@/app/lib/currency-context";
import { supabase } from "@/app/lib/supabase";
import { SignInModal } from "@/app/components/sign-in-modal";
import { buildMarketSummary } from "@/app/lib/market-summary";
import {
  createWishlistItem,
  createWishlistItemWithRetry,
  deleteWishlistItem,
  fetchWishlistItems,
  getAccessToken,
  updateWishlistTag,
} from "@/app/lib/wishlist-client";
import type { User } from "@supabase/supabase-js";
import { COUNTRY_LABELS, type CountryCode, type WishlistItem } from "@/types";
import { formatCurrency } from "@/app/lib/utils";

const LOCAL_WISHLIST_KEY = "borderless-buy-guest-wishlist";
const LOCAL_INCOME_KEY = "borderless-buy-income";
const LOCAL_SELECTED_KEY = "borderless-buy-selected-items";
const VIEW_MODE_KEY = "borderless-buy-view-mode";
const MAX_INCOME_VALUE = 99_999_999;
const RETRY_DELAYS_MS = [100, 200] as const;

function clearGuestStorage() {
  globalThis.localStorage.removeItem(LOCAL_WISHLIST_KEY);
  globalThis.localStorage.removeItem(LOCAL_INCOME_KEY);
}

function parseJsonArray<T>(value: string | null): T[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function removeSelectionId(previous: Set<string>, id: string): Set<string> {
  const next = new Set(previous);
  next.delete(id);
  return next;
}

function hydrateGuestState(params: {
  setItems: Dispatch<SetStateAction<WishlistItem[]>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  setIncomeInput: Dispatch<SetStateAction<string>>;
}) {
  const storedItems = parseJsonArray<WishlistItem>(globalThis.localStorage.getItem(LOCAL_WISHLIST_KEY));
  if (storedItems) {
    params.setItems(storedItems);
  } else if (globalThis.localStorage.getItem(LOCAL_WISHLIST_KEY)) {
    console.warn("Failed to load wishlist from localStorage");
    globalThis.localStorage.removeItem(LOCAL_WISHLIST_KEY);
  }

  const storedSelected = parseJsonArray<string>(globalThis.localStorage.getItem(LOCAL_SELECTED_KEY));
  if (storedSelected && storedSelected.length > 0) {
    params.setSelectedIds(new Set(storedSelected));
  } else if (globalThis.localStorage.getItem(LOCAL_SELECTED_KEY)) {
    console.warn("Failed to load selected items from localStorage");
    globalThis.localStorage.removeItem(LOCAL_SELECTED_KEY);
  }

  const savedIncome = globalThis.localStorage.getItem(LOCAL_INCOME_KEY);
  if (savedIncome) {
    params.setIncomeInput(savedIncome);
  }
}

function createStorageChangeHandler(params: {
  isSignedIn: boolean;
  setIncomeInput: Dispatch<SetStateAction<string>>;
  setItems: Dispatch<SetStateAction<WishlistItem[]>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  return (event: StorageEvent) => {
    if (event.key === LOCAL_INCOME_KEY) {
      params.setIncomeInput(event.newValue ?? "");
      return;
    }

    if (event.key === LOCAL_WISHLIST_KEY) {
      if (params.isSignedIn) return;
      const syncedItems = parseJsonArray<WishlistItem>(event.newValue);
      if (syncedItems) {
        params.setItems(syncedItems);
      } else if (event.newValue === null) {
        params.setItems([]);
      } else {
        console.warn("Failed to parse synced wishlist items");
      }
      return;
    }

    if (event.key !== LOCAL_SELECTED_KEY) {
      return;
    }

    const syncedSelected = parseJsonArray<string>(event.newValue);
    if (syncedSelected) {
      params.setSelectedIds(new Set(syncedSelected));
    } else if (event.newValue === null) {
      params.setSelectedIds(new Set());
    } else {
      console.warn("Failed to parse synced selected items");
    }
  };
}

function useWishlistAuthSync(params: {
  setItems: Dispatch<SetStateAction<WishlistItem[]>>;
  setUser: Dispatch<SetStateAction<User | null>>;
}) {
  const { setItems, setUser } = params;

  useEffect(() => {
    let mounted = true;

    async function migrateGuestDataToServer(token: string) {
      const stored = globalThis.localStorage.getItem(LOCAL_WISHLIST_KEY);
      if (!stored) return;

      const guestItems = parseJsonArray<WishlistItem>(stored);
      if (!guestItems) {
        clearGuestStorage();
        return;
      }

      if (guestItems.length === 0) {
        clearGuestStorage();
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      for (const item of guestItems) {
        const uploaded = await createWishlistItemWithRetry(token, item, [...RETRY_DELAYS_MS]);
        if (uploaded) {
          successCount += 1;
        } else {
          failureCount += 1;
          console.warn(`Failed to migrate item "${item.product.displayName}" after retries`);
        }
      }

      console.log(
        `✓ Migration complete: ${successCount}/${guestItems.length} items uploaded` +
        (failureCount > 0 ? `, ${failureCount} failed` : "")
      );
      clearGuestStorage();
    }

    async function syncWishlistFromServer(token: string) {
      await migrateGuestDataToServer(token);
      try {
        const serverItems = await fetchWishlistItems(token);
        if (!mounted) return;
        setItems(serverItems);
        clearGuestStorage();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Failed to load wishlist:", message);
      }
    }

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session?.access_token) return;
      await syncWishlistFromServer(session.access_token);
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.access_token) {
        void syncWishlistFromServer(session.access_token);
        return;
      }

      if (event === "SIGNED_OUT") {
        setItems([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setItems, setUser]);
}

export default function MainDashboard() {
  // Initialize with empty arrays to match SSR (prevents hydration errors)
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [totalsExpanded, setTotalsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (globalThis.localStorage === undefined) return "global";
    const stored = globalThis.localStorage.getItem(VIEW_MODE_KEY);
    return stored === "local" || stored === "global" ? stored : "global";
  });
  const [incomeInput, setIncomeInput] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandCheapest, setExpandCheapest] = useState(true);
  const [expandHome, setExpandHome] = useState(true);
  const [selectedCompareCode, setSelectedCompareCode] = useState<CountryCode | null>(null);
  const [totalsHighlight, setTotalsHighlight] = useState(false);
  const hasLoadedFromStorage = useRef(false);
  const totalsPanelRef = useRef<HTMLDivElement | null>(null);

  const { convertToPreferred, preferredCurrency, preferredCountry } = useCurrency();

  // Load guest data from localStorage after mount (client-only, avoids hydration errors)
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;

    hydrateGuestState({
      setItems,
      setSelectedIds,
      setIncomeInput,
    });

    hasLoadedFromStorage.current = true;
  }, []);

  // Load persisted items for signed-in users; sync with auth state.
  useWishlistAuthSync({ setItems, setUser });

  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return;
    const mediaQuery = globalThis.matchMedia("(min-width: 640px)");
    const setDefault = () => setTotalsExpanded(mediaQuery.matches);
    setDefault();
    mediaQuery.addEventListener("change", setDefault);
    return () => mediaQuery.removeEventListener("change", setDefault);
  }, []);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return;
    const mediaQuery = globalThis.matchMedia("(min-width: 640px)");
    const setDetailsDefault = () => {
      const isDesktop = mediaQuery.matches;
      setExpandCheapest(isDesktop);
      setExpandHome(isDesktop);
    };
    setDetailsDefault();
    mediaQuery.addEventListener("change", setDetailsDefault);
    return () => mediaQuery.removeEventListener("change", setDetailsDefault);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    globalThis.localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  const rollbackAddedItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((entry) => entry.id !== id));
    setSelectedIds((previous) => removeSelectionId(previous, id));
  }, []);

  const handleAdd = useCallback(async (item: WishlistItem, prompt?: string) => {
    setItems((previous) => [item, ...previous]);
    setSelectedIds((previous) => new Set(previous).add(item.id));
    if (prompt) setLastPrompt(prompt);

    try {
      const token = await getAccessToken();
      if (!token) return;
      await createWishlistItem(token, item);
    } catch (error) {
      rollbackAddedItem(item.id);
      console.warn("Failed to persist wishlist item:", error);
    }
  }, [rollbackAddedItem]);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => removeSelectionId(prev, id));

    if (user) {
      (async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          await deleteWishlistItem(token, id);
        } catch (error) {
          console.warn("Error deleting item from server:", error);
        }
      })();
    }
  }, [user]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleUpdateTag = useCallback(async (id: string, tag: string | null) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, tag: tag ?? undefined } : item))
    );

    if (!user) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      await updateWishlistTag(token, id, tag);
    } catch (error) {
      console.warn("Error updating tag:", error);
    }
  }, [user]);

  const incomeAmount = Number(incomeInput);
  const safeIncomeAmount = Number.isFinite(incomeAmount) ? incomeAmount : 0;

  const handleIncomeFocus = useCallback(() => {
    const input = document.getElementById("income-input") as HTMLInputElement | null;
    input?.focus();
  }, []);

  // Validate and sanitize income input
  const handleIncomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty or valid positive numbers up to the configured max.
    if (val === "" || (/^\d+(\.\d{0,2})?$/.test(val) && Number(val) <= MAX_INCOME_VALUE)) {
      setIncomeInput(val);
    }
  }, []);

  useEffect(() => {
    // Don't save until we've loaded from storage (prevents overwriting with empty array)
    if (!hasLoadedFromStorage.current) return;
    if (user) return;
    try {
      globalThis.localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
    } catch (error) {
      // Check if it's a quota error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.error("localStorage quota exceeded");
      }
    }
  }, [items, user]);

  // Persist income preference for guests
  useEffect(() => {
    if (user) return;
    try {
      if (incomeInput) {
        globalThis.localStorage.setItem(LOCAL_INCOME_KEY, incomeInput);
      } else {
        globalThis.localStorage.removeItem(LOCAL_INCOME_KEY);
      }
    } catch {
      // If storage fails, silently skip.
    }
  }, [incomeInput, user]);

  // Sync income across tabs in real-time
  useEffect(() => {
    const handleStorageChange = createStorageChangeHandler({
      isSignedIn: Boolean(user),
      setIncomeInput,
      setItems,
      setSelectedIds,
    });

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, [user]);

  const effectiveSelectedIds = useMemo(() => {
    const currentItemIds = new Set(items.map((item) => item.id));
    return new Set(Array.from(selectedIds).filter((id) => currentItemIds.has(id)));
  }, [items, selectedIds]);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    try {
      const selectedArray = Array.from(effectiveSelectedIds);
      if (selectedArray.length > 0) {
        globalThis.localStorage.setItem(LOCAL_SELECTED_KEY, JSON.stringify(selectedArray));
      } else {
        globalThis.localStorage.removeItem(LOCAL_SELECTED_KEY);
      }
    } catch {
      // If storage fails, silently skip.
    }
  }, [effectiveSelectedIds]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((item) => {
      const trimmed = item.tag?.trim();
      if (trimmed) tags.add(trimmed);
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const effectiveSelectedTag = selectedTag && availableTags.includes(selectedTag) ? selectedTag : null;

  const displayItems = effectiveSelectedTag
    ? items.filter((item) => item.tag?.trim() === effectiveSelectedTag)
    : items;

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(displayItems.map((i) => i.id)));
  }, [displayItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = displayItems.filter((item) => effectiveSelectedIds.has(item.id));
  const itemsForTotals = effectiveSelectedTag ? displayItems : selectedItems;
  const chartItems = itemsForTotals;

  const marketSummary = useMemo(
    () =>
      buildMarketSummary({
        itemsForTotals,
        preferredCountry,
        selectedBestCode: null,
        selectedCompareCode,
        convertToPreferred,
      }),
    [itemsForTotals, preferredCountry, selectedCompareCode, convertToPreferred]
  );
  const {
    totalItems,
    totalsByCountry,
    potentialSavings,
    marketList,
    effectiveBestCode,
    effectiveCompareCode,
    effectiveBestMarket,
    effectiveCompareMarket,
    compareTotal,
    compareSavings,
    bestItems,
    compareItems,
  } = marketSummary;
  const localTotal = totalsByCountry.find((entry) => entry.code === preferredCountry)?.total ?? 0;

  const showTotals = itemsForTotals.length > 0;

  useEffect(() => {
    if (!totalsExpanded) return;
    const timer = setTimeout(() => {
      totalsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTotalsHighlight(true);
      setTimeout(() => setTotalsHighlight(false), 900);
    }, 120);
    return () => clearTimeout(timer);
  }, [totalsExpanded]);

  let wishlistContent: ReactNode;
  if (items.length === 0) {
    wishlistContent = (
      <div className="relative rounded-[12px] border px-6 py-16 text-center" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
        <div className="mx-auto max-w-sm space-y-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full border-2 flex items-center justify-center" style={{borderColor: 'var(--accent-primary)', opacity: 0.3}}>
              <div className="h-6 w-6 rounded-full" style={{backgroundColor: 'var(--accent-primary)', opacity: 0.2}} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">
              Your list is empty.
            </h3>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Start adding the things that matter to you. Whether it&apos;s a piece of tech, a vehicle, or a tool for your craft—let&apos;s find out what it really costs.
            </p>
          </div>
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder*="What"]') as HTMLInputElement;
              input?.focus();
            }}
            className="text-sm font-medium transition-colors"
            style={{color: 'var(--accent-primary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
          >
            Start adding
          </button>
        </div>
      </div>
    );
  } else if (displayItems.length === 0) {
    wishlistContent = (
      <div className="rounded-[12px] border px-6 py-10 text-center" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          No items match this tag yet.
        </p>
      </div>
    );
  } else {
    wishlistContent = (
      <ul className="grid w-full gap-4 lg:grid-cols-2">
        {displayItems.map((item) => (
          <li key={item.id} className="min-w-0">
            <WishlistCard
              item={item}
              selected={effectiveSelectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
              onRemove={handleRemove}
              viewMode={viewMode}
              incomeAmount={safeIncomeAmount}
              onIncomeFocus={handleIncomeFocus}
              onUpdateTag={handleUpdateTag}
              availableTags={availableTags}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-12">
        {/* Hero Section: Logo + Tagline + Currency + Info Button */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] max-w-full" style={{textShadow: '0 6px 18px rgba(0,0,0,0.12)'}}>
              <span className="tracking-[0.04em]">ONE DAY, </span>
              <span className="tracking-[0.04em]" style={{color: 'var(--accent-primary)', textShadow: '0 8px 20px rgba(16,185,129,0.25)'}}>BABY</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] max-w-full">
              Unapologetically Materialistic. Intelligently Sourced.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {/* Compact flag-based country selector */}
            <CountryFlagSelector />
            {/* Theme switcher */}
            <ThemeSwitcher />
            {/* Info button (desktop only - dev tool) */}
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="hidden sm:flex shrink-0 rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
              title="View last Gemini prompt"
              aria-label="View last Gemini prompt"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Sign-in prompt - prominent and inviting */}
        <div className="flex items-center justify-center mt-1">
          {user ? (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-sm">
              <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Signed in as</div>
              <div className="font-semibold text-[var(--text-primary)] truncate max-w-[200px] text-sm">
                {user.email ?? user.phone ?? user.id}
              </div>
              <button
                onClick={() => setShowSignInModal(true)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--bg-primary)]"
              >
                Manage
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-3 rounded-2xl border-2 border-dashed" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-medium text-[var(--text-primary)]">
                    Keep your goals forever.
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--text-tertiary)]">
                    Sign in to secure them—always free.
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--text-tertiary)]">
                    Stored safely on this device until you do.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSignInModal(true)}
                className="px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Sign in free
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="mb-12">
        <AddItemForm onAdd={handleAdd} />
      </section>

      {items.length > 0 && (
        <section className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                View
              </span>
              <ViewModeToggle
                mode={viewMode}
                onToggle={handleViewModeChange}
                countryLabel={COUNTRY_LABELS[preferredCountry]}
              />
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end group">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Income ({preferredCurrency})
                </span>
                <Input
                  id="income-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={MAX_INCOME_VALUE}
                  placeholder="0"
                  value={incomeInput}
                  onChange={handleIncomeChange}
                  className="h-9 w-32 px-3 text-sm"
                  aria-label="Monthly income"
                />
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-75"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="Private on this device only. Never sent to servers."
                  aria-label="Income privacy details"
                >
                  <LockClosedIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <span
                className="text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Private on this device only. Never sent to servers.
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm sm:text-base font-medium text-[var(--text-secondary)] flex items-center gap-2">
            <svg className="h-4 w-4" style={{color: 'var(--accent-primary)'}} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Your List
          </h2>
          {items.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
              >
                Pick all
              </button>
              <span className="text-[var(--border-primary)]" aria-hidden>·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        {availableTags.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                Goals
              </span>
              <span className="h-3 w-px" style={{backgroundColor: 'var(--border-primary)'}} aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="text-xs rounded-full px-3 py-1 transition-colors"
              style={{
                backgroundColor: effectiveSelectedTag ? "var(--bg-secondary)" : "var(--accent-primary)",
                color: effectiveSelectedTag ? "var(--text-secondary)" : "white",
              }}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className="text-xs rounded-full px-3 py-1 transition-colors"
                style={{
                  backgroundColor: effectiveSelectedTag === tag ? "var(--accent-primary)" : "var(--bg-secondary)",
                  color: effectiveSelectedTag === tag ? "white" : "var(--text-secondary)",
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        {wishlistContent}
      </section>

      <section className="mb-12">
        <h2 className="mb-6 text-sm sm:text-base font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <ChartPieIcon className="h-4 w-4" style={{color: 'var(--accent-primary)'}} />
          Price Comparison Across Markets
        </h2>
        <AnalyticsPie items={chartItems} />
      </section>

      {showTotals && (
        <section className="mb-12">
          <div className="mb-6 rounded-2xl border px-4 py-4 sm:px-5" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)'}}>
                  <CurrencyDollarIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                    Market comparison
                  </p>
                  <h2 className="text-base sm:text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                    Best total for your list
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{color: 'var(--text-tertiary)'}}>
                    <span>80%+ item coverage</span>
                    {compareSavings != null && compareSavings > 0 && (
                      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)'}}>
                        Save {formatCurrency(compareSavings, preferredCurrency)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTotalsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:hidden"
                style={{borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)'}}
                aria-expanded={totalsExpanded}
                aria-controls="totals-panel"
              >
                {totalsExpanded ? "Hide details" : "Show details"}
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${totalsExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.2l3.71-3.97a.75.75 0 111.1 1.02l-4.25 4.55a.75.75 0 01-1.1 0L5.21 8.27a.75.75 0 01.02-1.06z" />
                </svg>
              </button>
            </div>
            <div className="mt-3" />
          </div>
          <div
            id="totals-panel"
            ref={totalsPanelRef}
            className={`${totalsExpanded ? "block" : "hidden"} sm:block transition-all duration-200 ${totalsHighlight ? "ring-2 ring-emerald-200/60" : ""}`}
          >
            {viewMode === "local" ? (
              /* Local Mode - Show only home country total */
              <div className="rounded-2xl border p-6 max-w-md" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
                <p className="text-xs uppercase tracking-wide font-medium mb-3" style={{color: 'var(--text-secondary)'}}>
                  Total in {COUNTRY_LABELS[preferredCountry]}
                </p>
                <p className="text-4xl font-bold" style={{color: 'var(--accent-primary)'}}>
                  {localTotal > 0 ? formatCurrency(localTotal, preferredCurrency) : formatCurrency(0, preferredCurrency)}
                </p>
                <p className="text-xs mt-2" style={{color: 'var(--text-tertiary)'}}>
                  Cost for {itemsForTotals.length} {itemsForTotals.length === 1 ? "item" : "items"}
                </p>
              </div>
            ) : (
              /* Global Mode - Show all countries */
              <div className="space-y-4">
                <div className="rounded-2xl border px-4 py-4 sm:px-5" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                        Best market right now
                      </p>
                      <p className="mt-1 text-lg sm:text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
                        {effectiveBestMarket?.label ?? "Best market"}
                      </p>
                      {effectiveBestMarket && totalItems > 0 && (
                        <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                          Coverage: {effectiveBestMarket.count}/{totalItems} items
                        </p>
                      )}
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-semibold" style={{color: 'var(--accent-primary)'}}>
                          {effectiveBestMarket?.total ? formatCurrency(effectiveBestMarket.total, preferredCurrency) : "Not available"}
                        </span>
                        <span className="text-xs sm:text-sm" style={{color: 'var(--text-tertiary)'}}>
                          total for {itemsForTotals.length} {itemsForTotals.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>
                    {potentialSavings != null && potentialSavings > 0 && (
                      <div className="inline-flex items-center rounded-full px-3 py-1 text-xs" style={{backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)'}}>
                        Save {formatCurrency(potentialSavings, preferredCurrency)} vs home
                      </div>
                    )}
                  </div>
                  <details
                    className="mt-4 rounded-xl border px-4 py-3"
                    style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}
                    open={expandCheapest}
                    onToggle={(e) => setExpandCheapest((e.target as HTMLDetailsElement).open)}
                  >
                    <summary className="cursor-pointer text-xs sm:text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                      View items in {effectiveBestMarket?.label ?? "best market"}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <MarketItemsList
                        marketCode={effectiveBestCode}
                        items={bestItems}
                        preferredCurrency={preferredCurrency}
                      />
                    </div>
                  </details>
                </div>

                <div className="rounded-2xl border px-4 py-4 sm:px-5" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-tertiary)'}}>
                        Compare another market
                      </p>
                      <p className="text-sm sm:text-base font-medium" style={{color: 'var(--text-secondary)'}}>
                        See how close it gets to the best value
                      </p>
                      {effectiveCompareMarket && totalItems > 0 && (
                        <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                          Coverage: {effectiveCompareMarket.count}/{totalItems} items
                        </p>
                      )}
                    </div>
                    <select
                      value={effectiveCompareCode ?? ""}
                      onChange={(e) => setSelectedCompareCode(e.target.value as CountryCode)}
                      className="rounded-md border px-2 py-1 text-xs sm:text-sm"
                      style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)'}}
                    >
                      {marketList.map((entry) => (
                        <option key={entry.code} value={entry.code}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
                      {compareTotal > 0 ? formatCurrency(compareTotal, preferredCurrency) : "Not available"}
                    </span>
                    <span className="text-xs sm:text-sm" style={{color: 'var(--text-tertiary)'}}>
                      {compareSavings != null && compareSavings > 0
                        ? `About ${formatCurrency(compareSavings, preferredCurrency)} above best value`
                        : "Aligned with the best value total"}
                    </span>
                  </div>
                  <details
                    className="mt-4 rounded-xl border px-4 py-3"
                    style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}
                    open={expandHome}
                    onToggle={(e) => setExpandHome((e.target as HTMLDetailsElement).open)}
                  >
                    <summary className="cursor-pointer text-xs sm:text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                      View items in {COUNTRY_LABELS[effectiveCompareCode]}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <MarketItemsList
                        marketCode={effectiveCompareCode}
                        items={compareItems}
                        preferredCurrency={preferredCurrency}
                      />
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showPromptModal && (
        <PromptInfoModal
          prompt={lastPrompt}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onUserChange={setUser}
      />
    </main>
  );
}
