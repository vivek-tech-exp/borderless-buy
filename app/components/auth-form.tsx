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
    if (!email) return setMessage("Enter an email address");
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMessage("Check your inbox for a magic link to sign in.");
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
      <div className="flex items-center gap-2">
        <div className="text-xs text-zinc-400">Signed in</div>
        <div className="text-sm font-medium text-zinc-100 truncate">{user.email ?? user.phone ?? user.id}</div>
        <button
          onClick={signOut}
          className="ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for magic link"
        className="rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1 text-sm text-zinc-100"
      />
      <button
        onClick={signIn}
        disabled={loading}
        className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-medium text-zinc-900 hover:opacity-90"
      >
        {loading ? "Sending…" : "Sign in"}
      </button>
      {message && <div className="text-xs text-zinc-400">{message}</div>}
    </div>
  );
}
