"use client";
import { useEffect, useState } from "react";

export function HistorySaver() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem("mysteryBoxes") || "[]"));
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="mt-20 text-center bg-white/5 rounded-3xl p-10 max-w-4xl mx-auto">
      <h3 className="text-4xl font-bold mb-8">Your Past Boxes ({history.length})</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {history.slice(0, 12).map((box: any) => (
          <div key={box.id} className="bg-white/10 p-6 rounded-xl backdrop-blur">
            {new Date(box.date).toLocaleDateString()}
            <br />
            <span className="text-sm opacity-80">{box.products.length} items</span>
          </div>
        ))}
      </div>
    </div>
  );
}
