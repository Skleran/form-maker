// Playwright runs this as its web server: empties the e2e database, applies the migrations,
// builds the app and starts the same standalone server that the Docker image runs.
import { execSync, spawn } from "child_process"
import fs from "fs"
import path from "path"

import { E2E_PORT, e2eEnv } from "./env.mjs"

const env = { ...process.env, ...e2eEnv }

// This script wipes a database, so it refuses anything but the local e2e one
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const url = new URL(env[name])
  if (url.hostname !== "127.0.0.1" || url.port !== "5434") {
    throw new Error(`${name} must point at the local e2e database`)
  }
}

const run = (command, input) =>
  execSync(command, { env, input, stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] })

run(
  `pnpm exec prisma db execute --stdin --url "${env.DATABASE_URL}"`,
  "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
)
run("pnpm exec prisma migrate deploy")
run("pnpm exec next build")

const standalone = path.resolve(".next/standalone")
fs.cpSync("public", path.join(standalone, "public"), { recursive: true })
fs.cpSync(".next/static", path.join(standalone, ".next/static"), { recursive: true })

// The server's working directory is the standalone folder, so test uploads land here.
// The build can copy in real uploads and .env files, which tests must not see.
fs.rmSync(path.join(standalone, "uploads"), { recursive: true, force: true })
for (const name of fs.readdirSync(standalone)) {
  if (name.startsWith(".env")) fs.rmSync(path.join(standalone, name))
}

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  env: { ...env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(E2E_PORT) },
  stdio: "inherit",
})
server.on("exit", (code) => process.exit(code ?? 1))
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal))
}
