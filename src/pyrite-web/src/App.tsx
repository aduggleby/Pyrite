import { RouterProvider, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { z } from 'zod'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './pages/LoginPage'
import { VaultPage } from './pages/VaultPage'

const queryClient = new QueryClient()

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const vaultSearchSchema = z.object({
  path: z.string().optional(),
  q: z.string().optional(),
})

const vaultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: vaultSearchSchema,
  component: VaultPage,
})

const routeTree = rootRoute.addChildren([loginRoute, vaultRoute])

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
