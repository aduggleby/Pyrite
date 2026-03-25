import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { login } from '../lib/api'

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

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <h1>Pyrite</h1>
        <p className="note-subtitle">
          Mobile-first editing for the markdown vault already living on your TrueNAS box.
        </p>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            loginMutation.mutate()
          }}
        >
          <input className="auth-input" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <input
            className="auth-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="primary-button" type="submit" disabled={loginMutation.isPending}>
            Log In
          </button>
          {loginMutation.isError ? <p className="note-subtitle">The configured credentials did not match.</p> : null}
        </form>
      </section>
    </main>
  )
}
