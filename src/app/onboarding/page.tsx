"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema, type OnboardingValues } from "@/lib/schemas";
import { CATEGORIES } from "@/lib/types";
import { categoryMeta } from "@/lib/catalog";
import { useBo } from "@/lib/store/BoProvider";
import { getSession } from "@/lib/auth";
import { BoAvatar } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const focusChoices = CATEGORIES.filter((c) =>
  ["bill", "renewal", "subscription", "appointment", "purchase", "family", "travel", "household"].includes(c),
);

export default function OnboardingPage() {
  const router = useRouter();
  const { updatePreferences, data, ready } = useBo();

  useEffect(() => {
    if (!getSession()) router.replace("/signup");
  }, [router]);

  const session = getSession();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      preferred_name: session?.name ?? "",
      household_type: "family",
      focus_areas: ["bill", "renewal"],
      notification_preference: "important",
      proactive_suggestions: true,
    },
  });

  const onSubmit = (values: OnboardingValues) => {
    updatePreferences({ ...values, onboarded: true });
    router.push("/dashboard");
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main id="main" className="container-app flex flex-1 flex-col py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <BoAvatar size={56} />
          <h1 className="mt-3 text-2xl font-semibold text-ink">
            Hi{data.preferences.preferred_name ? `, ${data.preferences.preferred_name}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Just a few essentials so Bo can help the way you like. You can change these anytime.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="What should Bo call you?" error={errors.preferred_name?.message}>
            <Input placeholder="Alex" {...register("preferred_name")} />
          </Field>

          <Field label="Your household" error={errors.household_type?.message}>
            <Select {...register("household_type")}>
              <option value="solo">Just me</option>
              <option value="couple">Me and my partner</option>
              <option value="family">Family with kids</option>
              <option value="shared">Shared / housemates</option>
            </Select>
          </Field>

          <Controller
            control={control}
            name="focus_areas"
            render={({ field }) => (
              <Field
                label="What would you like help with most?"
                hint="Pick a few — Bo prioritises these."
                error={errors.focus_areas?.message as string | undefined}
              >
                <div className="flex flex-wrap gap-2">
                  {focusChoices.map((c) => {
                    const active = field.value.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        aria-pressed={active}
                        onClick={() =>
                          field.onChange(
                            active ? field.value.filter((v) => v !== c) : [...field.value, c],
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                          active
                            ? "border-eucalypt-400 bg-eucalypt-100 text-eucalypt-700"
                            : "border-eucalypt-200 bg-white text-ink-soft hover:bg-eucalypt-50",
                        )}
                      >
                        <span aria-hidden>{categoryMeta[c].emoji}</span>
                        {categoryMeta[c].label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          />

          <Field label="Notifications" error={errors.notification_preference?.message}>
            <Select {...register("notification_preference")}>
              <option value="all">Keep me posted on everything</option>
              <option value="important">Only what&apos;s important</option>
              <option value="quiet">Quiet — I&apos;ll check in myself</option>
            </Select>
          </Field>

          <label className="flex items-start gap-3 rounded-2xl border border-eucalypt-200 bg-white p-4">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 rounded border-eucalypt-300 text-eucalypt-600 focus-visible:ring-eucalypt-300"
              {...register("proactive_suggestions")}
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Let Bo make suggestions proactively
              </span>
              <span className="block text-xs text-ink-soft">
                It&apos;ll surface useful nudges and better options. It always asks before taking
                any external action.
              </span>
            </span>
          </label>

          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            Meet Bo
          </Button>
        </form>
      </main>
    </div>
  );
}
