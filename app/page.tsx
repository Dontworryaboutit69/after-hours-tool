import {
  Phone, PhoneOff, DollarSign, Star, TrendingDown, Clock, BarChart3, Shield,
} from "lucide-react";
import CheckerClient from "./CheckerClient";

export default function Home() {
  return (
    <>
      <CheckerClient />

      {/* The Problem — centered, visual, punchy */}
      <section className="bg-lighter border-t border-border py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-h3-sm md:text-h3 font-semibold text-text-dark mb-3 has-em">
            Why Every Local Business Needs a <em>Phone Coverage Check</em>
          </h2>
          <p className="text-text/55 text-base lg:text-lg max-w-xl mx-auto mb-10">
            If your business relies on phone leads, your phone is your
            storefront. Every unanswered call is a customer who called your
            competitor instead.
          </p>

          {/* Stats row */}
          <div className="grid gap-4 md:grid-cols-3 mb-10">
            <div className="rounded-2xl border border-zinc/90 bg-body corner-squircle p-5">
              <p className="text-3xl font-extrabold text-red-600 mb-1">62%</p>
              <p className="text-text/50 text-sm">of calls to small businesses go unanswered</p>
            </div>
            <div className="rounded-2xl border border-zinc/90 bg-body corner-squircle p-5">
              <p className="text-3xl font-extrabold text-red-600 mb-1">85%</p>
              <p className="text-text/50 text-sm">of voicemail callers never call back</p>
            </div>
            <div className="rounded-2xl border border-zinc/90 bg-body corner-squircle p-5">
              <p className="text-3xl font-extrabold text-text-dark mb-1">$126K</p>
              <p className="text-text/50 text-sm">average annual revenue lost to missed calls</p>
            </div>
          </div>

          <p className="text-text/60 text-base max-w-2xl mx-auto">
            The problem? Most business owners have no idea how many calls
            they&apos;re missing. You can&apos;t fix what you can&apos;t measure.
            That&apos;s where we come in.
          </p>
        </div>
      </section>

      {/* What you get — feature cards */}
      <section className="bg-body py-12 lg:py-16">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6">
          <h2 className="text-h3-sm md:text-h3 font-semibold text-text-dark mb-3 text-center has-em">
            What&apos;s in Your <em>Free Report</em>
          </h2>
          <p className="text-text/50 text-base text-center max-w-lg mx-auto mb-8">
            We call your business 5 times over 24 hours, then deliver a
            detailed breakdown.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: BarChart3,
                title: "Coverage Grade (A–F)",
                desc: "How many of our 5 test calls you answered vs. sent to voicemail — broken down by time of day.",
              },
              {
                icon: DollarSign,
                title: "Revenue Impact",
                desc: "How much you're likely leaving on the table based on your call volume and average customer value.",
              },
              {
                icon: Star,
                title: "Google Review Analysis",
                desc: "We scan your reviews for phone complaints — and show you exactly what customers are saying.",
              },
              {
                icon: Clock,
                title: "Pattern Detection",
                desc: "When your coverage drops — after hours, weekends, lunch rush — so you know where the gaps are.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-2xl border border-zinc/90 bg-lighter corner-squircle"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-dark flex items-center justify-center icon-shadow">
                  <item.icon className="w-5 h-5 text-text-light" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-dark mb-1">
                    {item.title}
                  </h3>
                  <p className="text-text/55 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-lighter border-t border-border py-12 lg:py-16">
        <div className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6">
          <h2 className="text-h3-sm md:text-h3 font-semibold text-text-dark mb-8 text-center has-em">
            How It <em>Works</em>
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Find Your Business",
                desc: "Search your Google Business Profile. We auto-fill your phone number, hours, and location.",
              },
              {
                step: "2",
                title: "We Call You 5 Times",
                desc: "Over 24 hours — before you open, during peak hours, and after you close.",
              },
              {
                step: "3",
                title: "Get Your Free Report",
                desc: "Coverage score, call timeline, revenue impact, and review analysis in your inbox.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 lg:p-6 rounded-2xl border border-zinc/90 bg-body corner-squircle text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-dark text-text-light font-semibold text-sm mb-4 icon-shadow">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-text-dark mb-2">
                  {item.title}
                </h3>
                <p className="text-text/55 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-text/40 text-sm text-center mt-8">
            100% free. No credit card. We just need your Google Business Profile
            and your email.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-text-light py-8">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-text-light/40 text-sm">
            A free tool by{" "}
            <a
              href="https://revsquared.ai"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              RevSquared AI
            </a>{" "}
            — AI phone agents for service businesses.
          </p>
        </div>
      </footer>
    </>
  );
}
