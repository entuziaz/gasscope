import { FlameNode } from "@/lib/flame"

type Props = {
  node: FlameNode
  parentValue?: number
  depth?: number
}

export function FlameGraph({ node, parentValue, depth = 0 }: Props) {
  const base = parentValue ?? node.value   // ROOT uses itself
  const widthPercent = Math.max((node.value / base) * 100, 0.5) 

  const isRoot = depth === 0

    return (
    <div
      style={{
        marginLeft: isRoot ? 0 : 2,
        width: `${widthPercent}%`,
        boxSizing: "border-box",
        border: "1px solid #999",
        background: isRoot ? "#ffd699" : "#ffcc80",
        fontSize: 12,
        lineHeight: 1.3,
        cursor: "default",
      }}
      title={`${node.name} — ${node.value.toLocaleString()} gas`}
    >
      {/* Label */}
      <div
        style={{
          padding: "4px 6px",
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
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div
          style={{
            display: "flex",
            borderTop: "1px solid #bbb",
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