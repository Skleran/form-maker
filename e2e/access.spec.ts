import { expect, test } from "@playwright/test"

import { dict } from "@/lib/dictionary"

import { E2E_ADMIN, E2E_BASE_URL } from "./env.mjs"
import { createForm, logIn, saveForm } from "./helpers"

test("admin pages send visitors to the login page", async ({ page }) => {
  await page.goto("/admin/forms")
  await expect(page).toHaveURL(/\/login$/)
})

test("a wrong password does not log in", async ({ page }) => {
  await page.goto("/login")
  await page.locator("#login-username").fill(E2E_ADMIN.username)
  await page.locator("#login-password").fill("not-the-password")
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText("Kullanıcı adı veya şifre hatalı.")).toBeVisible()

  await page.goto("/admin/forms")
  await expect(page).toHaveURL(/\/login$/)
})

test("a draft form is closed to visitors", async ({ page, browser }) => {
  await logIn(page)
  await createForm(page)
  const slug = await saveForm(page, { publish: false })

  const visitorContext = await browser.newContext({ baseURL: E2E_BASE_URL })
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/forms/${slug}`)
  await expect(visitor.getByText(dict.publicForm.formNotActiveTitle)).toBeVisible()
  await expect(visitor.getByRole("button", { name: dict.publicForm.submit, exact: true })).toHaveCount(0)
  await visitorContext.close()
})
