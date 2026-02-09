"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChange?: (user: any) => void;
}

export function SignInModal({ isOpen, onClose, onUserChange }: SignInModalProps) {
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
      if (currentUser) {
        // Auto-close modal after successful sign-in
        onClose();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [onUserChange, onClose]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

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
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity duration-200"
        style={{backgroundColor: 'var(--overlay)'}}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-[16px] border p-8 shadow-2xl" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 transition-colors"
          style={{color: 'var(--text-tertiary)'}}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {user ? (
          // Signed in state
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{color: 'var(--text-primary)'}}>You're signed in!</h2>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Your wishlist is now saved forever.</p>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-[12px] border" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)'}}>
              <div className="flex-1 min-w-0">
                <div className="text-xs mb-1" style={{color: 'var(--text-tertiary)'}}>Signed in as</div>
                <div className="text-sm font-medium truncate" style={{color: 'var(--text-primary)'}}>
                  {user.email ?? user.phone ?? user.id}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full rounded-[12px] border px-6 py-3 text-sm font-medium transition-colors"
              style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          // Sign in form
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2" style={{color: 'var(--text-primary)'}}>Sign in to save your list</h2>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                Enter your email below. We'll send you a magic link—click it to verify and you'll be signed in automatically. No password needed!
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide" style={{color: 'var(--text-tertiary)'}}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  placeholder="you@example.com"
                  className="h-12 rounded-[12px] border px-4 text-sm transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--input-text)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border-focus)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px var(--input-ring)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--input-border)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  disabled={loading}
                />
              </div>

              <button
                onClick={signIn}
                disabled={loading}
                className="h-12 w-full rounded-[12px] text-sm font-medium uppercase tracking-wide text-white transition-all duration-200"
                style={{
                  backgroundColor: `var(--btn-primary-bg)`,
                  color: `var(--btn-primary-text)`,
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                }}
              >
                {loading ? "Sending magic link…" : "Send magic link"}
              </button>

              {message && (
                <div className="rounded-lg border p-3 text-xs" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)'}}>
                  {message}
                </div>
              )}
            </div>

            <p className="text-xs text-center" style={{color: 'var(--text-tertiary)'}}>
              By signing in, you agree to our imaginary terms of service.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
