import { useVault } from './VaultLayout'
import { NoteLoadingState } from '../components/NoteLoadingState'

const noteSubtitleClass = 'text-xs text-[var(--ink-muted)]'

export function NoteView() {
  const { notePath, noteQuery, noteMeta, selectNote, toggleTask, isTaskTogglePending } = useVault()

  if (noteMeta.changedExternally) {
    return (
      <>
        <div
          className="border-b border-[rgba(139,69,19,0.24)] bg-[rgba(210,166,121,0.18)] px-4 py-2 text-sm"
          data-testid="external-change-banner"
        >
          File changed on disk. Review a merge before committing.
        </div>
        {renderNote()}
      </>
    )
  }

  return renderNote()

  function renderNote() {
    if (notePath && noteQuery.isLoading) {
      return <NoteLoadingState />
    }

    if (!noteQuery.data) {
      return (
        <div className="grid min-h-[50svh] place-items-center px-4 text-center text-[var(--ink-muted)]">
          <div>
            <h2 className="font-['Newsreader'] text-xl">Open a note</h2>
            <p className={`mt-1 ${noteSubtitleClass}`}>Browse the vault or search to start reading.</p>
          </div>
        </div>
      )
    }

    return (
      <article>
        <div
          className="preview-panel px-4 py-3 text-sm"
          data-testid="preview-panel"
          onClick={(event) => {
            const target = event.target as HTMLElement
            const checkbox = target.closest('input[type="checkbox"]') as HTMLInputElement | null

            if (checkbox) {
              if (isTaskTogglePending) {
                return
              }

              const checkboxes = Array.from(
                checkbox
                  .closest('[data-testid="preview-panel"]')
                  ?.querySelectorAll('input[type="checkbox"]') ?? [],
              )

              const taskIndex = checkboxes.indexOf(checkbox)
              if (taskIndex >= 0) {
                toggleTask(taskIndex, checkbox.checked)
              }

              return
            }

            const anchor = target.closest('a')
            const href = anchor?.getAttribute('href')
            if (href?.startsWith('/notes/')) {
              event.preventDefault()
              const decoded = decodeURIComponent(href.replace('/notes/', ''))
              selectNote(decoded)
            }
          }}
          dangerouslySetInnerHTML={{ __html: noteQuery.data.previewHtml }}
        />
      </article>
    )
  }
}
