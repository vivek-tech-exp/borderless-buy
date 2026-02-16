"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/button";

interface PromptInfoModalProps {
  prompt: string | null;
  onClose: () => void;
}

export function PromptInfoModal({ prompt, onClose }: Readonly<PromptInfoModalProps>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Last Gemini prompt
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={handleCopy}
              disabled={!prompt}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        {prompt ? (
          <pre
            className="max-h-[60vh] overflow-auto rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-wrap break-words"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-tertiary)',
            }}
          >
            {prompt}
          </pre>
        ) : (
          <p
            className="rounded-lg border p-4 text-sm"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-tertiary)',
            }}
          >
            Add an item to see the prompt used for Gemini.
          </p>
        )}
      </div>
    </>
  );
}
