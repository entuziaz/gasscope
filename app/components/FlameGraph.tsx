import { FlameNode } from "@/lib/flame"

type Props = {
  node: FlameNode
  parentValue?: number
  depth?: number
}

export function FlameGraph({ node, parentValue, depth = 0 }: Props) {
  const base = parentValue ?? node.value   // ROOT uses itself
  const widthPercent = (node.value / base) * 100

  return (
    <div
      style={{
        marginLeft: depth === 0 ? 0 : 2,
        border: "1px solid #444",
        background: "#ffcc80",
        width: `${widthPercent}%`,
        fontSize: "12px",
        boxSizing: "border-box",
      }}
    >
      {/* Label */}
      <div
        style={{
          padding: "2px 4px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {node.name} — {node.value.toLocaleString()} gas
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div style={{ display: "flex" }}>
          {node.children.map((child, i) => (
            <FlameGraph
              key={i}
              node={child}
              parentValue={node.value}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}