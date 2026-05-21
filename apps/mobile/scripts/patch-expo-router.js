/**
 * Patches expo-router's context file for monorepo compatibility.
 * expo-router generates _ctx.android.js / _ctx.ios.js with process.env.EXPO_ROUTER_APP_ROOT
 * which require.context can't resolve at bundle time in a monorepo.
 * This replaces the env var with a literal "./app" path.
 */
const fs = require('fs')
const path = require('path')

const platforms = ['android', 'ios', 'web']

// In a monorepo, expo-router may live in either the workspace's own
// node_modules (when version-specific) OR hoisted to the repo root. Patch
// every copy we can find so the build never picks up an unpatched one.
const candidateDirs = [
  path.join(__dirname, '..', 'node_modules', 'expo-router'),
  path.join(__dirname, '..', '..', '..', 'node_modules', 'expo-router'),
]

let patchedCount = 0
for (const routerDir of candidateDirs) {
  if (!fs.existsSync(routerDir)) continue

  for (const platform of platforms) {
    const filePath = path.join(routerDir, `_ctx.${platform}.js`)
    if (!fs.existsSync(filePath)) continue

    let content = fs.readFileSync(filePath, 'utf8')
    if (content.includes('process.env.EXPO_ROUTER_APP_ROOT')) {
      content = content.replace(/process\.env\.EXPO_ROUTER_APP_ROOT/g, '"./app"')
      content = content.replace(/process\.env\.EXPO_ROUTER_IMPORT_MODE/g, '"sync"')
      fs.writeFileSync(filePath, content)
      console.log(`Patched ${filePath}`)
      patchedCount++
    }
  }
}

if (patchedCount === 0) {
  console.log('patch-expo-router: nothing to patch (already patched or expo-router not found)')
}
