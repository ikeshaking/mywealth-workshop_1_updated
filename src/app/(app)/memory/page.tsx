"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { BoAvatar } from "@/components/brand/Logo";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBo } from "@/lib/store/BoProvider";
import type { Memory, MemoryCategory } from "@/lib/types";
import { Pencil, X, Check, Trash2 } from "lucide-react";

const GROUPS: { key: MemoryCategory; title: string; subtitle: string; icon: string }[] = [
  { key: "about", title: "About you", subtitle: "The basics Nook works from.", icon: "🏠" },
  { key: "preference", title: "Your preferences", subtitle: "How you like things done.", icon: "💚" },
  { key: "date", title: "Dates Nook is tracking", subtitle: "So nothing sneaks up on you.", icon: "📅" },
  { key: "fact", title: "Things Nook has noticed", subtitle: "Picked up from what you've shared.", icon: "✨" },
];

function MemoryRow({ memory }: { memory: Memory }) {
  const { updateMemory, forgetMemory } = useBo();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memory.value);

  return (
    <div className="rounded-xl border border-black/[0.05] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{memory.label}</p>
          {editing ? (
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                value={value}
                autoFocus
                onChange={(e) => setValue(e.target.value)}
                className="py-1.5 text-sm"
              />
              <button
                aria-label="Save"
                onClick={() => {
                  updateMemory(memory.id, value.trim() || memory.value);
                  setEditing(false);
                }}
                className="rounded-lg bg-eucalypt-600 p-1.5 text-white hover:bg-eucalypt-700"
              >
                <Check size={15} />
              </button>
              <button
                aria-label="Cancel"
                onClick={() => {
                  setValue(memory.value);
                  setEditing(false);
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas-soft"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-ink-soft">{memory.value}</p>
          )}
          <p className="mt-1 text-xs text-ink-faint">Nook remembers this — {memory.source}</p>
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={`Edit ${memory.label}`}
              onClick={() => setEditing(true)}
              className="rounded-lg p-1.5 text-ink-faint hover:bg-eucalypt-50 hover:text-eucalypt-700"
            >
              <Pencil size={15} />
            </button>
            <button
              aria-label={`Forget ${memory.label}`}
              title="Forget this"
              onClick={() => forgetMemory(memory.id)}
              className="rounded-lg p-1.5 text-ink-faint hover:bg-clay-100 hover:text-clay-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const { data, addMemory } = useBo();
  const [newFact, setNewFact] = useState("");

  const memories = data.memories ?? [];

  const submit = () => {
    const text = newFact.trim();
    if (!text) return;
    addMemory({ category: "fact", label: "Note", value: text, source: "You told Nook this." });
    setNewFact("");
  };

  return (
    <div>
      <AppHeader back title="What Nook remembers" />
      <div className="container-app space-y-4 py-4">
        {/* Intro / trust */}
        <Card className="bg-eucalypt-50/60">
          <div className="flex items-start gap-2">
            <BoAvatar size={26} />
            <div>
              <p className="text-sm text-ink">
                Here&apos;s what I remember, so you don&apos;t have to repeat yourself. You&apos;re in
                control — edit or forget anything, anytime.
              </p>
              <p className="mt-1.5 text-xs text-ink-faint">
                In this demo, everything below is stored privately on your device. Nothing is shared.
              </p>
            </div>
          </div>
        </Card>

        {/* Add something */}
        <Card className="space-y-2">
          <CardTitle className="text-sm">Tell Nook something to remember</CardTitle>
          <div className="flex items-end gap-2">
            <Input
              value={newFact}
              placeholder="e.g. I'm vegetarian · My car is due for a service in spring"
              onChange={(e) => setNewFact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <Button size="sm" onClick={submit} disabled={!newFact.trim()}>
              Remember
            </Button>
          </div>
        </Card>

        {/* Grouped memories */}
        {memories.length === 0 ? (
          <EmptyState
            icon="🧠"
            title="Nook hasn't remembered anything yet"
            body="As you chat and add things, Nook will keep the useful details here."
          />
        ) : (
          GROUPS.map((group) => {
            const list = memories.filter((m) => m.category === group.key);
            if (list.length === 0) return null;
            return (
              <section key={group.key} aria-labelledby={`mem-${group.key}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span aria-hidden>{group.icon}</span>
                  <div>
                    <h2 id={`mem-${group.key}`} className="text-base font-semibold text-ink">
                      {group.title}
                    </h2>
                    <p className="text-xs text-ink-faint">{group.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {list.map((m) => (
                    <MemoryRow key={m.id} memory={m} />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <p className="pb-2 text-center text-xs text-ink-faint">
          Nook only uses these to be more helpful. Forgetting something removes it for good.
        </p>
      </div>
    </div>
  );
}
