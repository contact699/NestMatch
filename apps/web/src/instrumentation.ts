// Next.js runs this once when the server process boots. Use it to fail fast on
// misconfigured environments with a named error, instead of deferring to a
// confusing runtime failure at point of use.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env')
    validateEnv()
  }
}
