"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/button";

interface PromptInfoModalProps {
  prompt: string | null;
  onClose: () => void;
}

export function PromptInfoModal({ prompt, onClose }: PromptInfoModalProps) {
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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">
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
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        {prompt ? (
          <pre className="max-h-[60vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
            {prompt}
          </pre>
        ) : (
          <p className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-500">
            Add an item to see the prompt used for Gemini.
          </p>
        )}
      </div>
    </>
  );
}
