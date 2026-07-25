"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const schema = z.object({ email: z.string().email("Enter a valid email.") });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We&apos;ll send you a link to get back in."
      footer={
        <Link href="/login" className="font-medium text-lavender-700">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-lavender-200 bg-white p-5 text-center">
          <div className="text-2xl" aria-hidden>
            📬
          </div>
          <p className="mt-2 text-sm font-medium text-ink">Check your inbox</p>
          <p className="mt-1 text-xs text-ink-soft">
            If an account exists, a reset link is on its way. (Simulated in demo mode.)
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(() => setSent(true))} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          </Field>
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
