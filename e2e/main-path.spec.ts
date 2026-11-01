import { expect, test } from "@playwright/test"

import { dict } from "@/lib/dictionary"

import { E2E_BASE_URL } from "./env.mjs"
import { createForm, logIn, questionLabels, readDownload, saveForm } from "./helpers"

const NAME_LABEL = "Adınız ve soyadınız"
const FILE_LABEL = "Özgeçmişiniz"
const NAME_ANSWER = "Ayşe Yılmaz"
const FILE_NAME = "ozgecmis.txt"
const FILE_CONTENT = "Yüklenen dosyanın içeriği"

test("a form can be built, published, answered and reviewed", async ({ page, browser }) => {
  // The admin builds a form with a text question and a file question
  await logIn(page)
  await createForm(page)
  await questionLabels(page).first().fill(NAME_LABEL)
  await page.getByRole("button", { name: dict.builder.canvas.quickFile }).click()
  await questionLabels(page).nth(1).fill(FILE_LABEL)

  const slug = await saveForm(page, { publish: true })
  const builderUrl = page.url().split("?")[0]

  // A visitor with no session answers it
  const visitorContext = await browser.newContext({ baseURL: E2E_BASE_URL })
  const visitor = await visitorContext.newPage()
  await visitor.goto(`/forms/${slug}`)
  await visitor.getByLabel(NAME_LABEL).fill(NAME_ANSWER)
  await visitor.locator('input[type="file"]').setInputFiles({
    name: FILE_NAME,
    mimeType: "text/plain",
    buffer: Buffer.from(FILE_CONTENT),
  })
  await expect(visitor.getByText(FILE_NAME)).toBeVisible()
  await visitor.getByRole("button", { name: dict.publicForm.submit, exact: true }).click()
  await expect(visitor.getByText(dict.publicForm.successTitle)).toBeVisible()

  // The admin sees the response
  await page.goto(`${builderUrl}?tab=responses`)
  await expect(page.getByRole("cell", { name: NAME_ANSWER })).toBeVisible()

  // The uploaded file comes back unchanged
  await page.getByRole("button", { name: dict.responses.inspectTooltip }).click()
  const fileDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: dict.responses.downloadFile }).click()
  const file = await fileDownload
  expect(file.suggestedFilename()).toBe(FILE_NAME)
  expect(await readDownload(file)).toBe(FILE_CONTENT)

  // The same file address is closed to the visitor
  const visitorResponse = await visitorContext.request.get(file.url())
  expect(visitorResponse.status()).toBe(401)
  expect(await visitorResponse.text()).not.toContain(FILE_CONTENT)
  await visitorContext.close()

  await page.getByRole("button", { name: dict.responses.close }).first().click()

  // The CSV export contains the answer and its question
  const csvDownload = page.waitForEvent("download")
  await page.getByRole("button", { name: dict.responses.exportCsv }).click()
  const csv = await readDownload(await csvDownload)
  expect(csv).toContain(NAME_LABEL)
  expect(csv).toContain(NAME_ANSWER)
})
