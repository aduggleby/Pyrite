import { RouterProvider, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './pages/LoginPage'
import { VaultLayout } from './pages/VaultLayout'
import { VaultBrowser } from './pages/VaultBrowser'
import { NoteView } from './pages/NoteView'
import { NoteEdit } from './pages/NoteEdit'
import { SearchView } from './pages/SearchView'

const queryClient = new QueryClient()

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const vaultLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'vault',
  component: VaultLayout,
})

const vaultRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/',
  component: VaultBrowser,
})

const viewRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/view',
  component: NoteView,
})

const viewWithPathRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/view/$notePath',
  component: NoteView,
})

const editRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/edit',
  component: NoteEdit,
})

const editWithPathRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/edit/$notePath',
  component: NoteEdit,
})

const searchRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/search',
  component: SearchView,
})

const searchWithQueryRoute = createRoute({
  getParentRoute: () => vaultLayout,
  path: '/search/$query',
  component: SearchView,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  vaultLayout.addChildren([vaultRoute, viewRoute, viewWithPathRoute, editRoute, editWithPathRoute, searchRoute, searchWithQueryRoute]),
])

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
