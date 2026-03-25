import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { FileUp, LogOut, Save, Search } from 'lucide-react'
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

type EditorMode = 'edit' | 'preview'

export function VaultPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/' })
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<EditorMode>('edit')
  const [draft, setDraft] = useState('')
  const [mergePreview, setMergePreview] = useState<MergePreviewResponse | null>(null)

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

  return (
    <>
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div>
              <h1>Pyrite</h1>
              <p>{sessionQuery.data?.username ?? 'Vault'}</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => logoutMutation.mutate()}>
              <LogOut size={16} />
            </button>
          </div>

          <section className="search-card">
            <label htmlFor="search" className="note-subtitle" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Search the vault
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#8b7355' }} />
              <input
                id="search"
                className="search-input"
                style={{ paddingLeft: '2.6rem' }}
                placeholder="Files, text, tags..."
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
            {searchQuery.data?.results.length ? (
              <div className="search-results">
                {searchQuery.data.results.map((result) => (
                  <button
                    key={result.path}
                    className={`result-button ${activePath === result.path ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => navigate({ to: '/', search: (current) => ({ ...current, path: result.path }) })}
                  >
                    <strong>{result.title}</strong>
                    <div className="note-subtitle">{result.snippet}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="tree-card">
            <div className="note-subtitle">Vault browser</div>
            <VaultTree
              nodes={treeQuery.data ?? []}
              activePath={activePath}
              onSelect={(path) => navigate({ to: '/', search: (current) => ({ ...current, path }) })}
            />
          </section>
        </aside>

        <section className="main-panel">
          {noteMeta.changedExternally ? (
            <div className="status-banner">
              <span>The file changed on disk since you opened it. Review a merge before committing.</span>
            </div>
          ) : null}

          {noteQuery.data ? (
            <article className="note-card">
              <header className="note-header">
                <div>
                  <h2 className="note-title">{noteQuery.data.title}</h2>
                  <p className="note-subtitle">
                    {noteQuery.data.path} · version {noteQuery.data.versionToken.slice(0, 12)}
                  </p>
                </div>

                <div className="toolbar">
                  <div className="tabs">
                    <button className={`tab-button ${mode === 'edit' ? 'is-active' : ''}`} type="button" onClick={() => setMode('edit')}>
                      Edit
                    </button>
                    <button className={`tab-button ${mode === 'preview' ? 'is-active' : ''}`} type="button" onClick={() => setMode('preview')}>
                      Preview
                    </button>
                  </div>
                  <label className="secondary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileUp size={16} />
                    Upload
                    <input
                      hidden
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          uploadMutation.mutate(file)
                        }
                      }}
                    />
                  </label>
                  <button className="primary-button" type="button" disabled={!noteMeta.dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                    <Save size={16} style={{ marginRight: '0.45rem' }} />
                    Save
                  </button>
                </div>
              </header>

              {mode === 'edit' ? (
                <div className="editor-panel">
                  <CodeMirror value={draft} height="460px" extensions={[markdown()]} onChange={setDraft} />
                </div>
              ) : (
                <div
                  className="preview-panel"
                  onClick={(event) => {
                    const target = event.target as HTMLElement
                    const anchor = target.closest('a')
                    const href = anchor?.getAttribute('href')
                    if (href?.startsWith('/notes/')) {
                      event.preventDefault()
                      const decoded = decodeURIComponent(href.replace('/notes/', ''))
                      void navigate({ to: '/', search: (current) => ({ ...current, path: decoded }) })
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: noteQuery.data.previewHtml }}
                />
              )}

              <section className="meta-grid">
                <div className="meta-card">
                  <h3>Wikilinks</h3>
                  <div className="meta-list">
                    {noteQuery.data.wikilinks.map((link) => (
                      <button
                        key={`${link.label}-${link.target}`}
                        className="result-button"
                        type="button"
                        onClick={() => link.resolvedPath && navigate({ to: '/', search: (current) => ({ ...current, path: link.resolvedPath ?? undefined }) })}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="meta-card">
                  <h3>Backlinks</h3>
                  <div className="meta-list">
                    {noteQuery.data.backlinks.map((link) => (
                      <button
                        key={link.path}
                        className="result-button"
                        type="button"
                        onClick={() => navigate({ to: '/', search: (current) => ({ ...current, path: link.path }) })}
                      >
                        <strong>{link.title}</strong>
                        <div className="note-subtitle">{link.snippet}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="meta-card">
                  <h3>Tags & tasks</h3>
                  <div className="meta-list">
                    <div>
                      {noteQuery.data.tags.map((tag) => (
                        <span key={tag.value} className="pill" style={{ marginRight: '0.4rem', marginBottom: '0.4rem' }}>
                          #{tag.value}
                        </span>
                      ))}
                    </div>
                    {noteQuery.data.tasks.map((task) => (
                      <span key={task.text} className="pill">
                        {task.isCompleted ? 'Done' : 'Open'} · {task.text}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            </article>
          ) : (
            <section className="note-card empty-state">
              <div>
                <h2 className="note-title">Open a note</h2>
                <p className="note-subtitle">
                  Browse the tree, run a vault search, or follow a backlink to start editing.
                </p>
              </div>
            </section>
          )}
        </section>
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
