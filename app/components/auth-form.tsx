"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export function AuthForm({ onUserChange }: { onUserChange?: (user: any) => void } = {}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      onUserChange?.(currentUser);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      onUserChange?.(currentUser);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [onUserChange]);

  async function signIn() {
    if (!email) return setMessage("Oops! Please enter your email.");
    setMessage(null);
    setLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/auth/callback` 
        : undefined;
      
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      if (error) throw error;
      setMessage("Check your email! Click the link to sign in.");
      setEmail("");
    } catch (err: any) {
      setMessage(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-400">Welcome,</div>
        <div className="text-sm font-medium text-zinc-100 truncate max-w-xs">{user.email ?? user.phone ?? user.id}</div>
        <button
          onClick={signOut}
          className="rounded-[12px] border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="email"
          name="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="h-12 flex-1 rounded-[12px] bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-all duration-200 focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-zinc-950"
        />
        <button
          onClick={signIn}
          disabled={loading}
          className="h-12 shrink-0 rounded-[12px] bg-emerald-600 px-6 text-sm font-medium uppercase tracking-wide text-white transition-all duration-200 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed sm:whitespace-nowrap"
        >
          {loading ? "Sending…" : "Sign in"}
        </button>
      </div>
      {message && <div className="text-xs text-zinc-400">{message}</div>}
    </div>
  );
}
