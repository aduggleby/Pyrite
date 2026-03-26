import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const navigateMock = vi.fn()
const loginMock = vi.fn()
const developmentLoginMock = vi.fn()
const setQueryDataMock = vi.fn()
const invalidateQueriesMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: setQueryDataMock,
      invalidateQueries: invalidateQueriesMock,
    }),
    useMutation: ({ mutationFn, onSuccess }: { mutationFn: () => Promise<unknown>; onSuccess?: (value: unknown) => void | Promise<void> }) => ({
      isPending: false,
      isError: false,
      mutate: async () => {
        const result = await mutationFn()
        await onSuccess?.(result)
      },
    }),
  }
})

vi.mock('../lib/api', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  developmentLogin: () => developmentLoginMock(),
}))

describe('LoginPage', () => {
  it('submits credentials and navigates after success', async () => {
    loginMock.mockResolvedValue({ isAuthenticated: true, username: 'alex' })

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('Enter username'), { target: { value: 'alex' } })
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('alex', 'password')
      expect(navigateMock).toHaveBeenCalled()
    })
  })
})
