"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";

export function BoxReveal() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [boxId] = useState(Math.random().toString(36).substr(2, 9));

  const openBox = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mystery-box');
      if (!res.ok) throw new Error('API error');
      const { products: fetchedProducts } = await res.json();

      // Optional Groq for why_viral (if env set)
      const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_KEY;
      if (GROQ_KEY) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: `Short viral reasons (12 words max) for these Amazon titles: ${fetchedProducts.map(p => p.title).join('; ')}. JSON array only.` }],
              temperature: 0.8,
            }),
          });
          const groqData = await groqRes.json();
          const whyVirals = JSON.parse(groqData.choices[0].message.content.trim());
          fetchedProducts.forEach((p: any, i: number) => p.why_viral = whyVirals[i] || 'Hot pick!');
        } catch (e) { console.log('Groq skipped'); }
      }

      setProducts(fetchedProducts);

      // Save history
      const history = JSON.parse(localStorage.getItem("mysteryBoxes") || "[]");
      history.unshift({ id: boxId, date: new Date().toISOString(), products: fetchedProducts });
      localStorage.setItem("mysteryBoxes", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.error(e);
      alert('Error loading box—check console. Using demo.');
      // Demo fallback
      setProducts(Array.from({ length: 20 }, (_, i) => ({
        title: `Demo Product ${i + 1}`,
        price: Math.random() * 100 + 10,
        category: 'Demo',
        asin: `B00${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        image: 'https://via.placeholder.com/300x300?text=Demo',
        rating: 4.5,
        why_viral: 'Viral on TikTok!',
      })));
    }
    setLoading(false);
  };

  if (products.length === 0) {
    return (
      <button
        onClick={openBox}
        disabled={loading}
        className="bg-gradient-to-r from-pink-500 to-yellow-500 text-4xl font-bold py-16 px-32 rounded-3xl shadow-2xl hover:scale-105 transition"
      >
        {loading ? "Opening Your Mystery Box…" : "OPEN MY FREE MYSTERY BOX"}
      </button>
    );
  }

  const PARTNER_TAG = 'freeamazonmysterybox-20'; // Replace with your tag (client-safe)
  const affiliateLink = (asin: string) => `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`;

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-5xl font-bold mb-8">Your Mystery Box Is Open!</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
        {products.map((p, i) => (
          <a
            key={i}
            href={affiliateLink(p.asin)}
            target="_blank"
            rel="nofollow"
            className="bg-white text-black rounded-2xl overflow-hidden shadow-xl hover:scale-105 transition"
          >
            <img src={p.image} alt={p.title} className="w-full h-48 object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image'; }} />
            <div className="p-4">
              <h3 className="font-bold text-sm line-clamp-2">{p.title}</h3>
              <p className="text-2xl font-bold text-green-600">${p.price.toFixed(2)}</p>
              <p className="text-yellow-500 text-sm">★ {p.rating}</p>
              <p className="text-xs text-gray-600 mt-1">{p.why_viral}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="flex gap-6 justify-center flex-wrap">
        <button className="bg-blue-600 px-8 py-4 rounded-full flex items-center gap-3 text-xl">
          <Download /> Download TikTok Video (soon)
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(`https://freeamazonmysterybox.com/box/${boxId}`)}
          className="bg-green-600 px-8 py-4 rounded-full flex items-center gap-3 text-xl"
        >
          <Share2 /> Copy Share Link
        </button>
        <button onClick={() => setProducts([])} className="bg-purple-600 px-8 py-4 rounded-full text-xl">
          Open Another Free Box
        </button>
      </div>

      <p className="mt-10 text-xl">Share: freeamazonmysterybox.com/box/{boxId}</p>
    </div>
  );
}