"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "Tell Bo anything…" composer.
 *  - Text input (Enter to send, Shift+Enter for newline)
 *  - Mic: live speech-to-text via the browser's Web Speech API (free, on-device
 *    where supported). Gracefully hidden when unsupported.
 *  - Upload: attach a photo/document. In demo mode the file name is appended as
 *    context (a placeholder for real OCR/vision, which the OpenAI path enables).
 */

// Minimal typing for the vendor-prefixed Web Speech API.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function Composer({
  onSend,
  busy,
  placeholder = "Tell Bo anything…",
  autoFocus,
}: {
  onSend: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setMicSupported(!!getSpeechRecognition());
    return () => recognitionRef.current?.stop();
  }, []);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
    inputRef.current?.focus();
  };

  const toggleMic = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-AU";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = value ? value + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      setValue((finalText + interim).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Demo: append the file name as context. Real OCR/vision runs on the OpenAI path.
    setValue((v) => (v ? `${v} ` : "") + `[attached: ${file.name}] `);
    inputRef.current?.focus();
    e.target.value = "";
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
        {micSupported && (
          <button
            type="button"
            title={listening ? "Stop listening" : "Speak to Bo"}
            aria-label={listening ? "Stop listening" : "Speak to Bo"}
            aria-pressed={listening}
            onClick={toggleMic}
            className={cn(
              "rounded-lg p-2 transition-colors",
              listening
                ? "bg-clay-100 text-clay-600 animate-pulse-soft"
                : "text-ink-faint hover:bg-eucalypt-50 hover:text-eucalypt-700",
            )}
          >
            <Mic size={18} />
          </button>
        )}
        <button
          type="button"
          title="Attach a photo or document"
          aria-label="Attach a photo or document"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg p-2 text-ink-faint hover:bg-eucalypt-50 hover:text-eucalypt-700"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx"
          className="hidden"
          onChange={onFile}
        />
      </div>
      <label htmlFor="bo-composer" className="sr-only">
        Tell Bo anything
      </label>
      <textarea
        id="bo-composer"
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
        placeholder={listening ? "Listening…" : placeholder}
        className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Send to Bo"
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
