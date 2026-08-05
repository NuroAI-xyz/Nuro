import { HeroVisual } from "../brand/hero-visual";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[74vh] items-center overflow-hidden">
      <HeroVisual />
      <div className="page-shell relative z-10 py-14 md:py-20">
        <div className="max-w-3xl">
          <p
            className="load-rise label-caps"
            style={{ animationDelay: "0.05s" }}
          >
            Private inference network
          </p>
          <h1
            className="load-rise mt-6 text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.035em]"
            style={{ animationDelay: "0.12s" }}
          >
            Private inference,
            <br />
            <span className="text-gradient">actually proven.</span>
          </h1>
          <p
            className="load-rise mt-7 max-w-lg text-lg leading-relaxed text-[#a3a3a3] md:text-xl"
            style={{ animationDelay: "0.2s" }}
          >
            Uncensored and decentralized - and the first network built to prove
            your prompts stay private.
          </p>
          <div
            className="load-rise mt-10 flex flex-wrap gap-4"
            style={{ animationDelay: "0.28s" }}
          >
            <a href="#problem" className="btn-primary">
              See the problem
            </a>
            <a href="#products" className="btn-secondary">
              Use the network
            </a>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        className="load-fade absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 md:block"
        style={{ animationDelay: "0.5s" }}
      >
        <span className="label-caps animate-float">scroll</span>
      </div>
    </section>
  );
}
