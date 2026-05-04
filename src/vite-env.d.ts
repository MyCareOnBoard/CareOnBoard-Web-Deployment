/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** ElevenLabs realtime STT WebSocket origin only, e.g. wss://api.us.elevenlabs.io */
  readonly VITE_ELEVENLABS_WS_ORIGIN?: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_PLACES_API_KEY: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_MOBILE_APP_DEEP_LINK_SCHEME: string
  readonly VITE_MOBILE_APP_IOS_STORE_URL: string
  readonly VITE_MOBILE_APP_ANDROID_STORE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
