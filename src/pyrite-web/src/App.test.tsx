import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/api', () => ({
  fetchSession: async () => ({ isAuthenticated: false, username: null }),
  login: vi.fn(),
  developmentLogin: vi.fn(),
}))

describe('App routing', () => {
  it('renders the login route at /login', async () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Log In' })).toBeInTheDocument()
  })
})
