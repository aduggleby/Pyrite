import { useVault } from './VaultLayout'

const noteSubtitleClass = 'text-xs text-[var(--ink-muted)]'
const resultButtonClass =
  'w-full rounded-[var(--radius)] px-3 py-2 text-left transition-colors hover:bg-[rgba(210,166,121,0.16)]'

export function NoteView() {
  const { noteQuery, noteMeta, selectNote, toggleTask, isTaskTogglePending } = useVault()

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
        <div className="flex items-center gap-1.5 border-b border-[var(--line)] px-4 py-2">
          <p className={noteSubtitleClass} data-testid="note-path">
            {noteQuery.data.path}
          </p>
          {noteQuery.data.tags.map((tag) => (
            <span
              key={tag.value}
              className="rounded-[var(--radius)] bg-[rgba(210,166,121,0.2)] px-1.5 py-0.5 text-[0.68rem] text-[var(--ink-muted)]"
            >
              #{tag.value}
            </span>
          ))}
        </div>

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

        {noteQuery.data.backlinks.length > 0 ? (
          <section className="border-t border-[var(--line)] px-4 py-3 text-[0.82rem] text-[var(--ink-light)]">
            <div data-testid="backlinks-card">
              <h3 className="mb-1 text-[0.7rem] uppercase tracking-[0.16em] text-[var(--ink-muted)]">Backlinks</h3>
              <div className="flex flex-col">
                {noteQuery.data.backlinks.map((link) => (
                  <button
                    key={link.path}
                    className={resultButtonClass}
                    type="button"
                    onClick={() => selectNote(link.path)}
                  >
                    <strong className="text-[var(--ink)]">{link.title}</strong>
                    <span className="ml-1.5 text-[0.75rem] text-[var(--ink-muted)]">{link.snippet}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    )
  }
}
