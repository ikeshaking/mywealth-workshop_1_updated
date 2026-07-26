"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "@/lib/schemas";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginValues) => {
    signIn(values.email);
    router.push("/dashboard");
  };

  const continueAsDemo = () => {
    signIn("alex@example.com", "Alex");
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
        <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
          Log in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-black/[0.06]" />
        or
        <span className="h-px flex-1 bg-black/[0.06]" />
      </div>

      <Button
        variant="secondary"
        fullWidth
        size="lg"
        onClick={() => {
          // Prefill so the demo path is obvious, then continue.
          setValue("email", "alex@example.com");
          continueAsDemo();
        }}
      >
        Explore the demo as Alex
      </Button>
      <p className="mt-3 text-center text-xs text-ink-faint">
        Demo mode — no real account or password needed.
      </p>
    </AuthShell>
  );
}
