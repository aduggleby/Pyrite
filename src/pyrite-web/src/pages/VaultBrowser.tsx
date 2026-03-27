import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { VaultTree } from '../components/VaultTree'
import { useVault } from './VaultLayout'

export function VaultBrowser() {
  const navigate = useNavigate()
  const { treeQuery, notePath, revealFolderRequest, selectNote } = useVault()

  return (
    <>
      <div className="px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <input
            id="search"
            className="min-h-10 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--parchment-dark)] px-3 py-2 pl-9 text-[0.9rem] outline-none transition-shadow placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-pale)] focus:shadow-[0_0_0_3px_rgba(210,166,121,0.25)]"
            placeholder="Files, text, tags..."
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                void navigate({ to: '/search/$query', params: { query: event.target.value } })
              }
            }}
          />
        </div>
      </div>
      <div className="px-2" data-testid="vault-tree-panel">
        <VaultTree
          nodes={treeQuery.data ?? []}
          activePath={notePath}
          revealRequest={revealFolderRequest}
          onSelect={selectNote}
        />
      </div>
    </>
  )
}
