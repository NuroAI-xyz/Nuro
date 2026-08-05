import { ApiGlyph, BrowserGlyph, TerminalGlyph } from "../brand/glyphs";
import { Reveal } from "../util/reveal";

const products = [
  {
    tag: "Recommended",
    accent: true,
    title: "Native Worker",
    line: "Background GPU via Ollama or vLLM. The biggest models, the highest pay.",
    rate: "Top rate / token",
    cta: "Get install command",
    href: "/earn",
    command: "npx @nuro/worker --token YOUR_TOKEN",
    Glyph: TerminalGlyph,
  },
  {
    tag: "Zero install",
    accent: false,
    title: "Browser Worker",
    line: "In-tab inference via WebGPU. One click, no terminal.",
    rate: "Entry rate / token",
    cta: "Open browser worker",
    href: "/earn",
    command: null,
    Glyph: BrowserGlyph,
  },
  {
    tag: "User side",
    accent: false,
    title: "OpenAI-compatible API",
    line: "Drop-in chat completions. No logging, pay per token.",
    rate: "Per token",
    cta: "Try the playground",
    href: "/playground",
    command: "curl https://api.nuroai.xyz/v1/chat/completions",
    Glyph: ApiGlyph,
  },
];

export function ProductsSection() {
  return (
    <section id="products" className="relative border-t border-white/[0.06]">
      <div className="page-shell relative section-gap">
        <Reveal>
          <div className="max-w-2xl">
            <p className="section-index">03 / Product</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-tight tracking-[-0.02em]">
              Three ways into the network
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {products.map((product, i) => (
            <Reveal
              key={product.title}
              delay={i * 60}
              variant="scale"
              className="h-full min-w-0"
            >
              <article className="card glass-panel flex h-full min-w-0 flex-col rounded-3xl p-8">
                <div className="flex items-start justify-between">
                  <product.Glyph className="h-12 w-12" />
                  <span
                    className={
                      product.accent
                        ? "glass-tag"
                        : "glass-tag glass-tag-neutral"
                    }
                  >
                    {product.tag}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-semibold tracking-[-0.02em]">
                  {product.title}
                </h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#8a8a8a]">
                  {product.line}
                </p>

                <p className="mt-6 text-sm font-medium text-[#D4F3FF]">
                  {product.rate}
                </p>

                {product.command ? (
                  <pre className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-all text-[#a3a3a3]">
                    <code>{product.command}</code>
                  </pre>
                ) : null}

                {product.href ? (
                  <a
                    href={product.href}
                    className="btn-secondary mt-6 w-full py-3 text-center text-sm"
                  >
                    {product.cta}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary mt-6 w-full py-3 text-sm"
                  >
                    {product.cta}
                  </button>
                )}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
