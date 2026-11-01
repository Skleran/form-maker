import { expect, test, type Page } from "@playwright/test"

import { dict } from "@/lib/dictionary"

import { createForm, logIn, questionLabels, saveForm } from "./helpers"

const DEFAULT_LABEL = "Başlıksız Soru"
const EDITED_LABEL = "Düzenlenmiş soru"
const SECOND_EDIT = "İkinci düzenleme"

function undoButton(page: Page) {
  return page.getByRole("button", { name: dict.builder.header.undoTooltip })
}

async function save(page: Page) {
  const toast = page.getByText("Form başarıyla kaydedildi!")
  await page.getByRole("button", { name: dict.builder.header.save, exact: true }).click()
  await expect(toast).toBeVisible()
}

async function expectSavedLabel(page: Page, label: string) {
  await page.reload()
  await expect(questionLabels(page).first()).toHaveValue(label)
}

test.beforeEach(async ({ page }) => {
  await logIn(page)
  await createForm(page)
})

test("unsaved edits survive switching tabs, and saved edits survive a reload", async ({ page }) => {
  await questionLabels(page).first().fill(EDITED_LABEL)
  await expect(page.getByText(dict.builder.header.unsavedChanges)).toBeVisible()

  await page.getByRole("tab", { name: dict.builder.header.tabResponses }).click()
  await page.getByRole("tab", { name: dict.builder.header.tabQuestions }).click()
  await expect(questionLabels(page).first()).toHaveValue(EDITED_LABEL)

  await saveForm(page, { publish: false })
  await page.getByRole("tab", { name: dict.builder.header.tabQuestions }).click()
  await expectSavedLabel(page, EDITED_LABEL)
})

test("edits made after a save are saved too", async ({ page }) => {
  await questionLabels(page).first().fill(EDITED_LABEL)
  await save(page)

  await questionLabels(page).first().fill(SECOND_EDIT)
  await expect(page.getByText(dict.builder.header.unsavedChanges)).toBeVisible()
  await save(page)
  await expectSavedLabel(page, SECOND_EDIT)
})

test("one press of undo reverts one edit", async ({ page }) => {
  // Showing the question settings registers more fields, which must not count as an edit
  await page.getByRole("button", { name: "Soru ayarları" }).click()
  await questionLabels(page).first().fill(EDITED_LABEL)

  await expect(undoButton(page)).toBeEnabled()
  await undoButton(page).click()

  await expect(questionLabels(page).first()).toHaveValue(DEFAULT_LABEL)
  await expect(undoButton(page)).toBeDisabled()
})

test("edits made after an undo are saved", async ({ page }) => {
  await questionLabels(page).first().fill(EDITED_LABEL)
  await expect(undoButton(page)).toBeEnabled()
  await undoButton(page).click()
  await expect(undoButton(page)).toBeDisabled()

  await questionLabels(page).first().fill(SECOND_EDIT)
  await save(page)
  await expectSavedLabel(page, SECOND_EDIT)
})

test("undo removes an added question, and redo brings it back", async ({ page }) => {
  await page.getByRole("button", { name: dict.builder.canvas.quickFile }).click()
  await expect(questionLabels(page)).toHaveCount(2)

  await undoButton(page).click()
  await expect(questionLabels(page)).toHaveCount(1)

  await page.getByRole("button", { name: dict.builder.header.redoTooltip }).click()
  await expect(questionLabels(page)).toHaveCount(2)
})
