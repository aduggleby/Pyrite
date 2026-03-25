import type {
  AntiforgeryTokenResponse,
  AttachmentUploadResponse,
  MergePreviewResponse,
  NoteResponse,
  NoteStatusResponse,
  SaveNoteResponse,
  SearchResponse,
  SessionResponse,
  VaultNodeDto,
} from '../types'

let csrfToken: string | null = null

function encodeVaultPath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function request<T>(path: string, init?: RequestInit, unsafe = false): Promise<T> {
  if (unsafe && !csrfToken) {
    const token = await fetchAntiforgeryToken()
    csrfToken = token.requestToken
  }

  const headers = new Headers(init?.headers)

  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (unsafe && csrfToken) {
    headers.set('X-PYRITE-CSRF', csrfToken)
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function fetchSession() {
  return request<SessionResponse>('/api/auth/session')
}

export async function login(username: string, password: string) {
  const response = await request<SessionResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
  )

  const token = await fetchAntiforgeryToken()
  csrfToken = token.requestToken
  return response
}

export async function developmentLogin() {
  const response = await request<SessionResponse>(
    '/api/auth/dev-login',
    {
      method: 'POST',
    },
  )

  const token = await fetchAntiforgeryToken()
  csrfToken = token.requestToken
  return response
}

export async function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' }, true)
}

export async function fetchAntiforgeryToken() {
  return request<AntiforgeryTokenResponse>('/api/security/antiforgery-token')
}

export async function fetchVaultTree() {
  return request<VaultNodeDto[]>('/api/vault/tree')
}

export async function fetchNote(path: string) {
  return request<NoteResponse>(`/api/notes/${encodeVaultPath(path)}`)
}

export async function fetchNoteStatus(path: string, clientVersion?: string) {
  const suffix = clientVersion ? `?clientVersion=${encodeURIComponent(clientVersion)}` : ''
  return request<NoteStatusResponse>(`/api/notes/status/${encodeVaultPath(path)}${suffix}`)
}

export async function saveNote(path: string, content: string, expectedVersionToken: string) {
  const response = await fetch(`/api/notes/${encodeVaultPath(path)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-PYRITE-CSRF': csrfToken } : {}),
    },
    body: JSON.stringify({ content, expectedVersionToken }),
  })

  const payload = (await response.json()) as SaveNoteResponse
  if (!response.ok && response.status !== 409) {
    throw new Error('Unable to save note.')
  }

  return { status: response.status, payload }
}

export async function fetchMergePreview(path: string, baseContent: string, localContent: string) {
  return request<MergePreviewResponse>(
    `/api/notes/merge-preview/${encodeVaultPath(path)}`,
    {
      method: 'POST',
      body: JSON.stringify({ baseContent, localContent }),
    },
    true,
  )
}

export async function commitMerge(path: string, content: string, remoteVersionToken: string) {
  const response = await fetch(`/api/notes/merge-commit/${encodeVaultPath(path)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-PYRITE-CSRF': csrfToken } : {}),
    },
    body: JSON.stringify({ content, remoteVersionToken }),
  })

  const payload = (await response.json()) as SaveNoteResponse
  if (!response.ok && response.status !== 409) {
    throw new Error('Unable to commit merge.')
  }

  return { status: response.status, payload }
}

export async function uploadAttachment(path: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<AttachmentUploadResponse>(
    `/api/notes/attachments/${encodeVaultPath(path)}`,
    {
      method: 'POST',
      headers: csrfToken ? { 'X-PYRITE-CSRF': csrfToken } : undefined,
      body: formData,
    },
    true,
  )
}

export async function searchNotes(query: string) {
  return request<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
}
