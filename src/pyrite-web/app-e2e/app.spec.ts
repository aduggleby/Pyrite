import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const workspaceRoot = '/home/alex/Source/Pyrite/.dev-workspace/duck-vault'
const startHerePath = path.join(workspaceRoot, '00-Start-Here.md')
const marshGuidePath = path.join(workspaceRoot, '02-Habitats', 'marshes', 'Shallow Marsh Guide.md')
const uploadPath = '/home/alex/Source/Pyrite/src/pyrite-web/public/favicon.svg'

test.describe.configure({ mode: 'serial' })

async function login(page: import('@playwright/test').Page, password = 'password', waitForShell = true) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter username').fill('alex')
  await page.getByPlaceholder('Enter password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  if (waitForShell) {
    await expect(page.getByTestId('vault-tree-panel')).toBeVisible()
    await expect(page.getByTestId('vault-tree-panel').getByText('01-Species').first()).toBeVisible({ timeout: 15000 })
  }
}

async function openStartHere(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^00-Start-Here$/i }).click()
  await expect(page.getByTestId('note-title')).toHaveText('00-Start-Here')
  await expect(page).toHaveURL(/\/view\/00-Start-Here\.md$/)
}

async function openMarshGuide(page: import('@playwright/test').Page) {
  await page.getByTestId('tree-folder-toggle-02-Habitats').click()
  await page.getByTestId('tree-folder-toggle-02-Habitats__marshes').click()
  await page.getByRole('button', { name: /^Shallow Marsh Guide$/i }).click()
  await expect(page.getByTestId('note-title')).toHaveText('02-Habitats / marshes / Shallow Marsh Guide')
  await expect(page).toHaveURL(new RegExp(`/view/${encodeURIComponent('02-Habitats/marshes/Shallow Marsh Guide.md')}$`))
}

async function openAmericanWigeon(page: import('@playwright/test').Page) {
  await page.getByTestId('tree-folder-toggle-01-Species').click()
  await page.getByTestId('tree-folder-toggle-01-Species__dabbling').click()
  await page.getByRole('button', { name: /^american-wigeon$/i }).click()
  await expect(page.getByTestId('note-title')).toHaveText('01-Species / dabbling / american-wigeon')
  await expect(page).toHaveURL(new RegExp(`/view/${encodeURIComponent('01-Species/dabbling/american-wigeon.md')}$`))
}

async function openNoteMenu(page: import('@playwright/test').Page) {
  await page.getByTestId('note-menu-button').click()
}

async function saveFromEditHeader(page: import('@playwright/test').Page) {
  await page.getByTestId('edit-save-button').click()
}

test('1. shows the login screen', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})

test('2. rejects invalid credentials', async ({ page }) => {
  await login(page, 'wrong-password', false)
  await expect(page.getByText('Login failed. Check your credentials.')).toBeVisible()
})

test('3. logs in with the default dev credentials', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('vault-tree-panel')).toBeVisible()
})

test('4. keeps the session after reload', async ({ page }) => {
  await login(page)
  await page.reload()
  await expect(page.getByTestId('vault-tree-panel')).toBeVisible()
})

test('5. renders the top-level duck folders', async ({ page }) => {
  await login(page)
  await expect(page.getByText('01-Species')).toBeVisible()
  await expect(page.getByText('02-Habitats')).toBeVisible()
  await expect(page.getByText('03-Field-Notes')).toBeVisible()
  await expect(page.getByText('04-Research')).toBeVisible()
})

test('6. opens the starter note from the tree', async ({ page }) => {
  await login(page)
  await openStartHere(page)
})

test('7. searches by filename', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('mallard')
  await expect(page).toHaveURL(/\/search\/mallard$/)
  await page.getByTestId('search-result-01-Species__dabbling__mallard.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('01-Species / dabbling / mallard')
})

test('8. searches by content', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('migration pushes')
  await page.getByTestId('search-result-02-Habitats__lakes__Open Lake Survey.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('02-Habitats / lakes / Open Lake Survey')
})

test('8a. highlights matched terms in search results', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('migration pushes')
  const result = page.getByTestId('search-result-02-Habitats__lakes__Open Lake Survey.md')
  await expect(result.getByTestId('search-highlight')).toContainText(['migration', 'pushes'])
})

test('9. requires all unquoted search terms but not their order', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('pushes migration')
  await page.getByTestId('search-result-02-Habitats__lakes__Open Lake Survey.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('02-Habitats / lakes / Open Lake Survey')
})

test('10. treats quoted search text as an exact phrase', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('"pushes migration"')
  await expect(page.getByText('No results')).toBeVisible()
  await page.getByPlaceholder('Search vault...').fill('"migration pushes"')
  await page.getByTestId('search-result-02-Habitats__lakes__Open Lake Survey.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('02-Habitats / lakes / Open Lake Survey')
})

test('11. shows the development login shortcut in dev mode', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Development Login' })).toBeVisible()
})

test('12. logs in through the development login shortcut', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Development Login' }).click()
  await expect(page.getByTestId('vault-tree-panel')).toBeVisible()
})

test('13. logs out back to the login screen', async ({ page }) => {
  await login(page)
  await page.getByTestId('header-logout-button').click()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})

