import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Impahla app runs as a Next.js server application (App Router + API routes + MySQL),
 * so the native shell loads the running server inside a Capacitor WebView.
 *
 * - Android emulator reaches the host machine at 10.0.2.2
 * - For a physical device, export CAP_SERVER_URL with your computer's LAN address,
 *   e.g. CAP_SERVER_URL=http://192.168.1.20:3000 npx cap sync android
 */
const serverUrl = process.env.CAP_SERVER_URL ?? 'http://10.0.2.2:3000'

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
