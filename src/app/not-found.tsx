import Link from "next/link";
import { MabelAvatar } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
      <MabelAvatar size={56} />
      <h1 className="mt-4 text-2xl font-semibold text-ink">Nothing here</h1>
      <p className="mt-1 text-sm text-ink-soft">This page wandered off. Let&apos;s get you home.</p>
      <Link href="/dashboard" className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
