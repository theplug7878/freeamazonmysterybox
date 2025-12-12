import { BoxReveal } from "@/components/BoxReveal";
import { HistorySaver } from "@/components/HistorySaver";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-6xl font-bold mb-4">Free Amazon Mystery Box</h1>
        <p className="text-2xl mb-10">Open instantly • Keep whatever you want • 100% FREE</p>
        <BoxReveal />
      </div>
      <HistorySaver />
    </main>
  );
}
