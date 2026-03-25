import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { FileText, FileUp, Folder, LogOut, MoreVertical, Pencil, Save, Search } from 'lucide-react'
import {
  commitMerge,
  fetchMergePreview,
  fetchNote,
  fetchNoteStatus,
  fetchSession,
  fetchVaultTree,
  logout,
  saveNote,
  searchNotes,
  uploadAttachment,
} from '../lib/api'
import { MergeReviewDialog } from '../components/MergeReviewDialog'
import { VaultTree } from '../components/VaultTree'
import type { MergePreviewResponse } from '../types'

type MobileTab = 'vault' | 'view' | 'edit' | 'search'

const noteSubtitleClass = 'text-xs text-[var(--ink-muted)]'
const resultButtonClass =
  'w-full rounded-[var(--radius)] px-3 py-2 text-left transition-colors hover:bg-[rgba(210,166,121,0.16)]'
const navButtonBaseClass =
  'flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] transition-colors'

export function VaultPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/' })
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<MobileTab>('vault')
  const [draft, setDraft] = useState('')
  const [mergePreview, setMergePreview] = useState<MergePreviewResponse | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
  })

  const treeQuery = useQuery({
    queryKey: ['tree'],
    queryFn: fetchVaultTree,
    enabled: sessionQuery.data?.isAuthenticated === true,
  })

  const noteQuery = useQuery({
    queryKey: ['note', search.path],
    queryFn: () => fetchNote(search.path!),
    enabled: Boolean(search.path && sessionQuery.data?.isAuthenticated),
  })

  const searchQuery = useQuery({
    queryKey: ['search', search.q],
    queryFn: () => searchNotes(search.q ?? ''),
    enabled: Boolean(search.q && sessionQuery.data?.isAuthenticated),
  })

  const noteStatusQuery = useQuery({
    queryKey: ['note-status', noteQuery.data?.path, noteQuery.data?.versionToken],
    queryFn: () => fetchNoteStatus(noteQuery.data!.path, noteQuery.data!.versionToken),
    enabled: Boolean(noteQuery.data),
    refetchInterval: 8000,
  })

  useEffect(() => {
    if (sessionQuery.data && !sessionQuery.data.isAuthenticated) {
      void navigate({ to: '/login' })
    }
  }, [navigate, sessionQuery.data])

  useEffect(() => {
    if (noteQuery.data) {
      setDraft(noteQuery.data.content)
    }
  }, [noteQuery.data?.path, noteQuery.data?.versionToken])

  useEffect(() => {
    if (search.path) {
      setActiveTab('view')
      setMenuOpen(false)
    }
  }, [search.path])

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await navigate({ to: '/login' })
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!noteQuery.data) {
        return
      }

      const result = await saveNote(noteQuery.data.path, draft, noteQuery.data.versionToken)
      if (result.status === 409) {
        const preview = await fetchMergePreview(noteQuery.data.path, noteQuery.data.content, draft)
        setMergePreview(preview)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['note', noteQuery.data.path] })
      setActiveTab('view')
      setMenuOpen(false)
    },
  })

  const mergeCommitMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!mergePreview || !noteQuery.data) {
        return
      }

      const result = await commitMerge(noteQuery.data.path, content, mergePreview.remoteVersionToken)
      if (result.status === 409) {
        const preview = await fetchMergePreview(noteQuery.data.path, noteQuery.data.content, content)
        setMergePreview(preview)
        return
      }

      setMergePreview(null)
      await queryClient.invalidateQueries({ queryKey: ['note', noteQuery.data.path] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!noteQuery.data) {
        return
      }

      const uploaded = await uploadAttachment(noteQuery.data.path, file)
      setDraft((current) => `${current}\n${uploaded.markdownLink}\n`)
      return uploaded
    },
  })

  const noteMeta = useMemo(() => {
    return {
      changedExternally: noteStatusQuery.data?.changedSinceClientVersion ?? false,
      dirty: noteQuery.data ? draft !== noteQuery.data.content : false,
    }
  }, [draft, noteQuery.data, noteStatusQuery.data?.changedSinceClientVersion])

  if (sessionQuery.isLoading || sessionQuery.data?.isAuthenticated === false) {
    return null
  }

  const activePath = search.path

  const headerTitle = (() => {
    switch (activeTab) {
      case 'vault':
        return 'Pyrite'
      case 'view':
        return noteQuery.data?.title ?? 'View'
      case 'edit':
        return noteQuery.data ? 'Editing' : 'Edit'
      case 'search':
        return 'Search'
    }
  })()

  function selectNote(path: string) {
    setMenuOpen(false)
    void navigate({ to: '/', search: (current) => ({ ...current, path }) })
  }

  const renderMenuButton = (tab: 'view' | 'edit') => (
    <div className="relative">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-[var(--ink-light)] transition-colors hover:bg-[rgba(44,24,16,0.06)]"
        data-testid="note-menu-button"
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
      >
        <MoreVertical size={18} />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-25 mt-1.5 flex min-w-48 flex-col rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-[var(--parchment)] p-1 shadow-[var(--paper-shadow-lg)]"
          onClick={() => setMenuOpen(false)}
        >
          {tab === 'view' ? (
            <button
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]"
              type="button"
              onClick={() => setActiveTab('edit')}
            >
              <Pencil size={16} />
              Edit
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]"
              type="button"
              onClick={() => setActiveTab('view')}
            >
              <FileText size={16} />
              View
            </button>
          )}
          <label className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]">
            <FileUp size={16} />
            Upload
            <input
              hidden
              data-testid="attachment-input"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  uploadMutation.mutate(file)
                }
              }}
            />
          </label>
          <div className="my-1 h-px bg-[var(--line)]" />
          <button
            className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]"
            data-testid="menu-logout-button"
            type="button"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      <main className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(210,166,121,0.18),transparent_42%),linear-gradient(180deg,var(--parchment),var(--parchment-dark))] text-[var(--ink)]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-[rgba(250,246,241,0.88)] px-3 py-2 backdrop-blur-sm">
          <h1
            className="font-['Newsreader'] text-[1.15rem] font-semibold"
            data-testid={activeTab === 'view' || activeTab === 'edit' ? 'note-title' : undefined}
          >
            {headerTitle}
          </h1>
          <div className="flex items-center gap-1">
            {(activeTab === 'view' || activeTab === 'edit') && noteQuery.data ? (
              <>
                {activeTab === 'edit' ? (
                  <button
                    className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 text-sm text-[var(--parchment)] shadow-[var(--paper-shadow)] transition-colors hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="edit-save-button"
                    type="button"
                    disabled={!noteMeta.dirty || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    <Save size={16} />
                    Save
                  </button>
                ) : null}
                {renderMenuButton(activeTab)}
              </>
            ) : (
              <button
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-[var(--ink-light)] transition-colors hover:bg-[rgba(44,24,16,0.06)]"
                data-testid="header-logout-button"
                type="button"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="pb-[76px]">
          <div className={activeTab === 'vault' ? 'block' : 'hidden'}>
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
                  value={search.q ?? ''}
                  onChange={(event) => {
                    navigate({
                      to: '/',
                      search: (current) => ({ ...current, q: event.target.value || undefined }),
                      replace: true,
                    })
                    if (event.target.value) {
                      setActiveTab('search')
                    }
                  }}
                />
              </div>
            </div>
            <div className="px-2" data-testid="vault-tree-panel">
              <VaultTree nodes={treeQuery.data ?? []} activePath={activePath} onSelect={selectNote} />
            </div>
          </div>

          <div className={activeTab === 'view' ? 'block' : 'hidden'}>
            {noteMeta.changedExternally ? (
              <div
                className="border-b border-[rgba(139,69,19,0.24)] bg-[rgba(210,166,121,0.18)] px-4 py-2 text-sm"
                data-testid="external-change-banner"
              >
                File changed on disk. Review a merge before committing.
              </div>
            ) : null}

            {noteQuery.data ? (
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
            ) : (
              <div className="grid min-h-[50svh] place-items-center px-4 text-center text-[var(--ink-muted)]">
                <div>
                  <h2 className="font-['Newsreader'] text-xl">Open a note</h2>
                  <p className={`mt-1 ${noteSubtitleClass}`}>Browse the vault or search to start reading.</p>
                </div>
              </div>
            )}
          </div>

          <div className={activeTab === 'edit' ? 'block' : 'hidden'}>
            {noteQuery.data ? (
              <>
                <div className="border-b border-[var(--line)] px-4 py-2">
                  <p className={noteSubtitleClass}>
                    {noteQuery.data.path}{noteMeta.dirty ? ' *' : ''}
                  </p>
                </div>
                <CodeMirror value={draft} height="calc(100svh - 140px)" extensions={[markdown()]} onChange={setDraft} />
              </>
            ) : (
              <div className="grid min-h-[50svh] place-items-center px-4 text-center text-[var(--ink-muted)]">
                <div>
                  <h2 className="font-['Newsreader'] text-xl">No note selected</h2>
                  <p className={`mt-1 ${noteSubtitleClass}`}>Open a note from the vault first.</p>
                </div>
              </div>
            )}
          </div>

          <div className={activeTab === 'search' ? 'block' : 'hidden'}>
            <div className="px-4 py-2">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                />
                <input
                  className="min-h-10 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--parchment-dark)] px-3 py-2 pl-9 text-[0.9rem] outline-none transition-shadow placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-pale)] focus:shadow-[0_0_0_3px_rgba(210,166,121,0.25)]"
                  placeholder="Search vault..."
                  value={search.q ?? ''}
                  onChange={(event) =>
                    navigate({
                      to: '/',
                      search: (current) => ({ ...current, q: event.target.value || undefined }),
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
                      activePath === result.path ? 'bg-[rgba(210,166,121,0.18)]' : '',
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
            ) : search.q ? (
              <p className={`px-4 py-4 ${noteSubtitleClass}`}>No results</p>
            ) : null}
          </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--line)] bg-[rgba(250,246,241,0.92)] px-1 py-1.5 backdrop-blur-sm">
          {([
            { key: 'vault', label: 'Vault', icon: Folder },
            { key: 'view', label: 'View', icon: FileText },
            { key: 'edit', label: 'Edit', icon: Pencil },
            { key: 'search', label: 'Search', icon: Search },
          ] as const).map(({ key, label, icon: Icon }) => {
            const active = activeTab === key

            return (
              <button
                key={key}
                className={[
                  navButtonBaseClass,
                  active ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]',
                ].join(' ')}
                type="button"
                onClick={() => setActiveTab(key)}
              >
                <Icon size={22} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </main>

      {mergePreview ? (
        <MergeReviewDialog
          preview={mergePreview}
          isSubmitting={mergeCommitMutation.isPending}
          onClose={() => setMergePreview(null)}
          onCommit={(content) => mergeCommitMutation.mutate(content)}
        />
      ) : null}
    </>
  )
}
