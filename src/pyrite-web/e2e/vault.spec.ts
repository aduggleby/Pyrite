import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const inboxPath = '/home/alex/Source/Pyrite/sample-vault/Inbox.md'
const uploadPath = '/home/alex/Source/Pyrite/src/pyrite-web/public/favicon.svg'

test('login, edit, upload, and trigger merge review', async ({ page }) => {
  const originalInbox = await fs.readFile(inboxPath, 'utf8')

  try {
    await page.goto('/login')
    await page.getByPlaceholder('Username').fill('alex')
    await page.getByPlaceholder('Password').fill('password')
    await page.getByRole('button', { name: 'Log In' }).click()

    await page.getByRole('button', { name: /Inbox\.md/i }).click()
    await expect(page.getByText('Inbox.md')).toBeVisible()

    const editor = page.locator('.cm-content').first()
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type('# Inbox\n\nPlaywright edit.\n')
    await page.getByRole('button', { name: /Save/i }).click()

    await page.locator('input[type="file"]').setInputFiles(uploadPath)
    await expect(page.locator('.cm-content')).toContainText('.attachments')

    await fs.writeFile(inboxPath, '# Inbox\n\nRemote write.\n')
    await editor.click()
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+A`)
    await page.keyboard.type('# Inbox\n\nConflicting local write.\n')
    await page.getByRole('button', { name: /Save/i }).click()

    await expect(page.getByText('Merge Review')).toBeVisible()
  } finally {
    await fs.writeFile(inboxPath, originalInbox)
    const attachmentsDir = path.join('/home/alex/Source/Pyrite/sample-vault', '.attachments')
    await fs.rm(attachmentsDir, { recursive: true, force: true })
  }
})
