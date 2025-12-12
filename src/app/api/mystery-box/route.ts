import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

const ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || 'freeamazonmysterybox-20';

function signRequest(method: string, params: Record<string, string>) {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k] || '')}`).join('&');
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const datestamp = timestamp.slice(0, 8);
  const region = 'us-east-1';
  const service = 'AWSECommerceService';

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const canonicalHeaders = `host:webservices.amazon.com\nx-amz-date:${timestamp}\n`;
  const signedHeaders = 'host;x-amz-date';
  const payloadHash = crypto.createHash('sha256').update('').digest('hex');
  const canonicalRequest = `${method}\n/onca/xml\n${sortedParams}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

  let signatureKey = `AWS4${SECRET_KEY}`;
  signatureKey = crypto.createHmac('sha256', signatureKey).update(datestamp).digest();
  signatureKey = crypto.createHmac('sha256', signatureKey).update(region).digest();
  signatureKey = crypto.createHmac('sha256', signatureKey).update(service).digest();
  signatureKey = crypto.createHmac('sha256', signatureKey).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', signatureKey).update(stringToSign).digest('hex');

  const fullQuery = `${sortedParams}&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(ACCESS_KEY)}%2F${credentialScope}&X-Amz-Date=${timestamp}&X-Amz-SignedHeaders=${signedHeaders}&X-Amz-Signature=${signature}`;
  return `https://webservices.amazon.com/onca/xml?${fullQuery}`;
}

export async function GET() {
  if (!ACCESS_KEY || !SECRET_KEY) {
    return NextResponse.json({ error: 'Missing Amazon credentials' }, { status: 500 });
  }

  try {
    const categories = ['Electronics', 'Beauty', 'HomeAndKitchen', 'ToysAndGames', 'Sports'];
    const randomCategories = categories.sort(() => 0.5 - Math.random()).slice(0, 4);
    const allItems: any[] = [];

    for (const category of randomCategories) {
      const params = {
        Service: 'AWSECommerceService',
        Operation: 'ItemSearch',
        AWSAccessKeyId: ACCESS_KEY,
        AssociateTag: PARTNER_TAG,
        SearchIndex: category,
        Keywords: 'bestseller',
        ResponseGroup: 'Medium,Images,Offers,ItemAttributes,Reviews',
        ItemPage: (Math.floor(Math.random() * 3) + 1).toString(),
        ItemCount: '5',
      };

      const url = signRequest('GET', params);
      const res = await axios.get(url);
      const items = res.data.ItemSearchResponse?.Items?.Item || [];
      allItems.push(...items);
    }

    const shuffledItems = allItems.sort(() => 0.5 - Math.random()).slice(0, 20);
    const products = shuffledItems.map((item: any) => ({
      title: item.ItemAttributes?.Title || 'Unknown Item',
      price: parseFloat(item.Offers?.Offer?.[0]?.Price?.FormattedPrice?.replace(/[^0-9.]/g, '') || '0'),
      category: item.ItemAttributes?.ProductGroup || 'Uncategorized',
      asin: item.ASIN,
      image: item.MediumImage?.URL || 'https://via.placeholder.com/300x300?text=No+Image',
      rating: item.CustomerReviews?.AverageRating || 'N/A',
      why_viral: 'Trending bestseller!',
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'PA API fetch failed' }, { status: 500 });
  }
}