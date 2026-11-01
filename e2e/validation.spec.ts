import { expect, test } from "@playwright/test"

import { dict } from "@/lib/dictionary"

import { E2E_BASE_URL } from "./env.mjs"
import { createForm, logIn, questionLabels, saveForm } from "./helpers"

const LABEL = "Telefon numaranız"

test("an empty required field blocks submitting and takes focus", async ({ page, browser }) => {
  await logIn(page)
  await createForm(page)
  await questionLabels(page).first().fill(LABEL)
  await page.getByRole("switch", { name: dict.builder.canvas.required, exact: true }).first().click()
  const slug = await saveForm(page, { publish: true })

  const visitorContext = await browser.newContext({ baseURL: E2E_BASE_URL })
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/forms/${slug}`)
  const field = visitor.getByLabel(LABEL)
  const submit = visitor.getByRole("button", { name: dict.publicForm.submit, exact: true })

  await submit.click()
  await expect(visitor.getByText(`"${LABEL}" alanı zorunludur`)).toBeVisible()
  await expect(field).toBeFocused()
  await expect(field).toHaveAttribute("aria-invalid", "true")
  await expect(visitor.getByText(dict.publicForm.successTitle)).toHaveCount(0)

  await field.fill("0555 000 00 00")
  await submit.click()
  await expect(visitor.getByText(dict.publicForm.successTitle)).toBeVisible()
  await visitorContext.close()
})
