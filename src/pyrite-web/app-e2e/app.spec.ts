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
  await page.getByPlaceholder('Username').fill('alex')
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: 'Log In' }).click()
  if (waitForShell) {
    await expect(page.getByTestId('vault-tree-panel')).toBeVisible()
    await expect(page.getByTestId('vault-tree-panel').getByText('01-Species').first()).toBeVisible({ timeout: 15000 })
  }
}

async function openStartHere(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /00-Start-Here\.md/i }).click()
  await expect(page.getByTestId('note-title')).toHaveText('00-Start-Here')
}

async function openMarshGuide(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Shallow Marsh Guide\.md/i }).click()
  await expect(page.getByTestId('note-title')).toHaveText('Shallow Marsh Guide')
}

async function openNoteMenu(page: import('@playwright/test').Page) {
  await page.getByTestId('note-menu-button').click()
}

test('1. shows the login screen', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
})

test('2. rejects invalid credentials', async ({ page }) => {
  await login(page, 'wrong-password', false)
  await expect(page.getByText('Login failed. Check the credentials and server setup.')).toBeVisible()
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
  await expect(page.getByTestId('note-path')).toContainText('00-Start-Here.md')
})

test('7. searches by filename', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('mallard')
  await page.getByTestId('search-result-01-Species__dabbling__mallard.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('mallard')
})

test('8. searches by content', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('migration pushes')
  await page.getByTestId('search-result-02-Habitats__lakes__Open Lake Survey.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('Open Lake Survey')
})

test('9. shows the development login shortcut in dev mode', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Use Development Login' })).toBeVisible()
})

test('10. shows tasks on the starter note', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('tags-tasks-card')).toContainText('Open · Verify the migration timeline note')
  await expect(page.getByTestId('tags-tasks-card')).toContainText('Done · Seed the local development workspace')
})

test('11. shows preview content for an opened note', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('preview-panel')).toContainText('Duck Vault')
})

test('12. navigates from a preview wikilink', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await page.getByTestId('preview-panel').getByRole('link', { name: 'Shallow Marsh Guide' }).click()
  await expect(page.getByTestId('note-title')).toHaveText('Shallow Marsh Guide')
})

test('13. shows wikilinks metadata', async ({ page }) => {
  await login(page)
  await openStartHere(page)
  await expect(page.getByTestId('wikilinks-card')).toContainText('Shallow Marsh Guide')
  await expect(page.getByTestId('wikilinks-card')).toContainText('Duck Behavior Baseline')
})

test('14. shows backlinks for Shallow Marsh Guide', async ({ page }) => {
  await login(page)
  await openMarshGuide(page)
  await expect(page.getByTestId('backlinks-card')).toContainText('Mallard')
})

test('15. opens a note from search results', async ({ page }) => {
  await login(page)
  await page.getByPlaceholder('Files, text, tags...').fill('behavior')
  await page.getByTestId('search-result-04-Research__behavior__Duck Behavior Baseline.md').click()
  await expect(page.getByTestId('note-title')).toHaveText('Duck Behavior Baseline')
})

test('16. saves edits to the workspace file', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const updated = `${original}\nSaved from app test.\n`

  try {
    await login(page)
    await openStartHere(page)
    await page.getByRole('button', { name: 'Edit' }).click()
    const editor = page.locator('.cm-content').first()
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(updated)
    await openNoteMenu(page)
    await page.getByTestId('note-menu-save-button').click()
    await expect.poll(() => fs.readFile(startHerePath, 'utf8')).toContain('Saved from app test.')
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('17. uploads an attachment and inserts the markdown link', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const attachmentsDir = path.join(workspaceRoot, '.attachments')

  try {
    await login(page)
    await openStartHere(page)
    await page.getByRole('button', { name: 'Edit' }).click()
    await openNoteMenu(page)
    await page.getByTestId('attachment-input').setInputFiles(uploadPath)
    await expect(page.locator('.cm-content')).toContainText('.attachments')
    const attachmentEntries = await fs.readdir(attachmentsDir)
    expect(attachmentEntries.length).toBeGreaterThan(0)
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('18. warns about external file changes', async ({ page }) => {
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

test('19. opens merge review after a conflicted save', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')

  try {
    await login(page)
    await openStartHere(page)
    await page.getByRole('button', { name: 'Edit' }).click()
    const editor = page.locator('.cm-content').first()
    await fs.writeFile(startHerePath, `${original}\nRemote merge preview change.\n`)
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(`${original}\nLocal merge preview change.\n`)
    await openNoteMenu(page)
    await page.getByTestId('note-menu-save-button').click()
    await expect(page.getByText('Merge Review')).toBeVisible()
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})

test('20. commits merged content successfully', async ({ page }) => {
  const original = await fs.readFile(startHerePath, 'utf8')
  const remote = `${original}\nRemote merge commit change.\n`
  const local = `${original}\nLocal merge commit change.\n`

  try {
    await login(page)
    await openStartHere(page)
    await page.getByRole('button', { name: 'Edit' }).click()
    const editor = page.locator('.cm-content').first()
    await fs.writeFile(startHerePath, remote)
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type(local)
    await openNoteMenu(page)
    await page.getByTestId('note-menu-save-button').click()
    await expect(page.getByText('Merge Review')).toBeVisible()
    await page.getByRole('button', { name: 'Commit Merge' }).click()
    await expect.poll(() => fs.readFile(startHerePath, 'utf8')).toContain('Local merge commit change.')
  } finally {
    await fs.writeFile(startHerePath, original)
  }
})
