import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteView } from './NoteView'

const useVaultMock = vi.fn()

vi.mock('./VaultLayout', () => ({
  useVault: () => useVaultMock(),
}))

describe('NoteView', () => {
  it('toggles preview task checkboxes through the vault action', () => {
    const toggleTask = vi.fn()

    useVaultMock.mockReturnValue({
      noteQuery: {
        data: {
          path: '00-Start-Here.md',
          tags: [],
          backlinks: [],
          previewHtml: '<ul><li><input type="checkbox" /> Verify the migration timeline note</li></ul>',
        },
      },
      noteMeta: { changedExternally: false, dirty: false },
      selectNote: vi.fn(),
      toggleTask,
      isTaskTogglePending: false,
    })

    render(<NoteView />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(toggleTask).toHaveBeenCalledWith(0, true)
    expect(checkbox).toBeChecked()
  })
})
