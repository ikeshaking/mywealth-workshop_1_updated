import Link from "next/link";
import { Wordmark, BoAvatar } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const useCases = [
  "I need to sort my car rego soon.",
  "Remind me to pay this bill.",
  "Find me an outdoor dining set under $2,000.",
  "I need to book the kids into the dentist.",
  "My internet bill seems expensive.",
  "Cancel the gym membership I never use.",
];

const features = [
  {
    emoji: "💬",
    title: "Capture anything, naturally",
    body: "Type, talk or forward. Bo understands messy thoughts — no forms, no lists.",
  },
  {
    emoji: "✅",
    title: "It gets things done",
    body: "Bo tracks, follows up and moves each thing towards completion.",
  },
  {
    emoji: "🧭",
    title: "Smarter decisions",
    body: "Bo researches complete options and recommends the best fit for you.",
  },
  {
    emoji: "💷",
    title: "Save time and money",
    body: "It finds better deals, cancels what you don't use and handles the admin.",
  },
];

const benefits = [
  { title: "Less to think about", body: "Bo remembers and keeps you on track." },
  { title: "Better decisions", body: "It helps you choose the best option." },
  { title: "Saves you time", body: "Life admin, handled so you don't have to." },
  { title: "Saves you money", body: "Finds better deals and avoids needless costs." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      {/* Nav */}
      <header className="container-wide flex h-16 items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="container-wide pt-8 pb-12 text-center sm:pt-16">
          <div className="mx-auto mb-6 flex justify-center">
            <BoAvatar size={72} />
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Your life, in one place.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">
            Nook is a calm, personal home for everyday life. Inside, Bo remembers what matters,
            keeps track of what&apos;s coming and quietly helps you get things done.
          </p>
          <p className="mt-4 text-base font-medium text-eucalypt-700">
            Tell Bo once. It handles the rest.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="min-w-48">
                Try Nook free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="min-w-48">
                See the demo
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            No setup required · Runs in a calm, private demo
          </p>
        </section>

        {/* Use cases */}
        <section className="container-wide pb-12">
          <p className="mb-4 text-center text-sm font-medium text-ink-soft">
            Just say what&apos;s on your mind:
          </p>
          <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
            {useCases.map((u) => (
              <Card key={u} className="flex items-center gap-3 py-3">
                <BoAvatar size={26} />
                <span className="text-sm text-ink">&ldquo;{u}&rdquo;</span>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-canvas-soft py-14">
          <div className="container-wide">
            <h2 className="text-center text-2xl font-semibold text-ink">
              Your calm, capable assistant
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-ink-soft">
              Life admin, decisions and everyday tasks — quietly handled.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title}>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-eucalypt-100 text-xl">
                    <span aria-hidden>{f.emoji}</span>
                  </div>
                  <h3 className="text-base font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{f.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="container-wide py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white p-5 shadow-soft">
                <h3 className="text-sm font-semibold text-eucalypt-700">{b.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-wide pb-20">
          <Card className="bg-eucalypt-600 p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Bo handles the life stuff.
            </h2>
            <p className="mt-2 text-eucalypt-100">You get your time back.</p>
            <div className="mt-6 flex justify-center">
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="min-w-52">
                  Get started
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-black/[0.05] py-8">
        <div className="container-wide flex flex-col items-center justify-between gap-3 text-sm text-ink-faint sm:flex-row">
          <Wordmark />
          <p>Finally, an assistant that actually takes care of life admin.</p>
        </div>
      </footer>
    </div>
  );
}
