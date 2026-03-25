import { ChevronDown, FileText, Folder } from 'lucide-react'
import type { VaultNodeDto } from '../types'

interface VaultTreeProps {
  nodes: VaultNodeDto[]
  activePath?: string
  onSelect(path: string): void
}

export function VaultTree({ nodes, activePath, onSelect }: VaultTreeProps) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} activePath={activePath} onSelect={onSelect} />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  activePath,
  onSelect,
}: {
  node: VaultNodeDto
  activePath?: string
  onSelect(path: string): void
}) {
  if (node.isDirectory) {
    return (
      <div>
        <div className="flex items-center gap-2 px-2 py-2 text-[0.82rem] font-semibold text-[var(--ink)]">
          <ChevronDown size={16} className="text-[var(--ink-muted)]" />
          <Folder size={16} className="text-[var(--accent)]" />
          <strong>{node.name}</strong>
        </div>
        <div className="ml-3.5 flex flex-col gap-0.5 border-l border-[var(--line)] pl-3">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} activePath={activePath} onSelect={onSelect} />
          ))}
        </div>
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
      <span className="flex items-center gap-2 text-[0.82rem]">
        <FileText size={16} className="text-[var(--accent)]" />
        <span>{node.name}</span>
      </span>
    </button>
  )
}
