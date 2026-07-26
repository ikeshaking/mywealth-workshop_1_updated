"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupValues } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { signUpUnified } from "@/lib/session";
import { isLive } from "@/lib/config";

export default function SignupPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignupValues) => {
    setAuthError(null);
    const res = await signUpUnified(values.name, values.email, values.password);
    if (!res.ok) {
      setAuthError(res.error ?? "Couldn't create your account.");
      return;
    }
    if (res.needsConfirmation) setConfirm(true);
    else router.push("/onboarding");
  };

  if (confirm) {
    return (
      <AuthShell title="Almost there" subtitle="Confirm your email to finish.">
        <div className="rounded-2xl border border-eucalypt-200 bg-white p-5 text-center">
          <div className="text-2xl" aria-hidden>
            📬
          </div>
          <p className="mt-2 text-sm font-medium text-ink">Check your inbox</p>
          <p className="mt-1 text-xs text-ink-soft">
            We sent a confirmation link. Tap it, then come back and log in.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-eucalypt-700">
            Go to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Tell Nook once. It handles the rest."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-eucalypt-700">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Your name" error={errors.name?.message}>
          <Input autoComplete="name" placeholder="Alex" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="Password" hint="At least 6 characters." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
        </Field>
        {authError && (
          <p role="alert" className="text-sm text-clay-600">
            {authError}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          Create account
        </Button>
      </form>
      {!isLive && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          Demo mode — this just starts a local session.
        </p>
      )}
    </AuthShell>
  );
}
