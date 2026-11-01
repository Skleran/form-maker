import { expect, test } from "@playwright/test"

import { logIn } from "./helpers"

test("the database is reachable", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(await response.json()).toEqual({ status: "ok" })
})

test("the admin can log in", async ({ page }) => {
  await logIn(page)
})
