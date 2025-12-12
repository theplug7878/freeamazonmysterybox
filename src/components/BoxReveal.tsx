"use client";
import { useState } from "react";
import axios from "axios";
import { Download, Share2 } from "lucide-react";
const crypto = require('crypto-browserify'); // Polyfill for client-side signing

const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_KEY;
const ACCESS_KEY = process.env.NEXT_PUBLIC_AMAZON_ACCESS_KEY;
const SECRET_KEY = process.env.NEXT_PUBLIC_AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || "freeamazonmysterybox-20";

export function BoxReveal() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [boxId] = useState(Math.random().toString(36).substr(2, 9));

  // AWS SigV4 signer for PA API (works client-side)
  const signRequest = (method: string, endpoint: string, params: Record<string, string>, service = 'AWSECommerceService', region = 'us-east-1') => {
    const sortedParams = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const datestamp = timestamp.slice(0, 8);

    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
    const canonicalHeaders = `host:${endpoint}\nx-amz-date:${timestamp}\n`;
    const signedHeaders = 'host;x-amz-date';
    const canonicalRequest = `${method}\n${params.Operation ? `/${params.Operation}` : '/'}\n${sortedParams}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    let signatureKey = `AWS4${SECRET_KEY}`;
    signatureKey = crypto.createHmac('sha256', signatureKey).update(datestamp).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update(region).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update(service).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', signatureKey).update(stringToSign).digest('hex');

    const fullQuery = `${sortedParams}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(ACCESS_KEY)}%2F${credentialScope}&X-Amz-Date=${timestamp}&X-Amz-SignedHeaders=${signedHeaders}&X-Amz-Signature=${signature}`;
    return `https://${endpoint}/onca/xml?${fullQuery}`;
  };

  const openBox = async () => {
    setLoading(true);
    try {
      const categories = ["Electronics", "Beauty", "HomeAndKitchen", "ToysAndGames", "Sports"];
      const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 4);
      const searchResults: any[] = [];

      for (const category of randomCategories) {
        const params = {
          Service: 'AWSECommerceService',
          Operation: 'ItemSearch',
          AWSAccessKeyId: ACCESS_KEY,
          AssociateTag: PARTNER_TAG,
          SearchIndex: category,
          Keywords: 'bestseller', // Targets trending
          ResponseGroup: 'Medium,Images,Offers,ItemAttributes,Reviews',
          ItemPage: (Math.floor(Math.random() * 3) + 1).toString(),
          ItemCount: '5'
        };

        const url = signRequest('GET', 'webservices.amazon.com', params);
        const res = await axios.get(url);
        const items = res.data.ItemSearchResponse?.Items?.Item || [];
        searchResults.push(...items);
      }

      const shuffledItems = searchResults.sort(() => 0.5 - Math.random()).slice(0, 20);

      // Optional Groq for blurbs
      let whyVirals = Array(20).fill("Trending now!");
      if (GROQ_KEY) {
        try {
          const titles = shuffledItems.map(i => i.ItemAttributes?.Title).join('; ');
          const groqRes = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: `Short viral reasons (12 words max) for these Amazon titles: ${titles}. JSON array only.` }],
              temperature: 0.8,
            },
            { headers: { Authorization: `Bearer ${GROQ_KEY}` } }
          );
          whyVirals = JSON.parse(groqRes.data.choices[0].message.content.trim());
        } catch (e) { console.log("Groq skipped"); }
      }

      const formattedProducts = shuffledItems.map((item: any, i: number) => ({
        title: item.ItemAttributes?.Title || "Unknown Item",
        price: parseFloat(item.Offers?.Offer?.[0]?.Price?.FormattedPrice?.replace(/[^0-9.]/g, '') || "0"),
        category: item.ItemAttributes?.ProductGroup || "Uncategorized",
        asin: item.ASIN,
        image: item.MediumImage?.URL || "https://via.placeholder.com/300x300?text=Amazon+Product",
        rating: item.CustomerReviews?.AverageRating || "N/A",
        why_viral: whyVirals[i] || "Hot pick!",
      }));

      setProducts(formattedProducts);

      // Save history
      const history = JSON.parse(localStorage.getItem("mysteryBoxes") || "[]");
      history.unshift({ id: boxId, date: new Date().toISOString(), products: formattedProducts });
      localStorage.setItem("mysteryBoxes", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.error(e);
      alert("Fetch error—check Amazon env vars in Vercel. Using demo data.");
      // Fallback demo data for testing
      setProducts(Array.from({ length: 20 }, (_, i) => ({
        title: `Demo Product ${i + 1}`,
        price: (Math.random() * 100 + 10).toFixed(2),
        category: "Demo",
        asin: `B00${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        image: "https://via.placeholder.com/300x300?text=Demo",
        rating: "4.5",
        why_viral: "Viral on TikTok!"
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
            <img src={p.image} alt={p.title} className="w-full h-48 object-cover" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x300?text=No+Image"; }} />
            <div className="p-4">
              <h3 className="font-bold text-sm line-clamp-2">{p.title}</h3>
              <p className="text-2xl font-bold text-green-600">${p.price}</p>
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