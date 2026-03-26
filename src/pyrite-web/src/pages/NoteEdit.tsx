import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { useVault } from './VaultLayout'

const noteSubtitleClass = 'text-xs text-[var(--ink-muted)]'

export function NoteEdit() {
  const { noteQuery, draft, setDraft, noteMeta } = useVault()

  if (!noteQuery.data) {
    return (
      <div className="grid min-h-[50svh] place-items-center px-4 text-center text-[var(--ink-muted)]">
        <div>
          <h2 className="font-['Newsreader'] text-xl">No note selected</h2>
          <p className={`mt-1 ${noteSubtitleClass}`}>Open a note from the vault first.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border-b border-[var(--line)] px-4 py-2">
        <p className={noteSubtitleClass}>
          {noteQuery.data.path}{noteMeta.dirty ? ' *' : ''}
        </p>
      </div>
      <CodeMirror value={draft} height="calc(100svh - 140px)" extensions={[markdown()]} onChange={setDraft} />
    </>
  )
}
