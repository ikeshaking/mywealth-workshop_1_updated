"use client";

import { MabelProvider } from "@/lib/store/MabelProvider";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <MabelProvider>{children}</MabelProvider>;
}
