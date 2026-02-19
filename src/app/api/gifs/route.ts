import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

// Curated popular reaction GIFs (publicly accessible GIPHY media URLs)
// Used as fallback when no API key is configured
const FALLBACK_GIFS = [
  { id: 'thumbs-up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', preview: 'https://media.giphy.com/media/111ebonMs90YLu/200w.gif' },
  { id: 'clapping', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif', preview: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/200w.gif' },
  { id: 'thank-you', url: 'https://media.giphy.com/media/3oEjHWXddcCOGZNRe8/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHWXddcCOGZNRe8/200w.gif' },
  { id: 'excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif' },
  { id: 'celebration', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', preview: 'https://media.giphy.com/media/g9582DNuQppxC/200w.gif' },
  { id: 'laughing', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif', preview: 'https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif' },
  { id: 'mind-blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif', preview: 'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/200w.gif' },
  { id: 'hello', url: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif', preview: 'https://media.giphy.com/media/ASd0Ukj0y3qMM/200w.gif' },
  { id: 'cool', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', preview: 'https://media.giphy.com/media/62PP2yEIAZF6g/200w.gif' },
  { id: 'love', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5APm0/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5APm0/200w.gif' },
  { id: 'hug', url: 'https://media.giphy.com/media/XpgOZHuDfIkoM/giphy.gif', preview: 'https://media.giphy.com/media/XpgOZHuDfIkoM/200w.gif' },
  { id: 'thinking', url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif', preview: 'https://media.giphy.com/media/a5viI92PAF89q/200w.gif' },
  { id: 'ok', url: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif', preview: 'https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/200w.gif' },
  { id: 'deal', url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', preview: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/200w.gif' },
  { id: 'welcome', url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif', preview: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/200w.gif' },
  { id: 'bye', url: 'https://media.giphy.com/media/42D3CxaINsAFemFuId/giphy.gif', preview: 'https://media.giphy.com/media/42D3CxaINsAFemFuId/200w.gif' },
  { id: 'yes', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', preview: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif' },
  { id: 'no', url: 'https://media.giphy.com/media/1zSz5MVw4zKg0/giphy.gif', preview: 'https://media.giphy.com/media/1zSz5MVw4zKg0/200w.gif' },
  { id: 'shocked', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', preview: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/200w.gif' },
  { id: 'facepalm', url: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif', preview: 'https://media.giphy.com/media/XsUtdIeJ0MWMo/200w.gif' },
]

async function fetchTenorGifs(q: string, limit: string) {
  const apiKey = process.env.TENOR_API_KEY!
  const endpoint = !q
    ? `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}&media_filter=gif`
    : `https://tenor.googleapis.com/v2/search?key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=gif`

  const response = await fetch(endpoint)
  const data = await response.json()

  return (data.results || []).map((r: any) => ({
    id: r.id,
    url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url,
    width: r.media_formats?.gif?.dims?.[0],
    height: r.media_formats?.gif?.dims?.[1],
  }))
}

async function fetchGiphyGifs(q: string, limit: string) {
  const apiKey = process.env.GIPHY_API_KEY!
  const endpoint = !q
    ? `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`
    : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g`

  const response = await fetch(endpoint)
  const data = await response.json()

  return (data.data || []).map((r: any) => ({
    id: r.id,
    url: r.images?.original?.url || r.images?.fixed_height?.url,
    preview: r.images?.fixed_height_small?.url || r.images?.fixed_width_small?.url || r.images?.fixed_height?.url,
    width: parseInt(r.images?.original?.width || '0'),
    height: parseInt(r.images?.original?.height || '0'),
  }))
}

export const GET = withApiHandler(
  async (req, { requestId }) => {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = searchParams.get('limit') || '20'

    // Try Tenor first, then GIPHY, then fallback to built-in GIFs
    if (process.env.TENOR_API_KEY) {
      try {
        const gifs = await fetchTenorGifs(q, limit)
        return apiResponse({ gifs }, 200, requestId)
      } catch {
        // Fall through to next provider
      }
    }

    if (process.env.GIPHY_API_KEY) {
      try {
        const gifs = await fetchGiphyGifs(q, limit)
        return apiResponse({ gifs }, 200, requestId)
      } catch {
        // Fall through to fallback
      }
    }

    // No API key — return built-in curated GIFs
    // If searching, do a basic text filter on the ID/name
    let gifs = FALLBACK_GIFS
    if (q) {
      const query = q.toLowerCase()
      gifs = FALLBACK_GIFS.filter((g) => g.id.includes(query))
    }

    return apiResponse({ gifs }, 200, requestId)
  },
  { rateLimit: 'api' }
)
