import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import type { VaultNodeDto } from '../types'

interface VaultTreeProps {
  nodes: VaultNodeDto[]
  activePath?: string
  onSelect(path: string): void
}

export function VaultTree({ nodes, activePath, onSelect }: VaultTreeProps) {
  return (
    <div className="tree-list">
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
        <div className="tree-row">
          <ChevronDown size={16} />
          <Folder size={16} color="#8b4513" />
          <strong>{node.name}</strong>
        </div>
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} activePath={activePath} onSelect={onSelect} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <button
      className={`tree-button ${activePath === node.path ? 'is-active' : ''}`}
      type="button"
      onClick={() => onSelect(node.path)}
    >
      <span className="tree-row">
        <ChevronRight size={16} />
        <FileText size={16} color="#8b4513" />
        <span>{node.name}</span>
      </span>
    </button>
  )
}
