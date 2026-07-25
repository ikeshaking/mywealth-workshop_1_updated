"use client";

import { useRef, useState } from "react";
import { Send, Mic, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "Tell Mabel anything…" composer. Text input plus placeholders for voice
 * and image/document upload (labelled "coming soon" so nothing feels broken).
 */
export function Composer({
  onSend,
  busy,
  placeholder = "Tell Mabel anything…",
  autoFocus,
}: {
  onSend: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-eucalypt-200 bg-white p-2 shadow-soft"
    >
      <div className="flex gap-1 pb-1">
        <button
          type="button"
          title="Voice input (coming soon)"
          aria-label="Voice input (coming soon)"
          disabled
          className="rounded-lg p-2 text-ink-faint opacity-60"
        >
          <Mic size={18} />
        </button>
        <button
          type="button"
          title="Upload a photo or document (coming soon)"
          aria-label="Upload a photo or document (coming soon)"
          disabled
          className="rounded-lg p-2 text-ink-faint opacity-60"
        >
          <ImagePlus size={18} />
        </button>
      </div>
      <label htmlFor="mabel-composer" className="sr-only">
        Tell Mabel anything
      </label>
      <textarea
        id="mabel-composer"
        ref={inputRef}
        value={value}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={placeholder}
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Send to Mabel"
        disabled={busy || !value.trim()}
        className={cn(
          "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-eucalypt-600 text-white transition-colors hover:bg-eucalypt-700 disabled:opacity-40",
        )}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
      </button>
    </form>
  );
}
