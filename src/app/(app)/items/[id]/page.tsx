"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Copy, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { BoAvatar } from "@/components/brand/Logo";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { draftClient } from "@/lib/ai/client";
import type { Draft } from "@/lib/schemas";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { StatusBadge, PriorityBadge, CategoryBadge, InferredTag } from "@/components/ui/Badge";
import { ItemCard } from "@/components/shared/ItemCard";
import { categoryMeta } from "@/lib/catalog";
import { useBo } from "@/lib/store/BoProvider";
import { PRIORITIES } from "@/lib/types";
import type { Priority } from "@/lib/types";
import { formatDate, formatDateTime, relativeDay, todayIso, addDays } from "@/lib/utils";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    data,
    transition,
    updateItem,
    addNote,
    scheduleReminder,
    requestApproval,
    completeItem,
  } = useBo();

  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const item = data.items.find((i) => i.id === id);

  if (!item) {
    return (
      <div>
        <AppHeader back title="Not found" />
        <div className="container-app py-10 text-center text-ink-soft">
          <p>That item doesn&apos;t exist.</p>
          <Link href="/dashboard" className="mt-3 inline-block text-eucalypt-700">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const events = data.events
    .filter((e) => e.item_id === item.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const reminders = data.reminders.filter((r) => r.item_id === item.id);
  const notes = data.notes.filter((n) => n.item_id === item.id);
  const approval = data.approvals.find((a) => a.item_id === item.id && a.status === "pending");
  const related = data.items
    .filter((i) => i.id !== item.id && i.category === item.category && i.status !== "dismissed")
    .slice(0, 3);

  const handleThis = async () => {
    setDrafting(true);
    setDraftFailed(false);
    const d = await draftClient(
      {
        title: item.title,
        summary: item.summary ?? undefined,
        category: item.category,
        context: item.context ?? undefined,
        original_input: item.original_input ?? undefined,
        recommended_action: item.recommended_action ?? undefined,
      },
      data.preferences.preferred_name,
    );
    setDraft(d);
    setDraftFailed(!d);
    setDrafting(false);
  };

  const copyDraft = () => {
    if (!draft) return;
    void navigator.clipboard?.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const doItNow = () => {
    if (item.decision_request_id) {
      router.push(`/decisions/${item.decision_request_id}`);
      return;
    }
    if (item.category === "bill") {
      // Honest: Nook can't actually pay bills yet — this records that you paid it.
      completeItem(item.id, { summary: `Marked as paid — you handled this one.`, time_saved_minutes: 15 });
      return;
    }
    if (item.status === "ready_for_approval") {
      router.push("/approvals");
      return;
    }
    // Prepare + send to approval.
    requestApproval(item.id, {
      action: item.recommended_action ?? `Handle ${item.title}`,
      reason: `You asked Nook to sort this. Here's what it'll do.`,
      expected_cost: null,
      shares: "Only the details needed to complete this task.",
      reversible: true,
    });
  };

  return (
    <div>
      <AppHeader back title="Task details" />
      <div className="container-app space-y-4 py-4">
        {/* Header card */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eucalypt-50 text-2xl" aria-hidden>
              {categoryMeta[item.category].emoji}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle>{item.title}</CardTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={item.status} />
                <PriorityBadge priority={item.priority} />
                {item.inferred.priority && <InferredTag />}
                <CategoryBadge category={item.category} />
              </div>
            </div>
          </div>
          {item.summary && <p className="mt-3 text-sm text-ink-soft">{item.summary}</p>}
        </Card>

        {/* Key facts */}
        <Card className="space-y-2.5">
          <Row label="Due date">
            {item.due_date ? (
              <span className="inline-flex items-center gap-1.5">
                {formatDate(item.due_date)} · {relativeDay(item.due_date)}
                {item.inferred.due_date && <InferredTag />}
              </span>
            ) : (
              <span className="text-ink-faint">Not known yet</span>
            )}
          </Row>
          <Row label="Reminder">{item.reminder_date ? formatDate(item.reminder_date) : "—"}</Row>
          {item.context && <Row label="Details">{item.context}</Row>}
          <Row label="Confidence">{Math.round(item.confidence_score * 100)}% sure</Row>
        </Card>

        {/* Nook's understanding */}
        <Card className="bg-eucalypt-50/60">
          <div className="flex items-start gap-2">
            <BoAvatar size={26} />
            <div>
              <p className="text-xs font-medium text-eucalypt-700">Nook&apos;s understanding</p>
              <p className="mt-1 text-sm text-ink">
                You said: <span className="italic">&ldquo;{item.original_input}&rdquo;</span>
              </p>
              {item.recommended_action && (
                <p className="mt-2 text-sm text-ink-soft">
                  <span className="font-medium text-ink">Next step:</span> {item.recommended_action}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Do the work — Nook drafts the actual deliverable */}
        {item.status !== "completed" && item.status !== "dismissed" && (
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Let Nook handle it</CardTitle>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Nook drafts the email, message or steps — you just send it.
                </p>
              </div>
              <Button size="sm" onClick={handleThis} disabled={drafting}>
                <Sparkles size={14} className="mr-1" />
                {drafting ? "Working…" : draft ? "Redraft" : "Nook, handle this"}
              </Button>
            </div>
            {draftFailed && (
              <p className="text-xs text-clay-600">
                Couldn&apos;t draft this just now — try again in a moment.
              </p>
            )}
            {draft && (
              <div className="rounded-xl border border-eucalypt-200 bg-eucalypt-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-eucalypt-700">{draft.label}</p>
                  <button
                    onClick={copyDraft}
                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] text-ink-faint hover:text-eucalypt-700"
                  >
                    <Copy size={12} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                  {draft.body}
                </p>
                <p className="mt-2 text-[11px] text-ink-faint">
                  Nook prepared this for you to review and send — it hasn&apos;t sent anything.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Primary actions */}
        {item.status !== "completed" && item.status !== "dismissed" && (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={doItNow} className="col-span-2">
              {item.decision_request_id
                ? "View options"
                : item.status === "ready_for_approval"
                  ? "Go to approval"
                  : "Do it now"}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                scheduleReminder(
                  item.id,
                  addDays(todayIso(), 1) + "T09:00:00.000Z",
                  `Reminder: ${item.title}.`,
                )
              }
            >
              Remind me later
            </Button>
            <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
              Update details
            </Button>
            <Button
              variant="secondary"
              onClick={() => completeItem(item.id, { summary: `Marked ${item.title} complete.` })}
            >
              Mark completed
            </Button>
            <Button variant="ghost" onClick={() => transition(item.id, "dismissed")}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <Card className="space-y-3">
            <CardTitle className="text-sm">Update details</CardTitle>
            <Field label="Due date">
              <Input
                type="date"
                defaultValue={item.due_date ?? ""}
                onChange={(e) =>
                  updateItem(item.id, {
                    due_date: e.target.value || null,
                    inferred: { ...item.inferred, due_date: false },
                  })
                }
              />
            </Field>
            <Field label="Priority">
              <Select
                defaultValue={item.priority}
                onChange={(e) =>
                  updateItem(item.id, {
                    priority: e.target.value as Priority,
                    inferred: { ...item.inferred, priority: false },
                  })
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            {item.status === "needs_information" && (
              <Button
                size="sm"
                onClick={() => {
                  transition(item.id, "needs_attention", "You added the missing detail — thanks!");
                  setEditing(false);
                }}
              >
                Save & mark ready
              </Button>
            )}
          </Card>
        )}

        {/* Approval preview if pending */}
        {approval && (
          <Card className="border-amber-200 bg-amber-50/50">
            <p className="text-xs font-medium text-amber-700">Waiting for your approval</p>
            <p className="mt-1 text-sm font-medium text-ink">{approval.action}</p>
            <p className="mt-1 text-sm text-ink-soft">{approval.reason}</p>
            <Link href="/approvals" className="mt-2 inline-block text-sm font-medium text-eucalypt-700">
              Review in Approvals →
            </Link>
          </Card>
        )}

        {/* Notes */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Notes</CardTitle>
          {notes.length === 0 && <p className="text-sm text-ink-faint">No notes yet.</p>}
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl bg-canvas-soft p-2.5 text-sm text-ink-soft">
              {n.body}
              <div className="mt-1 text-[11px] text-ink-faint">{formatDateTime(n.created_at)}</div>
            </div>
          ))}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note for Nook…"
                rows={2}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (noteText.trim()) {
                  addNote(item.id, noteText.trim());
                  setNoteText("");
                }
              }}
            >
              Add
            </Button>
          </div>
        </Card>

        {/* Reminders */}
        {reminders.length > 0 && (
          <Card className="space-y-2">
            <CardTitle className="text-sm">Reminders</CardTitle>
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{r.message}</span>
                <span className="text-xs text-ink-faint">
                  {r.fired ? "sent" : formatDate(r.fire_at)}
                </span>
              </div>
            ))}
          </Card>
        )}

        {/* Timeline */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Timeline</CardTitle>
          <ol className="relative space-y-3 border-l border-eucalypt-200 pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-eucalypt-400" />
                <p className="text-sm text-ink">{e.message}</p>
                <p className="text-[11px] text-ink-faint">{formatDateTime(e.created_at)}</p>
              </li>
            ))}
          </ol>
        </Card>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink">Related</h2>
            <div className="space-y-2.5">
              {related.map((r) => (
                <ItemCard key={r.id} item={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-ink-faint">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}
