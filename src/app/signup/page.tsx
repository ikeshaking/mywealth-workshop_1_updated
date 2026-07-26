"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupValues } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { signIn } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = (values: SignupValues) => {
    signIn(values.email, values.name);
    router.push("/onboarding");
  };

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
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-faint">
        We&apos;ll email you a verification link (simulated in demo mode).
      </p>
    </AuthShell>
  );
}
