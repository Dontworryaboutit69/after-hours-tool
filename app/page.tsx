import CheckerClient from "./CheckerClient";

export default function Home() {
  return (
    <>
      <CheckerClient />

      {/* SEO content — below the fold, visible to search engines */}
      <section className="bg-lighter border-t border-border py-12 lg:py-16">
        <div className="mx-auto max-w-3xl lg:max-w-5xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-h3-sm md:text-h3 font-semibold text-text-dark mb-4 has-em">
              Why Every Local Business Needs a <em>Phone Coverage Check</em>
            </h2>
            <div className="space-y-3 text-text/75 text-base lg:text-lg leading-relaxed">
              <p>
                If you run a service business — plumbing, roofing, dental, legal,
                landscaping, HVAC, or anything that relies on phone leads — your
                phone is your storefront. Every unanswered call is a customer who
                called your competitor instead.
              </p>
              <p>
                The problem? Most business owners have no idea how many calls
                they&apos;re actually missing. You can&apos;t fix what you
                can&apos;t measure.
              </p>
              <p>
                Our free Phone Coverage Check calls your business 5 times over 24
                hours — during business hours, after hours, and early morning —
                then sends you a detailed report showing:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Your coverage grade (A through F)</strong> — how many of
                  our test calls you answered vs. sent to voicemail
                </li>
                <li>
                  <strong>Revenue impact estimate</strong> — how much money
                  you&apos;re likely leaving on the table based on your call
                  volume and average customer value
                </li>
                <li>
                  <strong>Google review analysis</strong> — whether your customers
                  are already complaining about your phone service in their
                  reviews
                </li>
                <li>
                  <strong>Pattern detection</strong> — when your coverage drops
                  (after hours, weekends, lunch rush) so you know exactly where
                  the gaps are
                </li>
              </ul>
              <p>
                The average service business misses 62% of incoming calls. 85% of
                those callers never call back — they call someone else. At $500
                per average job, a business missing just 10 calls a month is
                leaving $4,250 on the table. Every month.
              </p>
              <p>
                This tool is 100% free. No credit card required. We just need
                your Google Business Profile (so we know your phone number and
                hours) and your email (so we can send you the report).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — SEO + trust */}
      <section className="bg-body py-12 lg:py-16">
        <div className="mx-auto max-w-3xl lg:max-w-5xl px-4 sm:px-6">
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
                className="p-5 lg:p-6 rounded-2xl border border-zinc/90 bg-lighter corner-squircle text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-dark text-text-light font-semibold text-sm mb-4 icon-shadow">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-text-dark mb-2">
                  {item.title}
                </h3>
                <p className="text-text/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-text-light py-8">
        <div className="mx-auto xl:max-w-[1320px] px-4 text-center">
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
