"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { signInUnified } from "@/lib/session";
import { isLive } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    const res = await signInUnified(values.email, values.password);
    if (res.ok) router.push("/dashboard");
    else setAuthError(res.error ?? "Couldn't sign you in.");
  };

  const continueAsDemo = async () => {
    await signInUnified("alex@example.com", "demo1234");
    router.push("/dashboard");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in and let Nook pick up where it left off."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-eucalypt-700">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
        </Field>
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-eucalypt-700">
            Forgot password?
          </Link>
        </div>
        {authError && (
          <p role="alert" className="text-sm text-clay-600">
            {authError}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          Log in
        </Button>
      </form>

      {!isLive && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-black/[0.06]" />
            or
            <span className="h-px flex-1 bg-black/[0.06]" />
          </div>
          <Button variant="secondary" fullWidth size="lg" onClick={continueAsDemo}>
            Explore the demo as Alex
          </Button>
          <p className="mt-3 text-center text-xs text-ink-faint">
            Demo mode — no real account or password needed.
          </p>
        </>
      )}
    </AuthShell>
  );
}
