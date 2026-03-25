import { useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { unifiedMergeView } from '@codemirror/merge'
import type { MergePreviewResponse } from '../types'

interface MergeReviewDialogProps {
  preview: MergePreviewResponse
  onClose(): void
  onCommit(content: string): void
  isSubmitting: boolean
}

export function MergeReviewDialog({ preview, onClose, onCommit, isSubmitting }: MergeReviewDialogProps) {
  const [content, setContent] = useState(preview.mergedContent)

  const extensions = useMemo(
    () => [
      markdown(),
      unifiedMergeView({
        original: preview.remoteContent,
      }),
    ],
    [preview.remoteContent],
  )

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog-panel">
        <h2 className="note-title" style={{ fontSize: '1.8rem' }}>
          Merge Review
        </h2>
        <p className="note-subtitle">
          Compare your merged text against the latest disk version before committing.
        </p>
        {preview.hasConflicts ? (
          <div className="status-banner" style={{ marginTop: '1rem' }}>
            <span>{preview.conflicts.length} conflict block(s) still need review.</span>
          </div>
        ) : null}
        <div className="merge-panel" style={{ marginTop: '1rem' }}>
          <CodeMirror value={content} height="420px" extensions={extensions} onChange={setContent} />
        </div>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="button" disabled={isSubmitting} onClick={() => onCommit(content)}>
            Commit Merge
          </button>
        </div>
      </div>
    </div>
  )
}
