"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useBo } from "@/lib/store/BoProvider";
import { permissionMeta } from "@/lib/catalog";
import { PERMISSION_LEVELS } from "@/lib/types";
import type { PermissionLevel, BoTone } from "@/lib/types";
import { TONES, toneMeta } from "@/lib/tone";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { data, updatePreferences, resetDemo } = useBo();
  const prefs = data.preferences;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bo-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAccount = () => {
    if (confirm("This clears all demo data and signs you out. Continue?")) {
      resetDemo();
      signOut();
      router.push("/");
    }
  };

  return (
    <div>
      <AppHeader title="Settings" />
      <div className="container-app space-y-4 py-4">
        {/* Profile */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Profile</CardTitle>
          <Field label="Preferred name">
            <Input
              defaultValue={prefs.preferred_name}
              onBlur={(e) => updatePreferences({ preferred_name: e.target.value })}
            />
          </Field>
          <p className="text-xs text-ink-faint">Signed in as {data.user.email}</p>
        </Card>

        {/* Bo's voice */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Bo&apos;s voice</CardTitle>
          <p className="text-xs text-ink-soft">
            How should Bo talk to you? You can change this anytime.
          </p>
          <div className="space-y-2">
            {TONES.map((t: BoTone) => {
              const meta = toneMeta[t];
              const active = prefs.tone === t;
              return (
                <button
                  key={t}
                  aria-pressed={active}
                  onClick={() => updatePreferences({ tone: t })}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-eucalypt-400 bg-eucalypt-50"
                      : "border-eucalypt-200 bg-white hover:bg-eucalypt-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      active ? "border-eucalypt-600 bg-eucalypt-600" : "border-eucalypt-300",
                    )}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{meta.description}</span>
                    <span className="mt-1 block text-xs italic text-ink-faint">
                      &ldquo;{meta.sample}&rdquo;
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Household */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Household</CardTitle>
          <Field label="Household type">
            <Select
              value={prefs.household_type}
              onChange={(e) =>
                updatePreferences({ household_type: e.target.value as typeof prefs.household_type })
              }
            >
              <option value="solo">Just me</option>
              <option value="couple">Me and my partner</option>
              <option value="family">Family with kids</option>
              <option value="shared">Shared / housemates</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Select
              value={prefs.currency}
              onChange={(e) => updatePreferences({ currency: e.target.value })}
            >
              <option value="AUD">$ AUD</option>
              <option value="USD">$ USD</option>
              <option value="GBP">£ GBP</option>
              <option value="EUR">€ EUR</option>
            </Select>
          </Field>
        </Card>

        {/* Permissions */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">What Bo can do</CardTitle>
          <p className="text-xs text-ink-soft">
            Choose how much Bo handles on its own. You can change this anytime.
          </p>
          <div className="space-y-2">
            {PERMISSION_LEVELS.map((level: PermissionLevel) => {
              const meta = permissionMeta[level];
              const active = prefs.permission_level === level;
              const disabled = meta.comingSoon;
              return (
                <button
                  key={level}
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => !disabled && updatePreferences({ permission_level: level })}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-eucalypt-400 bg-eucalypt-50"
                      : "border-eucalypt-200 bg-white hover:bg-eucalypt-50",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      active ? "border-eucalypt-600 bg-eucalypt-600" : "border-eucalypt-300",
                    )}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      {meta.label}
                      {meta.comingSoon && (
                        <Badge className="bg-canvas-soft text-ink-faint">Coming soon</Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{meta.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Notifications</CardTitle>
          <Field label="How often should Bo nudge you?">
            <Select
              value={prefs.notification_preference}
              onChange={(e) =>
                updatePreferences({
                  notification_preference: e.target.value as typeof prefs.notification_preference,
                })
              }
            >
              <option value="all">Everything</option>
              <option value="important">Only what&apos;s important</option>
              <option value="quiet">Quiet</option>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-canvas-soft p-3">
            <span className="text-sm text-ink">Proactive suggestions</span>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-eucalypt-300 text-eucalypt-600 focus-visible:ring-eucalypt-300"
              checked={prefs.proactive_suggestions}
              onChange={(e) => updatePreferences({ proactive_suggestions: e.target.checked })}
            />
          </label>
        </Card>

        {/* AI preferences */}
        <Card className="space-y-2">
          <CardTitle className="text-sm">AI &amp; privacy</CardTitle>
          <p className="text-xs text-ink-soft">
            Bo processes your messages to structure them. In demo mode this runs locally with a
            deterministic parser — nothing leaves your browser. With an OpenAI key configured,
            extraction happens on a secure server route; your key is never exposed to the browser.
          </p>
        </Card>

        {/* Integrations */}
        <Card className="space-y-2">
          <CardTitle className="text-sm">Integrations</CardTitle>
          {["Email inbox", "Calendar", "Bank / bills"].map((name) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">{name}</span>
              <Badge className="bg-canvas-soft text-ink-faint">Coming soon</Badge>
            </div>
          ))}
        </Card>

        {/* Data */}
        <Card className="space-y-3">
          <CardTitle className="text-sm">Your data</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportData}>
              Export data
            </Button>
            <Button variant="secondary" size="sm" onClick={resetDemo}>
              Reset demo data
            </Button>
          </div>
          <Button variant="danger" size="sm" onClick={deleteAccount}>
            Delete account
          </Button>
        </Card>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            signOut();
            router.push("/");
          }}
        >
          Sign out
        </Button>

        <p className="pb-4 text-center text-xs text-ink-faint">Bo · demo build</p>
      </div>
    </div>
  );
}
