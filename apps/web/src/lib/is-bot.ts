/**
 * Returns true if the given User-Agent string looks like a bot/crawler.
 *
 * This is a User-Agent heuristic, not a definitive bot block — sophisticated
 * crawlers will spoof real browsers. The intent is to suppress increments
 * from search crawlers and obvious automation, not to be a security boundary.
 */
const BOT_UA_PATTERNS = [
  /bot/i,           // Googlebot, Bingbot, AhrefsBot, etc.
  /crawl/i,         // various crawlers
  /spider/i,        // various spiders
  /slurp/i,         // Yahoo Slurp
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /pinterest/i,
  /discordbot/i,
  /slackbot/i,
  /vercel-screenshot/i,    // Vercel OG image preview
  /vercelbot/i,
  /headlesschrome/i,       // Playwright/Puppeteer default UA
  /pingdom/i,
  /uptimerobot/i,
  /lighthouse/i,
  /pagespeed/i,
  /chrome-lighthouse/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /applebot/i,
  /sogou/i,
  /seokicks/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
]

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true // treat missing UA as a bot — real browsers always send one
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent))
}
