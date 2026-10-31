import { assertProductionAuthConfig } from "@/lib/auth"

export async function register() {
  // Stops the server from starting in production with missing or known default credentials.
  // Throwing alone leaves the process running and serving nothing, which looks healthy to Docker.
  try {
    assertProductionAuthConfig()
  } catch (error) {
    console.error(error)
    if (process.env.NEXT_RUNTIME === "nodejs") process.exit(1)
    throw error
  }

  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { scheduleUploadCleanup } = await import("@/lib/upload-cleanup")
    scheduleUploadCleanup()
  }
}
