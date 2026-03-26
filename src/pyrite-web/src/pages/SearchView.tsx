import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { searchNotes } from '../lib/api'
import { useVault } from './VaultLayout'

const noteSubtitleClass = 'text-xs text-[var(--ink-muted)]'

export function SearchView() {
  const navigate = useNavigate()
  const { notePath, searchText, selectNote } = useVault()

  const searchQuery = useQuery({
    queryKey: ['search', searchText],
    queryFn: () => searchNotes(searchText ?? ''),
    enabled: Boolean(searchText),
  })

  return (
    <>
      <div className="px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <input
            className="min-h-10 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--parchment-dark)] px-3 py-2 pl-9 text-[0.9rem] outline-none transition-shadow placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-pale)] focus:shadow-[0_0_0_3px_rgba(210,166,121,0.25)]"
            placeholder="Search vault..."
            value={searchText ?? ''}
            onChange={(event) =>
              event.target.value
                ? navigate({
                    to: '/search/$query',
                    params: { query: event.target.value },
                    replace: true,
                  })
                : navigate({
                    to: '/search',
                    replace: true,
                  })
            }
          />
        </div>
      </div>

      {searchQuery.data?.results.length ? (
        <div className="flex flex-col" data-testid="search-results">
          {searchQuery.data.results.map((result) => (
            <button
              key={result.path}
              className={[
                'w-full border-b border-[var(--line)] px-4 py-2.5 text-left transition-colors hover:bg-[rgba(210,166,121,0.12)]',
                notePath === result.path ? 'bg-[rgba(210,166,121,0.18)]' : '',
              ].join(' ')}
              data-testid={`search-result-${result.path.replaceAll('/', '__')}`}
              type="button"
              onClick={() => selectNote(result.path)}
            >
              <strong className="block text-sm text-[var(--ink)]">{result.title}</strong>
              <span className={noteSubtitleClass}>{result.snippet}</span>
            </button>
          ))}
        </div>
      ) : searchText ? (
        <p className={`px-4 py-4 ${noteSubtitleClass}`}>No results</p>
      ) : null}
    </>
  )
}
