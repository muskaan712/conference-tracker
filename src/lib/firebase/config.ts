import { z } from "zod";

/**
 * Firebase is entirely optional. The public tracker (browsing, filters,
 * planner, calendar export, guest My Papers) works with zero Firebase
 * configuration. These variables only unlock optional cross-device account
 * storage — see docs/FIREBASE_SETUP.md.
 */
const firebaseEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
});

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function loadFirebaseEnv() {
  const parsed = firebaseEnvSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_ENABLED: process.env.NEXT_PUBLIC_FIREBASE_ENABLED,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  // Firebase env vars are all optional at the schema level (a misconfigured
  // deployment must still build); resolveFirebaseConfig() below is what
  // actually decides whether Firebase turns on.
  return parsed.success ? parsed.data : {};
}

export interface ResolvedFirebaseConfig {
  enabled: boolean;
  config?: FirebaseWebConfig;
}

/**
 * Firebase only initialises when NEXT_PUBLIC_FIREBASE_ENABLED="true" AND
 * every required config value is present — never on partial/broken config,
 * and never by default. Guest mode and the public tracker are unaffected
 * either way.
 */
export function resolveFirebaseConfig(): ResolvedFirebaseConfig {
  const env = loadFirebaseEnv();
  if (env.NEXT_PUBLIC_FIREBASE_ENABLED !== "true") {
    return { enabled: false };
  }
  const required = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missing = Object.entries(required).filter(([, v]) => !v);
  if (missing.length > 0) {
    return { enabled: false };
  }
  return {
    enabled: true,
    config: required as FirebaseWebConfig,
  };
}

export function isFirebaseEnabled(): boolean {
  return resolveFirebaseConfig().enabled;
}
