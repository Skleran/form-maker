export const E2E_PORT = 3100
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`

export const E2E_ADMIN = { username: "e2e-admin", password: "e2e-admin-password" }

const E2E_DATABASE_URL = "postgresql://formmaker:formmaker_e2e@127.0.0.1:5434/formmaker_e2e"

// Real environment variables beat .env files, so every setting the live site uses is set here.
// The blank values turn Supabase off, which keeps tests away from the live database and bucket.
export const e2eEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  DIRECT_URL: E2E_DATABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SECRET_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SUPABASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_APP_URL: E2E_BASE_URL,
  ADMIN_USERNAME: E2E_ADMIN.username,
  ADMIN_PASSWORD: E2E_ADMIN.password,
  AUTH_SECRET: "e2e-only-auth-secret-that-is-at-least-32-characters",
  COOKIE_SECURE: "false",
}
