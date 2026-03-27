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
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-[rgba(44,24,16,0.32)] px-3 py-4 backdrop-blur-[4px]"
      role="presentation"
    >
      <div className="w-full max-w-5xl overflow-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(255,255,255,0.72)] p-4 shadow-[var(--paper-shadow-lg)]">
        <h2 className="font-['Newsreader'] text-3xl leading-none text-[var(--ink)]">
          Merge Review
        </h2>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Compare your merged text against the latest disk version before committing.
        </p>
        {preview.hasConflicts ? (
          <div className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-[rgba(139,69,19,0.24)] bg-[rgba(210,166,121,0.26)] px-3 py-2 text-sm text-[var(--ink)]">
            <span>{preview.conflicts.length} conflict block(s) still need review.</span>
          </div>
        ) : null}
        <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--parchment)]">
          <CodeMirror value={content} height="420px" extensions={extensions} onChange={setContent} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="min-h-10 rounded-[var(--radius)] border border-[var(--line)] bg-[rgba(255,255,255,0.56)] px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.8)]"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm text-[var(--parchment)] shadow-[var(--paper-shadow)] transition-colors hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={isSubmitting}
            onClick={() => onCommit(content)}
          >
            Commit Merge
          </button>
        </div>
      </div>
    </div>
  )
}
