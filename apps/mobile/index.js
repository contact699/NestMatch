// App-owned expo-router entry. Uses a literal require.context so Metro can
// statically resolve the app routes at bundle time, instead of relying on
// node_modules/expo-router/_ctx.android.js which references
// process.env.EXPO_ROUTER_APP_ROOT (undefined in a monorepo build, causes a
// pre-React crash). See:
// https://docs.expo.dev/router/reference/troubleshooting/

import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'

function App() {
  const ctx = require.context('./app')
  return <ExpoRoot context={ctx} />
}

registerRootComponent(App)
