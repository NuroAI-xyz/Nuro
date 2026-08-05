import type { Route } from "./+types/home";
import { SiteFooter, SiteHeader } from "../components/layout/site-chrome";
import { HeroSection } from "../components/sections/hero-section";
import { PrivateInferenceSection } from "../components/sections/private-inference-section";
import { ProductsSection } from "../components/sections/products-section";
import { NuroTokenSection } from "../components/sections/nuro-token-section";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nuro AI - Private Inference, Actually Proven" },
    {
      name: "description",
      content:
        "Sharded inference solved size, not privacy. Nuro quantifies prompt recoverability and closes the gap - decentralized, uncensored, on contributed GPUs.",
    },
    { property: "og:url", content: "https://nuroai.xyz" },
    { property: "og:title", content: "Nuro AI" },
    {
      property: "og:description",
      content:
        "Private inference, actually proven - on GPUs people contribute, not rent.",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      <SiteHeader />
      <main>
        <HeroSection />
        <PrivateInferenceSection />
        <ProductsSection />
        <NuroTokenSection />
      </main>
      <SiteFooter />
    </div>
  );
}
