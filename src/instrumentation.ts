import { assertProductionAuthConfig } from "@/lib/auth"

// Stops the server from starting in production with missing or known default credentials
export function register() {
  assertProductionAuthConfig()
}
