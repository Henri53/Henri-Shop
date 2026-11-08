"use client";

import { useState } from "react";

export default function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text stays selectable.
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-bg p-3">
      <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-sm">{text}</pre>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-xs px-2.5 py-1 rounded-md border border-border text-muted hover:text-white transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
