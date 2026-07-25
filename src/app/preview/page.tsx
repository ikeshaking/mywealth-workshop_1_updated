import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

/**
 * A simple index of every major screen, handy for demos, screenshots and QA.
 */
const screens = [
  { href: "/", label: "Landing page", note: "Marketing + call to action" },
  { href: "/login", label: "Login", note: "Demo auth" },
  { href: "/signup", label: "Sign up", note: "Create account" },
  { href: "/forgot-password", label: "Forgot password", note: "Reset flow" },
  { href: "/onboarding", label: "Onboarding", note: "Essential questions only" },
  { href: "/dashboard", label: "Home dashboard", note: "Calm briefing + capture" },
  { href: "/capture", label: "Conversational capture", note: "Chat with Mabel" },
  { href: "/items/item_rego", label: "Item detail", note: "Car registration example" },
  { href: "/decisions", label: "Decisions & shopping", note: "Research requests" },
  { href: "/decisions/dr_dining", label: "Recommendations", note: "Outdoor dining bundles" },
  { href: "/approvals", label: "Approvals", note: "Approve / edit / snooze / reject" },
  { href: "/completed", label: "Completed", note: "Outcomes + savings" },
  { href: "/settings", label: "Settings", note: "Permissions & privacy" },
];

export default function PreviewPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="container-app flex h-16 items-center">
        <Wordmark />
      </header>
      <main id="main" className="container-app pb-16">
        <h1 className="mb-1 text-2xl font-semibold text-ink">Screen preview</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Jump to any major screen. In-app screens require a demo session — use{" "}
          <Link href="/login" className="text-lavender-700">
            Explore the demo
          </Link>{" "}
          first.
        </p>
        <ul className="space-y-2">
          {screens.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex items-center justify-between rounded-2xl border border-black/[0.05] bg-white p-4 shadow-soft hover:shadow-lift"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{s.label}</span>
                  <span className="block text-xs text-ink-faint">{s.note}</span>
                </span>
                <span className="text-xs text-lavender-700">{s.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
