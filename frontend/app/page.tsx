import { Appbar } from "@/components/Appbar";
import { Hero } from "@/components/Hero";
import { IntegrationsReel } from "@/components/IntegrationsReel";
import { BentoGrid } from "@/components/BentoGrid"; 

export default function Home() {
  return (
    <main className="bg-[#0B0B0F] min-h-screen">
      <Appbar />
      <Hero />
      <IntegrationsReel />
      <BentoGrid />
    </main>
  );
}
