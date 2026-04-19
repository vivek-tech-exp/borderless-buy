"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/app/lib/supabase";

export type AuthUserChangeHandler = (user: User | null) => void;

type UseSupabaseAuthUserParams = {
  onUserChange?: AuthUserChangeHandler;
  onSignedIn?: (user: User) => void;
};

export function useSupabaseAuthUser({
  onUserChange,
  onSignedIn,
}: UseSupabaseAuthUserParams = {}): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      onUserChange?.(null);
      return;
    }

    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      onUserChange?.(currentUser);
    }

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      onUserChange?.(currentUser);
      if (currentUser) {
        onSignedIn?.(currentUser);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [onSignedIn, onUserChange]);

  return user;
}

export function getAuthRedirectUrl(): string | undefined {
  if (typeof globalThis.location === "undefined") {
    return undefined;
  }
  return `${globalThis.location.origin}/api/auth/callback`;
}

export function getAuthErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function setConfigMessage(
  setMessage: Dispatch<SetStateAction<string | null>>,
  configError: string
): true | false {
  if (!isSupabaseConfigured) {
    setMessage(configError);
    return true;
  }
  return false;
}
