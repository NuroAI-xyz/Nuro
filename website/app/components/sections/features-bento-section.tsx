import {
  BrowserIllustration,
  ContributedComputeIllustration,
  EarnIllustration,
  PrivateIllustration,
} from "../brand/bento-illustrations";

const features = [
  {
    title: "Contributed compute",
    description:
      "No datacenters. No rented GPUs. People around the world share hardware to power inference for everyone.",
    illustration: ContributedComputeIllustration,
    span: "lg:col-span-7",
    tall: true,
  },
  {
    title: "Private by design",
    description:
      "Prompts and outputs are never stored. Workers process jobs ephemerally - only token counts are kept to bill the request.",
    illustration: PrivateIllustration,
    span: "lg:col-span-5",
    tall: false,
  },
  {
    title: "Zero install",
    description:
      "Open a tab, connect your GPU via WebGPU, and start earning. No terminal, no downloads.",
    illustration: BrowserIllustration,
    span: "lg:col-span-5",
    tall: false,
  },
  {
    title: "Earn on your GPU",
    description:
      "Native workers earn the most - background inference via Ollama or vLLM, paid in USDC for every job your hardware completes.",
    illustration: EarnIllustration,
    span: "lg:col-span-7",
    tall: true,
  },
];

export function FeaturesBentoSection() {
  return (
    <section className="border-t border-white/[0.06]">
      <div className="page-shell pb-12 pt-4 md:pb-16 md:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12 lg:gap-6">
          {features.map((feature) => {
            const Illustration = feature.illustration;
            return (
              <article
                key={feature.title}
                className={`glass-panel group flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-7 md:p-9 ${feature.span} ${
                  feature.tall ? "min-h-[340px] md:min-h-[380px]" : "min-h-[280px] md:min-h-[300px]"
                }`}
              >
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold tracking-[-0.02em] md:text-2xl">
                    {feature.title}
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-[#8a8a8a] md:text-[15px]">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-10 border-t border-white/[0.06] pt-8 opacity-80 transition-opacity duration-500 group-hover:opacity-100">
                  <Illustration />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