test('14. does not show a separate tasks panel on the starter note', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('tags-tasks-card')).toHaveCount(0)
})

test('15. shows preview content for an opened note in View mode', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByRole('button', { name: 'View' })).toBeVisible()
  await expect(page.getByTestId('preview-panel')).toContainText('Duck Vault')
})

test('15a. toggles a task checkbox from View mode and saves the markdown', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')

  try {
    await login(page)
    await openStartHere(page)
    const firstTask = page.getByTestId('preview-panel').locator('input[type="checkbox"]').first()
    await expect(firstTask).not.toBeChecked()
    await firstTask.click()
    await expect(firstTask).toBeChecked()
    await expect.poll(() => fs.readFile(startHerePath, 'utf8')).toContain('- [x] Verify the migration timeline note')
    await page.reload()
    await expect(page.getByTestId('preview-panel').locator('input[type="checkbox"]').first()).toBeChecked()
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('16. renders markdown headings and lists in View mode', async ({ page }) => {
  await login(page)
  await openAmericanWigeon(page)
  await expect(page.getByTestId('preview-panel').getByRole('heading', { level: 1, name: 'American Wigeon' })).toBeVisible()
  await expect(page.getByTestId('preview-panel').getByRole('heading', { level: 2, name: 'Field Marks' })).toBeVisible()
  await expect(page.getByTestId('preview-panel').getByRole('list')).toContainText('Compact body profile with practical identification notes for local testing.')
})

test('17. shows the explicit edit button in view mode and save button in edit mode', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('view-edit-button')).toBeVisible()
  await openNoteMenu(page)
  await expect(page.getByTestId('note-menu-panel').getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await page.getByTestId('view-edit-button').click()
  await expect(page.getByTestId('edit-save-button')).toBeVisible()
  await openNoteMenu(page)
  await expect(page.getByTestId('note-menu-save-button')).toHaveCount(0)
})

test('18. navigates from a preview wikilink', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await page.getByTestId('preview-panel').getByRole('link', { name: 'Shallow Marsh Guide' }).click()
  await expect(page.getByTestId('note-title')).toHaveText('02-Habitats / marshes / Shallow Marsh Guide')
})

test('19. does not show a separate wikilinks panel', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('wikilinks-card')).toHaveCount(0)
})

test('20. does not show a separate backlinks panel', async ({ page }) => {
  await login(page)
  await openMarshGuide(page)
  await expect(page.getByTestId('backlinks-card')).toHaveCount(0)
})

test('21. opens a note from search results', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('behavior')
  await page.getByTestId('search-result-04-Research__behavior__Duck Behavior Baseline.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('04-Research / behavior / Duck Behavior Baseline')
})

test('22. saves edits to the workspace file and returns to View mode', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const updated = `${original}\nSaved from app test.\n`

  try {
    await login(page)
    await openStartHere(page)
    await page.getByTestId('view-edit-button').click()
    const editor = page.locator('.cm-content').first()
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(updated)
    await saveFromEditHeader(page)
    await expect.poll(() => fs.readFile(startHerePath, 'utf8')).toContain('Saved from app test.')
    await expect(page.getByTestId('preview-panel')).toContainText('Duck Vault')
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('23. uploads an attachment and inserts the markdown link', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const attachmentsDir = path.join(workspaceRoot, '.attachments')

  try {
    await login(page)
    await openStartHere(page)
    await page.getByTestId('view-edit-button').click()
    await openNoteMenu(page)
    await page.getByTestId('attachment-input').setInputFiles(uploadPath)
    await expect(page.locator('.cm-content')).toContainText('.attachments')
    const attachmentEntries = await fs.readdir(attachmentsDir)
    expect(attachmentEntries.length).toBeGreaterThan(0)
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('24. warns about external file changes', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')

  try {
    await login(page)
    await openStartHere(page)
    await fs.writeFile(startHerePath, `${original}\nRemote change for banner.\n`)
    await expect(page.getByTestId('external-change-banner')).toBeVisible({ timeout: 15000 })
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('25. opens merge review after a conflicted save', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')

  try {
    await login(page)
    await openStartHere(page)
    await page.getByTestId('view-edit-button').click()
    const editor = page.locator('.cm-content').first()
    await fs.writeFile(startHerePath, `${original}\nRemote merge preview change.\n`)
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(`${original}\nLocal merge preview change.\n`)
    await saveFromEditHeader(page)
    await expect(page.getByText('Merge Review')).toBeVisible()
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('26. commits merged content successfully', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const remote = `${original}\nRemote merge commit change.\n`
  const local = `${original}\nLocal merge commit change.\n`

  try {
    await login(page)
    await openStartHere(page)
    await page.getByTestId('view-edit-button').click()
    const editor = page.locator('.cm-content').first()
    await fs.writeFile(startHerePath, remote)
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(local)
    await saveFromEditHeader(page)
    await expect(page.getByText('Merge Review')).toBeVisible()
    await page.getByRole('button', { name: 'Commit Merge' }).click()
    await expect.poll(() => fs.readFile(startHerePath, 'utf8')).toContain('Local merge commit change.')
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})
