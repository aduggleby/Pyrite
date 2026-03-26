import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import type { VaultNodeDto } from '../types'

const storageKey = 'pyrite.vaultTree.expanded'
const hiddenDirectoryNames = new Set(['.attachments'])

interface VaultTreeProps {
  nodes: VaultNodeDto[]
  activePath?: string
  onSelect(path: string): void
}

export function VaultTree({ nodes, activePath, onSelect }: VaultTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') {
      return {}
    }

    const stored = window.localStorage.getItem(storageKey)
    if (!stored) {
      return {}
    }

    try {
      const parsed = JSON.parse(stored)
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, boolean>) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(expandedFolders))
  }, [expandedFolders])

  return (
    <div className="mt-2 flex flex-col gap-1">
      {nodes.filter((node) => !hiddenDirectoryNames.has(node.name)).map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          activePath={activePath}
          expandedFolders={expandedFolders}
          onSelect={onSelect}
          onToggleFolder={(path) =>
            setExpandedFolders((current) => ({
              ...current,
              [path]: !(current[path] === true),
            }))
          }
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  activePath,
  expandedFolders,
  onSelect,
  onToggleFolder,
}: {
  node: VaultNodeDto
  activePath?: string
  expandedFolders: Record<string, boolean>
  onSelect(path: string): void
  onToggleFolder(path: string): void
}) {
  const label = node.isDirectory ? node.name : node.name.replace(/\.md$/i, '')

  if (node.isDirectory) {
    const isExpanded = expandedFolders[node.path] === true

    return (
      <div>
        <button
          className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm text-[var(--ink)]"
          data-testid={`tree-folder-toggle-${node.path.replaceAll('/', '__')}`}
          type="button"
          onClick={() => onToggleFolder(node.path)}
        >
          {isExpanded ? (
            <ChevronDown data-testid="tree-folder-toggle-icon" size={14} className="text-[var(--ink-muted)]" />
          ) : (
            <ChevronRight data-testid="tree-folder-toggle-icon" size={14} className="text-[var(--ink-muted)]" />
          )}
          <Folder data-testid="tree-folder-icon" size={14} className="text-[var(--accent)]" />
          <span>{label}</span>
        </button>
        {isExpanded ? (
          <div className="ml-3.5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-3">
            {node.children.filter((child) => !hiddenDirectoryNames.has(child.name)).map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                activePath={activePath}
                expandedFolders={expandedFolders}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const isActive = activePath === node.path

  return (
    <button
      className={[
        'w-full rounded-[var(--radius)] px-2 py-2 text-left transition-colors',
        isActive ? 'bg-[rgba(210,166,121,0.24)] text-[var(--ink)]' : 'text-[var(--ink-light)] hover:bg-[rgba(210,166,121,0.16)]',
      ].join(' ')}
      type="button"
      onClick={() => onSelect(node.path)}
    >
      <span className="flex items-center gap-2 text-sm">
        <FileText data-testid="tree-note-icon" size={14} className="text-[var(--accent)]" />
        <span>{label}</span>
      </span>
    </button>
  )
}
