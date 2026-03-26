import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { developmentLogin, login } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: () => {
      void navigate({ to: '/' })
    },
  })

  const developmentLoginMutation = useMutation({
    mutationFn: developmentLogin,
    onSuccess: () => {
      void navigate({ to: '/' })
    },
  })

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-8 text-[var(--ink)]">
      {/* Layered parchment background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(210,166,121,0.22) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(139,69,19,0.08) 0%, transparent 45%),
            linear-gradient(180deg, var(--parchment-deeper) 0%, var(--parchment) 40%, var(--parchment-dark) 100%)
          `,
        }}
      />

      {/* Ruled lines — faint notebook feel */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--ink) 31px, var(--ink) 32px)',
        backgroundPosition: '0 14px',
      }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[320px]">
        {/* Crystal icon */}
        <div className="mb-6 flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-60"
          >
            <polygon points="12,2 20,8 20,16 12,22 4,16 4,8" />
            <line x1="12" y1="2" x2="12" y2="22" opacity="0.3" />
            <line x1="4" y1="8" x2="20" y2="16" opacity="0.3" />
            <line x1="20" y1="8" x2="4" y2="16" opacity="0.3" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-center font-['Newsreader'] text-[2.8rem] font-light leading-none tracking-tight text-[var(--ink)]"
        >
          Pyrite
        </h1>
        <p className="mt-2 text-center text-[0.78rem] tracking-[0.18em] text-[var(--ink-muted)]">
          ONLINE MARKDOWN EDITOR
        </p>

        {/* Ornamental divider */}
        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--accent-pale)] opacity-40" />
          <div className="h-1 w-1 rounded-full bg-[var(--accent-pale)] opacity-60" />
          <div className="h-px flex-1 bg-[var(--accent-pale)] opacity-40" />
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            loginMutation.mutate()
          }}
        >
          <div className="group">
            <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Username
            </label>
            <input
              className="w-full border-0 border-b border-[var(--line-strong)] bg-transparent px-0 py-2 text-[1rem] text-[var(--ink)] outline-none transition-all placeholder:text-[var(--accent-pale)] focus:border-[var(--accent)]"
              placeholder="Enter username"
              value={username}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="group">
            <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Password
            </label>
            <input
              className="w-full border-0 border-b border-[var(--line-strong)] bg-transparent px-0 py-2 text-[1rem] text-[var(--ink)] outline-none transition-all placeholder:text-[var(--accent-pale)] focus:border-[var(--accent)]"
              placeholder="Enter password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button
            className="mt-3 min-h-11 w-full rounded-[var(--radius)] bg-[var(--ink)] px-4 py-2.5 text-[0.88rem] tracking-[0.06em] text-[var(--parchment)] transition-all hover:bg-[var(--ink-light)] disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
          </button>

          {import.meta.env.DEV ? (
            <button
              className="min-h-10 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-transparent px-4 py-2 text-[0.82rem] text-[var(--ink-muted)] transition-all hover:border-[var(--accent-pale)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={developmentLoginMutation.isPending}
              onClick={() => developmentLoginMutation.mutate()}
            >
              Development Login
            </button>
          ) : null}

          {loginMutation.isError ? (
            <p className="text-center text-xs leading-5 text-[var(--accent)]">
              Login failed. Check your credentials.
            </p>
          ) : null}
          {developmentLoginMutation.isError ? (
            <p className="text-center text-xs leading-5 text-[var(--accent)]">
              Development login is only available in development.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  )
}
