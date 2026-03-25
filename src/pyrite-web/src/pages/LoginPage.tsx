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
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,rgba(210,166,121,0.28),transparent_42%),linear-gradient(180deg,var(--parchment),var(--parchment-dark))] px-4 py-6 text-[var(--ink)]">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-md items-center">
        <section className="w-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-5 shadow-[var(--paper-shadow-lg)] backdrop-blur-sm">
          <div className="mb-6">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--ink-muted)]">Duck vault editor</p>
            <h1 className="mt-3 font-['Newsreader'] text-4xl leading-none">Pyrite</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
              Mobile-first editing for the markdown vault already living on your TrueNAS box.
            </p>
          </div>

          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              loginMutation.mutate()
            }}
          >
            <input
              className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--parchment-dark)] px-3 py-2 text-[0.95rem] text-[var(--ink)] outline-none transition-shadow placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-pale)] focus:shadow-[0_0_0_3px_rgba(210,166,121,0.25)]"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <input
              className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--parchment-dark)] px-3 py-2 text-[0.95rem] text-[var(--ink)] outline-none transition-shadow placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-pale)] focus:shadow-[0_0_0_3px_rgba(210,166,121,0.25)]"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="min-h-11 rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm text-[var(--parchment)] shadow-[var(--paper-shadow)] transition-colors hover:bg-[var(--accent-light)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loginMutation.isPending}
            >
              Log In
            </button>
            {import.meta.env.DEV ? (
              <button
                className="min-h-11 rounded-[var(--radius)] border border-[var(--line)] bg-[rgba(255,255,255,0.56)] px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.82)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={developmentLoginMutation.isPending}
                onClick={() => developmentLoginMutation.mutate()}
              >
                Use Development Login
              </button>
            ) : null}
            {loginMutation.isError ? (
              <p className="text-xs leading-5 text-[var(--ink-muted)]">Login failed. Check the credentials and server setup.</p>
            ) : null}
            {developmentLoginMutation.isError ? (
              <p className="text-xs leading-5 text-[var(--ink-muted)]">Development login is only available in development.</p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  )
}
