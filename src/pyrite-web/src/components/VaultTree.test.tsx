import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VaultTree } from './VaultTree'

afterEach(() => {
  cleanup()
})

describe('VaultTree', () => {
  it('expands and scrolls to a requested folder', async () => {
    const onSelect = vi.fn()
    const scrollIntoView = vi.fn()

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {},
      },
    })

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    const nodes = [
      {
        name: '01-Species',
        path: '01-Species',
        isDirectory: true,
        children: [
          {
            name: 'dabbling',
            path: '01-Species/dabbling',
            isDirectory: true,
            children: [
              {
                name: 'american-wigeon.md',
                path: '01-Species/dabbling/american-wigeon.md',
                isDirectory: false,
                children: [],
              },
            ],
          },
        ],
      },
    ]

    const { rerender } = render(<VaultTree nodes={nodes} onSelect={onSelect} />)

    rerender(
      <VaultTree
        nodes={nodes}
        revealRequest={{ path: '01-Species/dabbling', key: 1 }}
        onSelect={onSelect}
      />,
    )

    expect(await screen.findByTestId('tree-folder-toggle-01-Species__dabbling')).toBeInTheDocument()

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled()
    })
  })

  it('collapses folders by default and persists expanded state', () => {
    const onSelect = vi.fn()
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    })

    const { rerender } = render(
      <VaultTree
        nodes={[
          {
            name: '.attachments',
            path: '.attachments',
            isDirectory: true,
            children: [],
          },
          {
            name: '.obsidian',
            path: '.obsidian',
            isDirectory: true,
            children: [],
          },
          {
            name: '01-Species',
            path: '01-Species',
            isDirectory: true,
            children: [
              {
                name: 'dabbling',
                path: '01-Species/dabbling',
                isDirectory: true,
                children: [
                  {
                    name: 'american-wigeon.md',
                    path: '01-Species/dabbling/american-wigeon.md',
                    isDirectory: false,
                    children: [],
                  },
                ],
              },
            ],
          },
        ]}
        onSelect={onSelect}
      />,
    )

    expect(screen.queryByText('.attachments')).not.toBeInTheDocument()
    expect(screen.queryByText('.obsidian')).not.toBeInTheDocument()
    expect(screen.getByTestId('tree-folder-toggle-01-Species')).toBeInTheDocument()
    expect(screen.queryByTestId('tree-folder-toggle-01-Species__dabbling')).not.toBeInTheDocument()
    expect(screen.queryByText('american-wigeon.md')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^american-wigeon$/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('tree-folder-toggle-01-Species'))
    fireEvent.click(screen.getByTestId('tree-folder-toggle-01-Species__dabbling'))

    expect(screen.getAllByTestId('tree-folder-toggle-icon')).toHaveLength(2)
    expect(screen.getAllByTestId('tree-folder-icon')).toHaveLength(2)
    expect(screen.getAllByTestId('tree-note-icon')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /^american-wigeon$/i }))
    expect(onSelect).toHaveBeenCalledWith('01-Species/dabbling/american-wigeon.md')

    rerender(
      <VaultTree
        nodes={[
          {
            name: '01-Species',
            path: '01-Species',
            isDirectory: true,
            children: [
              {
                name: 'dabbling',
                path: '01-Species/dabbling',
                isDirectory: true,
                children: [
                  {
                    name: 'american-wigeon.md',
                    path: '01-Species/dabbling/american-wigeon.md',
                    isDirectory: false,
                    children: [],
                  },
                ],
              },
            ],
          },
        ]}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByRole('button', { name: /^american-wigeon$/i })).toBeInTheDocument()
    expect(storage.get('pyrite.vaultTree.expanded')).toContain('"01-Species":true')
    expect(storage.get('pyrite.vaultTree.expanded')).toContain('"01-Species/dabbling":true')
  })
})
