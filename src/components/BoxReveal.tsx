"use client";
import { useState } from "react";
import axios from "axios";
import { Download, Share2 } from "lucide-react";
import crypto from "crypto";  // Built-in Node crypto for signing (works client-side via Next.js)

const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_KEY;
const ACCESS_KEY = process.env.NEXT_PUBLIC_AMAZON_ACCESS_KEY;
const SECRET_KEY = process.env.NEXT_PUBLIC_AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || "freeamazonmysterybox-20";

export function BoxReveal() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [boxId] = useState(Math.random().toString(36).substr(2, 9));

  // Helper: Sign PA API request (AWS SigV4)
  const signRequest = (method: string, endpoint: string, params: Record<string, string>, service = 'execute-api', region = 'us-east-1') => {
    const canonicalQuery = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const datestamp = timestamp.slice(0, 8);

    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
    const canonicalHeaders = `host:${endpoint}\nx-amz-date:${timestamp}\n`;
    const signedHeaders = 'host;x-amz-date';
    const canonicalRequest = `${method}\n/${params.Operation}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    let signatureKey = `AWS4${SECRET_KEY}`;
    signatureKey = crypto.createHmac('sha256', signatureKey).update(datestamp).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update(region).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update(service).digest();
    signatureKey = crypto.createHmac('sha256', signatureKey).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', signatureKey).update(stringToSign).digest('hex');

    return {
      url: `https://${endpoint}?${canonicalQuery}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${ACCESS_KEY}%2F${credentialScope}&X-Amz-Date=${timestamp}&X-Amz-SignedHeaders=${signedHeaders}&X-Amz-Signature=${signature}`,
      headers: { 'x-api-key': ACCESS_KEY }
    };
  };

  const openBox = async () => {
    setLoading(true);
    try {
      // Fetch real trending products via PA API ItemSearch (Best Sellers simulation)
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
          Keywords: 'bestseller',  // Simulates Best Sellers
          ResponseGroup: 'Medium,Images,Offers,ItemAttributes,Reviews',
          ItemPage: (Math.floor(Math.random() * 3) + 1).toString(),
          ItemCount: '5'  // 5 per cat = 20 total
        };

        const signed = signRequest('GET', 'webservices.amazon.com', params);
        const res = await axios.get(signed.url, { headers: signed.headers });
        if (res.data.ItemSearchResponse?.Items?.Item) {
          searchResults.push(...res.data.ItemSearchResponse.Items.Item);
        }
      }

      // Shuffle
      const shuffledItems = searchResults.sort(() => 0.5 - Math.random()).slice(0, 20);

      // Optional Groq for why_viral
      let whyVirals = Array(20).fill("Trending now!");
      if (GROQ_KEY) {
        try {
          const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: `Short viral reasons (12 words max) for these titles: ${shuffledItems.map(i => i.ItemAttributes?.Title).join('; ')}. JSON array only.` }],
              temperature: 0.8,
            },
            { headers: { Authorization: `Bearer ${GROQ_KEY}` } }
          );
          whyVirals = JSON.parse(res.data.choices[0].message.content.trim());
        } catch (e) { console.log("Groq skipped"); }
      }

      // Format real data
      const formattedProducts = shuffledItems.map((item: any, i: number) => ({
        title: item.ItemAttributes?.Title || "Unknown Item",
        price: parseFloat(item.Offers?.Offer?.[0]?.Price?.FormattedPrice?.replace('$', '') || "0"),
        category: item.ItemAttributes?.ProductGroup || "Uncategorized",
        asin: item.ASIN,
        image: item.MediumImage?.URL || "/placeholder.jpg",
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
      alert("API error—check Amazon env vars! Refresh and try.");
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
            <img src={p.image} alt={p.title} className="w-full h-48 object-cover" onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }} />
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