import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { requestId }) => {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = searchParams.get('limit') || '20'

    const apiKey = process.env.TENOR_API_KEY
    if (!apiKey) {
      return apiResponse({ gifs: [] }, 200, requestId)
    }

    const endpoint = !q
      ? `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}&media_filter=gif`
      : `https://tenor.googleapis.com/v2/search?key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=gif`

    const response = await fetch(endpoint)
    const data = await response.json()

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
      preview: r.media_formats?.tinygif?.url || r.media_formats?.nanogif?.url,
      width: r.media_formats?.gif?.dims?.[0],
      height: r.media_formats?.gif?.dims?.[1],
    }))

    return apiResponse({ gifs }, 200, requestId)
  },
  { rateLimit: 'api' }
)
