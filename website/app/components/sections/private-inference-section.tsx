import { SwarmPipelineIllustration } from "../brand/swarm-pipeline";
import { LiquidPanel } from "../brand/liquid-glass";
import { MeshGlyph, UnlockGlyph } from "../brand/glyphs";
import { Reveal } from "../util/reveal";

const provenPillars = [
  {
    title: "Decentralized",
    line: "Anyone's GPU, pooled into swarms. No datacenter.",
    Glyph: MeshGlyph,
  },
  {
    title: "Uncensored",
    line: "Any model. No content-policy layer in the way.",
    Glyph: UnlockGlyph,
  },
];

export function PrivateInferenceSection() {
  return (
    <section id="private" className="relative border-t border-white/[0.06]">
      <div className="page-shell relative pb-16 pt-10 md:pb-24 md:pt-14">
        {/* 01 - The problem */}
        <Reveal>
          <div id="problem" className="max-w-3xl scroll-mt-24">
            <p className="section-index">01 / The problem</p>
            <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
              Sharding solved size.{" "}
              <span className="text-[#6f6f6f]">Not privacy.</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#8a8a8a]">
              Split a model across strangers&apos; GPUs and every node still
              touches raw activations - enough to reconstruct pieces of a prompt.
            </p>
          </div>
        </Reveal>

        {/* 02 - How it leaks: the big liquid-glass explainer */}
        <Reveal delay={80} variant="scale">
          <LiquidPanel className="mt-16 md:mt-20">
            <div className="p-8 md:p-14">
              <div className="max-w-2xl">
                <p className="section-index">02 / How it leaks</p>
                <h3 className="mt-4 text-2xl font-semibold leading-snug tracking-[-0.02em] md:text-3xl">
                  A request crosses machines you don&apos;t control.
                </h3>
              </div>

              <div className="mt-10 md:mt-12">
                <SwarmPipelineIllustration />
              </div>

              <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-[#a3a3a3] md:text-base">
                Every node handles real activation tensors. Nuro exists to
                quantify that exposure - and close it.
              </p>
            </div>
          </LiquidPanel>
        </Reveal>

        {/* The unsolved one - Private */}
        <Reveal delay={60} variant="left">
          <article className="card glass-panel mt-6 rounded-[1.75rem] border-[rgba(126,214,255,0.18)] p-8 md:p-10">
            <p className="section-index text-[#7ED6FF]/70">The unsolved one</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[#D4F3FF] md:text-3xl">
              Private
            </h3>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#a3a3a3]">
              Everyone claims it. Nobody publishes the number: how much of a
              prompt is actually recoverable from what a node sees.
            </p>
          </article>
        </Reveal>

        {/* Proven pillars */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5">
          {provenPillars.map((pillar, i) => (
            <Reveal
              key={pillar.title}
              delay={i * 60}
              variant={i === 0 ? "left" : "right"}
            >
              <article className="card glass-panel h-full rounded-[1.75rem] p-8 md:p-9">
                <div className="flex items-center gap-4">
                  <pillar.Glyph className="h-11 w-11 shrink-0" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">
                    {pillar.title}
                  </h3>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-[#8a8a8a]">
                  {pillar.line}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Close */}
        <Reveal variant="fade">
          <p className="mt-14 max-w-2xl text-lg leading-relaxed text-[#a3a3a3] md:mt-16 md:text-xl">
            Privacy isn&apos;t a feature to bolt on later. It&apos;s the open
            problem - and the one{" "}
            <span className="text-white">Nuro exists to close.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
