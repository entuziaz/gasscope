import { FlameNode } from "@/lib/flame"

type Props = {
  node: FlameNode
  parentValue?: number
  depth?: number
}

export function FlameGraph({ node, parentValue, depth = 0 }: Props) {
  const base = parentValue ?? node.value   // ROOT uses itself
  const widthPercent = Math.max((node.value / base) * 100, 0.4) 

  const isRoot = depth === 0
  const percent = parentValue
    ? ((node.value / parentValue) * 100).toFixed(1)
    : "100"

  // Subtle depth shading
  const bgLightness = Math.max(80 - depth * 3, 60)

  // Hide labels when too small
  const showLabel = widthPercent > 6

  return (
    <div
      style={{
        width: `${widthPercent}%`,
        boxSizing: "border-box",
        background: `hsl(38, 100%, ${bgLightness}%)`,
        borderLeft: depth === 0 ? "1px solid #999" : "1px solid #bbb",
        borderRight: "1px solid #bbb",
        fontSize: 12,
        lineHeight: 1.4,
      }}
      title={`${node.name} — ${node.value.toLocaleString()} gas (${percent}%)`}
    >
      {/* Label */}
      {showLabel && (
        <div
          style={{
            padding: "6px 8px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: isRoot ? 600 : 400,
          }}
        >
          {node.name}
          <span style={{ color: "#333" }}>
            {" "}
            — {node.value.toLocaleString()} gas
          </span>
          <span style={{ color: "#666" }}> ({percent}%)</span>
        </div>
      )}

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div
          style={{
            display: "flex",
            borderTop: "1px solid #ddd",
          }}
        >
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