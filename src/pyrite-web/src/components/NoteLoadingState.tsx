export function NoteLoadingState({ message = 'Loading note…' }: { message?: string }) {
  return (
    <div
      className="grid min-h-[50svh] place-items-center px-4 text-center text-[var(--ink-muted)]"
      data-testid="note-loading-state"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(139,69,19,0.18)] border-t-[var(--accent)]"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-['Newsreader'] text-xl text-[var(--ink)]">{message}</h2>
          <p className="mt-1 text-xs">Pulling the latest file contents from the vault.</p>
        </div>
      </div>
    </div>
  )
}
