import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const navigateMock = vi.fn()
const loginMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useMutation: ({ mutationFn, onSuccess }: { mutationFn: () => Promise<unknown>; onSuccess?: () => void }) => ({
      isPending: false,
      isError: false,
      mutate: async () => {
        await mutationFn()
        onSuccess?.()
      },
    }),
  }
})

vi.mock('../lib/api', () => ({
  login: (...args: unknown[]) => loginMock(...args),
}))

describe('LoginPage', () => {
  it('submits credentials and navigates after success', async () => {
    loginMock.mockResolvedValue({ isAuthenticated: true, username: 'alex' })

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alex' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('alex', 'password')
      expect(navigateMock).toHaveBeenCalled()
    })
  })
})
