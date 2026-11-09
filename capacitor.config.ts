import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Impahla app runs as a Next.js server application (App Router + API routes + fallback store),
 * so the native shell loads the running server inside a Capacitor WebView.
 */
const serverUrl = process.env.CAP_SERVER_URL ?? 'http://192.168.0.192:3000'

const config: CapacitorConfig = {
  appId: 'com.mphatso.registry',
  appName: 'Impahla app',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
