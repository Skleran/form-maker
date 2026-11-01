import { expect, type Download, type Page } from "@playwright/test"
import fs from "fs/promises"

import { dict } from "@/lib/dictionary"

import { E2E_ADMIN } from "./env.mjs"

export async function logIn(page: Page) {
  await page.goto("/login")
  await page.locator("#login-username").fill(E2E_ADMIN.username)
  await page.locator("#login-password").fill(E2E_ADMIN.password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/forms/)
}

export async function createForm(page: Page) {
  // An empty dashboard has a second create button in its empty state
  await page.getByRole("button", { name: dict.dashboard.createForm }).first().click()
  await expect(page).toHaveURL(/\/admin\/forms\/[^/]+\/edit/)
}

export function questionLabels(page: Page) {
  return page.getByPlaceholder(dict.builder.canvas.questionTitlePlaceholder)
}

/**
 * Sets a new slug on the settings tab, optionally publishes, saves, and returns the slug.
 * A retry in CI runs against the same database and slugs are unique, so each call gets its own.
 */
export async function saveForm(page: Page, { publish }: { publish: boolean }) {
  const slug = `e2e-${Date.now()}`
  await page.getByRole("tab", { name: dict.builder.header.tabSettings }).click()
  await page.getByPlaceholder("geri-bildirim-formu").fill(slug)
  if (publish) {
    await page.getByRole("switch", { name: dict.builder.header.draft }).click()
  }
  await page.getByRole("button", { name: dict.builder.header.save, exact: true }).click()
  await expect(page.getByText("Form başarıyla kaydedildi!")).toBeVisible()
  return slug
}

export async function readDownload(download: Download) {
  return fs.readFile(await download.path(), "utf8")
}
