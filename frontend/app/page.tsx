import { Appbar } from "@/components/Appbar";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <main className="bg-black min-h-screen text-white">
      <Appbar />
      <Hero />
    </main>
  );
}
