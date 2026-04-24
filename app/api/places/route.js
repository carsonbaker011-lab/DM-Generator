import { auth } from '@clerk/nextjs/server';

export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Please sign in.' }, { status: 401 });

  const { city, type } = await req.json();
  if (!city || !type) return Response.json({ error: 'City and business type required.' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return Response.json({ error: 'Google Places not configured.' }, { status: 500 });

  try {
    // Search for places
    const query = encodeURIComponent(`${type} in ${city}`);
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    if (!searchRes.ok || searchData.status === 'REQUEST_DENIED') {
      return Response.json({ error: 'Google Places API error: ' + searchData.error_message }, { status: 500 });
    }

    const places = searchData.results || [];

    // Filter: rating 4+ and no website, then get details for each
    const filtered = places.filter(p => (p.rating || 0) >= 4);

    // Get details for top 20 to check website field
    const detailed = await Promise.all(
      filtered.slice(0, 20).map(async (place) => {
        try {
          const detailRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,url,types&key=${apiKey}`
          );
          const detailData = await detailRes.json();
          const d = detailData.result || {};
          return {
            place_id: place.place_id,
            name: d.name || place.name,
            rating: d.rating || place.rating,
            reviews: d.user_ratings_total || place.user_ratings_total,
            address: d.formatted_address || place.formatted_address,
            phone: d.formatted_phone_number || null,
            website: d.website || null,
            maps_url: d.url || null,
            types: d.types || [],
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out nulls and businesses WITH a website
    const noWebsite = detailed
      .filter(Boolean)
      .filter(b => !b.website)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return Response.json({ results: noWebsite });
  } catch (err) {
    console.error('Places error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
