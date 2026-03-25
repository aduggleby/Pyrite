import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MergeReviewDialog } from './MergeReviewDialog'

describe('MergeReviewDialog', () => {
  it('renders conflict state and fires commit action', () => {
    const onCommit = vi.fn()

    render(
      <MergeReviewDialog
        isSubmitting={false}
        onClose={() => {}}
        onCommit={onCommit}
        preview={{
          path: 'Inbox.md',
          remoteVersionToken: 'abc123',
          remoteContent: '# Inbox\n\nRemote\n',
          mergedContent: '# Inbox\n\nMerged\n',
          hasConflicts: true,
          conflicts: [{ index: 0, base: 'base', local: 'local', remote: 'remote' }],
        }}
      />,
    )

    expect(screen.getByText(/conflict block/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Commit Merge' }))
    expect(onCommit).toHaveBeenCalled()
  })
})
