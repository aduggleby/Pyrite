export interface SessionResponse {
  isAuthenticated: boolean
  username?: string | null
}

export interface AntiforgeryTokenResponse {
  requestToken: string
}

export interface VaultNodeDto {
  name: string
  path: string
  isDirectory: boolean
  children: VaultNodeDto[]
}

export interface WikilinkDto {
  label: string
  target: string
  resolvedPath?: string | null
}

export interface TagDto {
  value: string
}

export interface BacklinkDto {
  path: string
  title: string
  snippet: string
}

export interface TaskItemDto {
  text: string
  isCompleted: boolean
}

export interface NoteResponse {
  path: string
  title: string
  content: string
  versionToken: string
  previewHtml: string
  wikilinks: WikilinkDto[]
  tags: TagDto[]
  backlinks: BacklinkDto[]
  tasks: TaskItemDto[]
}

export interface SaveNoteRequest {
  content: string
  expectedVersionToken: string
}

export interface SaveNoteResponse {
  saved: boolean
  versionToken: string
  requiresMerge: boolean
}

export interface NoteStatusResponse {
  path: string
  versionToken: string
  changedSinceClientVersion: boolean
}

export interface MergeConflictDto {
  index: number
  base: string
  local: string
  remote: string
}

export interface MergePreviewResponse {
  path: string
  remoteVersionToken: string
  remoteContent: string
  mergedContent: string
  hasConflicts: boolean
  conflicts: MergeConflictDto[]
}

export interface AttachmentUploadResponse {
  fileName: string
  vaultPath: string
  markdownLink: string
  sizeBytes: number
}

export interface SearchResultDto {
  path: string
  title: string
  snippet: string
}

export interface SearchResponse {
  query: string
  results: SearchResultDto[]
}
