"use client";

import { BoProvider } from "@/lib/store/BoProvider";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <BoProvider>{children}</BoProvider>;
}
