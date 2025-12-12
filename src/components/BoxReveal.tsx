"use client";
import { useState } from "react";
import axios from "axios";
import { Download, Share2 } from "lucide-react";
import { default as PAAPI } from "amazon-paapi"; // New import for real Amazon data

const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_KEY;
const ACCESS_KEY = process.env.NEXT_PUBLIC_AMAZON_ACCESS_KEY; // Add these to Vercel
const SECRET_KEY = process.env.NEXT_PUBLIC_AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.NEXT_PUBLIC_AMAZON_PARTNER_TAG || "freeamazonmysterybox-20"; // Your tag here as fallback

export function BoxReveal() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [boxId] = useState(Math.random().toString(36).substr(2, 9));

  const openBox = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch real trending ASINs via PA API (mix categories for mystery)
      const paapi = new PAAPI({
        accessKey: ACCESS_KEY,
        secretKey: SECRET_KEY,
        partnerTag: PARTNER_TAG,
        locale: "www.amazon.com",
      });

      // Get top 20 from Best Sellers (randomize categories: electronics, beauty, home, toys, etc.)
      const categories = [
        "Electronics", "Beauty", "HomeAndKitchen", "ToysAndGames", "SportsAndOutdoors",
        "Books", "Clothing", "HealthAndPersonalCare", "Grocery", "OfficeProducts"
      ];
      const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 4); // Pick 4 random cats for diversity

      const searchResults: any[] = [];
      for (const category of randomCategories) {
        const result = await paapi.callAPI({
          Keywords: "",
          SearchIndex: category,
          Resources: ["ItemInfo.Title", "Images.Primary.Medium", "Offers.Listings.Price", "ItemInfo.Classifications", "CustomerReviews.StarRating"],
          ItemCount: 5, // 5 per category = 20 total
          ItemPage: Math.floor(Math.random() * 3) + 1, // Random page for "mystery"
        });
        searchResults.push(...(result.SearchResults?.Items || []));
      }

      // Shuffle for true randomness
      const shuffledItems = searchResults.sort(() => 0.5 - Math.random()).slice(0, 20);

      // Step 2: Optional Groq for fun "why_viral" blurbs (if key exists)
      let whyVirals = Array(20).fill("Trending now!");
      if (GROQ_KEY) {
        try {
          const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              model: "llama-3.1-8b-instant",
              messages: [{
                role: "user",
                content: `For these 20 Amazon product titles, give short (max 12 words) "why viral" reasons. Output ONLY JSON array of strings: ${shuffledItems.map(i => i.ItemInfo.Title.DisplayValue).join('; ')}. Format as valid JSON only.`
              }],
              temperature: 0.8,
            },
            { headers: { Authorization: `Bearer ${GROQ_KEY}` } }
          );
          whyVirals = JSON.parse(res.data.choices[0].message.content.trim());
        } catch (e) {
          console.log("Groq optional—skipping viral blurbs");
        }
      }

      // Step 3: Format products with real data
      const formattedProducts = shuffledItems.map((item: any, i: number) => ({
        title: item.ItemInfo.Title.DisplayValue,
        price: parseFloat(item.Offers?.Listings[0]?.Price?.Amount || "0"),
        category: item.ItemInfo.Classifications?.Binding || "Uncategorized",
        asin: item.ASIN,
        image: item.Images?.Primary?.Medium?.URL || "/placeholder.jpg", // Real image!
        rating: item.CustomerReviews?.StarRating?.Value || 0,
        why_viral: whyVirals[i] || "Hot pick this week!",
      }));

      setProducts(formattedProducts);

      // Save to history (same as before)
      const history = JSON.parse(localStorage.getItem("mysteryBoxes") || "[]");
      history.unshift({ id: boxId, date: new Date().toISOString(), products: formattedProducts });
      localStorage.setItem("mysteryBoxes", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.error(e);
      alert("API fetch error—check env vars in Vercel! (Or refresh and try again.)");
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

  const affiliateLink = (asin: string) =>
    `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`;

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
            <img src={p.image} alt={p.title} className="w-full h-48 object-cover" />
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

      <p className="mt-10 text-xl">
        Share: freeamazonmysterybox.com/box/{boxId}
      </p>
    </div>
  );
}