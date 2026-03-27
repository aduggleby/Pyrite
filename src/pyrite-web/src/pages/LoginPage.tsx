import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { developmentLogin, login } from '../lib/api'

const appVersion = __APP_VERSION__

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async (session) => {
      queryClient.setQueryData(['session'], session)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      void navigate({ to: '/' })
    },
  })

  const developmentLoginMutation = useMutation({
    mutationFn: developmentLogin,
    onSuccess: async (session) => {
      queryClient.setQueryData(['session'], session)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      void navigate({ to: '/' })
    },
  })

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-8 text-[var(--ink)]">
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
            <div className="relative">
              <input
                className="w-full border-0 border-b border-[var(--line-strong)] bg-transparent px-0 py-2 pr-18 text-[1rem] text-[var(--ink)] outline-none transition-all placeholder:text-[var(--accent-pale)] focus:border-[var(--accent)]"
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="absolute right-0 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius)] text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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

        <p className="mt-8 text-center text-[0.7rem] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
          Version {appVersion}
        </p>
      </div>
    </main>
  )
}
