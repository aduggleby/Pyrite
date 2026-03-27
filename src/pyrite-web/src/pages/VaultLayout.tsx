import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useMatchRoute, useNavigate } from '@tanstack/react-router'
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
  uploadAttachment,
} from '../lib/api'
import { MergeReviewDialog } from '../components/MergeReviewDialog'
import type { MergePreviewResponse } from '../types'

const navButtonBaseClass =
  'flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] transition-colors'

interface VaultContext {
  notePath: string | undefined
  searchText: string | undefined
  noteQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchNote>>>>
  noteStatusQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchNoteStatus>>>>
  treeQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof fetchVaultTree>>>>
  revealFolderRequest: { path: string; key: number } | null
  draft: string
  setDraft: (value: string | ((prev: string) => string)) => void
  noteMeta: { changedExternally: boolean; dirty: boolean }
  selectNote: (path: string) => void
  revealFolder: (path: string) => void
  toggleTask: (taskIndex: number, isCompleted: boolean) => void
  isTaskTogglePending: boolean
  uploadMutation: ReturnType<typeof useMutation>
}

const VaultCtx = createContext<VaultContext>(null!)
export const useVault = () => useContext(VaultCtx)

export function VaultLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const matchRoute = useMatchRoute()
  const [draft, setDraft] = useState('')
  const [mergePreview, setMergePreview] = useState<MergePreviewResponse | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [revealFolderRequest, setRevealFolderRequest] = useState<{ path: string; key: number } | null>(null)

  const viewWithPathMatch = matchRoute({ to: '/view/$notePath', fuzzy: false })
  const editWithPathMatch = matchRoute({ to: '/edit/$notePath', fuzzy: false })
  const searchWithQueryMatch = matchRoute({ to: '/search/$query', fuzzy: false })

  const currentNotePath =
    (viewWithPathMatch ? viewWithPathMatch.notePath : undefined)
    ?? (editWithPathMatch ? editWithPathMatch.notePath : undefined)
  const currentSearchText = searchWithQueryMatch ? searchWithQueryMatch.query : undefined

  const activeTab = (() => {
    if (matchRoute({ to: '/view', fuzzy: false }) || viewWithPathMatch) return 'view' as const
    if (matchRoute({ to: '/edit', fuzzy: false }) || editWithPathMatch) return 'edit' as const
    if (matchRoute({ to: '/search', fuzzy: false }) || searchWithQueryMatch) return 'search' as const
    return 'vault' as const
  })()

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
    queryKey: ['note', currentNotePath],
    queryFn: () => fetchNote(currentNotePath!),
    enabled: Boolean(currentNotePath && sessionQuery.data?.isAuthenticated),
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
      await persistNoteContent(draft, () => {
        setMenuOpen(false)
        void navigate({ to: '/view/$notePath', params: { notePath: noteQuery.data!.path } })
      })
    },
  })

  const taskToggleMutation = useMutation({
    mutationFn: async ({ taskIndex, isCompleted }: { taskIndex: number; isCompleted: boolean }) => {
      if (!noteQuery.data) {
        return
      }

      const updatedContent = toggleTaskAtIndex(noteQuery.data.content, taskIndex, isCompleted)
      if (updatedContent === noteQuery.data.content) {
        return
      }

      setDraft(updatedContent)
      await persistNoteContent(updatedContent)
    },
  })

  const mergeCommitMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!mergePreview || !noteQuery.data) return

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
      if (!noteQuery.data) return
      const uploaded = await uploadAttachment(noteQuery.data.path, file)
      setDraft((current) => `${current}\n${uploaded.markdownLink}\n`)
      return uploaded
    },
  })

  const noteMeta = useMemo(() => ({
    changedExternally: noteStatusQuery.data?.changedSinceClientVersion ?? false,
    dirty: noteQuery.data ? draft !== noteQuery.data.content : false,
  }), [draft, noteQuery.data, noteStatusQuery.data?.changedSinceClientVersion])

  if (sessionQuery.isLoading || sessionQuery.data?.isAuthenticated === false) {
    return null
  }

  function selectNote(path: string) {
    setMenuOpen(false)
    void navigate({ to: '/view/$notePath', params: { notePath: path } })
  }

  function revealFolder(path: string) {
    setMenuOpen(false)
    setRevealFolderRequest({ path, key: Date.now() })
    void navigate({ to: '/' })
  }

  async function persistNoteContent(content: string, onSuccess?: () => void) {
    if (!noteQuery.data) {
      return
    }

    const result = await saveNote(noteQuery.data.path, content, noteQuery.data.versionToken)
    if (result.status === 409) {
      const preview = await fetchMergePreview(noteQuery.data.path, noteQuery.data.content, content)
      setMergePreview(preview)
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['note', noteQuery.data.path] })
    await queryClient.invalidateQueries({ queryKey: ['note-status', noteQuery.data.path] })
    onSuccess?.()
  }

  const headerTitle = (() => {
    switch (activeTab) {
      case 'vault': return 'Pyrite'
      case 'view': return noteQuery.data?.path ?? 'View'
      case 'edit': return noteQuery.data?.path ?? 'Edit'
      case 'search': return 'Search'
    }
  })()

  const renderMenuButton = (tab: 'view' | 'edit') => (
    <div className="relative">
      <button
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-[var(--ink-light)] transition-colors hover:bg-[rgba(44,24,16,0.06)]"
        data-testid="note-menu-button"
        type="button"
        onClick={() => setMenuOpen((c) => !c)}
      >
        <MoreVertical size={18} />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-25 mt-1.5 flex min-w-48 flex-col rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-[var(--parchment)] p-1 shadow-[var(--paper-shadow-lg)]"
          data-testid="note-menu-panel"
          onClick={() => setMenuOpen(false)}
        >
          {tab === 'edit' ? (
            <button
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]"
              type="button"
              onClick={() =>
                currentNotePath
                  ? navigate({ to: '/view/$notePath', params: { notePath: currentNotePath } })
                  : navigate({ to: '/view' })
              }
              >
                <FileText size={16} />
                View
              </button>
          ) : null}
          <label className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(210,166,121,0.18)]">
            <FileUp size={16} />
            Upload
            <input
              hidden
              data-testid="attachment-input"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadMutation.mutate(file)
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

  const ctx: VaultContext = {
    notePath: currentNotePath,
    searchText: currentSearchText,
    noteQuery: noteQuery as VaultContext['noteQuery'],
    noteStatusQuery: noteStatusQuery as VaultContext['noteStatusQuery'],
    treeQuery: treeQuery as VaultContext['treeQuery'],
    revealFolderRequest,
    draft,
    setDraft,
    noteMeta,
    selectNote,
    revealFolder,
    toggleTask: (taskIndex, isCompleted) => taskToggleMutation.mutate({ taskIndex, isCompleted }),
    isTaskTogglePending: taskToggleMutation.isPending,
    uploadMutation: uploadMutation as VaultContext['uploadMutation'],
  }

  return (
    <>
      <VaultCtx.Provider value={ctx}>
        <main className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(210,166,121,0.18),transparent_42%),linear-gradient(180deg,var(--parchment),var(--parchment-dark))] text-[var(--ink)]">
          <header className="sticky top-0 z-20 flex items-center border-b border-[var(--line)] bg-[rgba(250,246,241,0.88)] px-3 py-2 backdrop-blur-sm">
            <h1
              className="flex min-w-0 flex-1 justify-end overflow-hidden pr-3 font-['Newsreader'] text-[1.05rem] font-semibold leading-tight text-right"
              data-testid={activeTab === 'view' || activeTab === 'edit' ? 'note-title' : undefined}
            >
              {activeTab === 'view' || activeTab === 'edit'
                ? renderHeaderBreadcrumbs(headerTitle, revealFolder)
                : headerTitle}
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              {(activeTab === 'view' || activeTab === 'edit') && noteQuery.data ? (
                <>
                  {activeTab === 'view' ? (
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-3 py-2 text-sm text-[var(--parchment)] shadow-[var(--paper-shadow)] transition-colors hover:bg-[var(--accent-light)]"
                      data-testid="view-edit-button"
                      type="button"
                      onClick={() =>
                        currentNotePath
                          ? navigate({ to: '/edit/$notePath', params: { notePath: currentNotePath } })
                          : navigate({ to: '/edit' })
                      }
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  ) : null}
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
            <Outlet />
          </div>

          <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-[var(--line)] bg-[rgba(250,246,241,0.92)] px-1 py-1.5 backdrop-blur-sm">
            <button
              className={[navButtonBaseClass, activeTab === 'vault' ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'].join(' ')}
              type="button"
              onClick={() => navigate({ to: '/' })}
            >
              <Folder size={22} />
              <span>Vault</span>
            </button>
            <button
              className={[navButtonBaseClass, activeTab === 'view' ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'].join(' ')}
              type="button"
              onClick={() =>
                currentNotePath
                  ? navigate({ to: '/view/$notePath', params: { notePath: currentNotePath } })
                  : navigate({ to: '/view' })
              }
            >
              <FileText size={22} />
              <span>View</span>
            </button>
            <button
              className={[navButtonBaseClass, activeTab === 'edit' ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'].join(' ')}
              type="button"
              onClick={() =>
                currentNotePath
                  ? navigate({ to: '/edit/$notePath', params: { notePath: currentNotePath } })
                  : navigate({ to: '/edit' })
              }
            >
              <Pencil size={22} />
              <span>Edit</span>
            </button>
            <button
              className={[navButtonBaseClass, activeTab === 'search' ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'].join(' ')}
              type="button"
              onClick={() =>
                currentSearchText
                  ? navigate({ to: '/search/$query', params: { query: currentSearchText } })
                  : navigate({ to: '/search' })
              }
            >
              <Search size={22} />
              <span>Search</span>
            </button>
          </nav>
        </main>
      </VaultCtx.Provider>

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

function toggleTaskAtIndex(content: string, taskIndex: number, isCompleted: boolean) {
  let currentIndex = -1

  return content.replace(/(^\s*[-*]\s+\[)([ xX])(\]\s+.+$)/gm, (match, prefix: string, _state: string, suffix: string) => {
    currentIndex += 1

    if (currentIndex !== taskIndex) {
      return match
    }

    return `${prefix}${isCompleted ? 'x' : ' '}${suffix}`
  })
}

function renderHeaderBreadcrumbs(notePath: string, onRevealFolder: (path: string) => void) {
  const segments = notePath.split('/').filter(Boolean)

  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1
    const folderPath = segments.slice(0, index + 1).join('/')
    const label = isLast ? segment.replace(/\.md$/i, '') : segment

    return (
      <span key={folderPath} className="shrink-0 whitespace-nowrap">
        {index > 0 ? <span className="mx-1.5 text-[var(--ink-muted)]">/</span> : null}
        {isLast ? (
          <span>{label}</span>
        ) : (
          <button
            className="rounded-[var(--radius)] text-[var(--accent)] transition-colors hover:text-[var(--accent-light)]"
            type="button"
            onClick={() => onRevealFolder(folderPath)}
          >
            {label}
          </button>
        )}
      </span>
    )
  })
}
