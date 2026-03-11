import { FlameNode } from "@/lib/flame"

type Props = {
  node: FlameNode
  parentValue?: number
  depth?: number
  palette?: "orange" | "pink" | "green"
}

const palettes = {
  orange: ["#ff9100", "#ffb74d", "#ffd08a"],
  pink: ["#ff71e1", "#ff9feb", "#ffc8f4"],
  green: ["#79c600", "#9fde2f", "#c4ef75"],
} as const

export function FlameGraph({
  node,
  parentValue,
  depth = 0,
  palette = "orange",
}: Props) {
  const base = parentValue ?? node.value   // ROOT uses itself
  const widthPercent = Math.max((node.value / base) * 100, 0.4) 

  const isRoot = depth === 0
  const percent = parentValue
    ? ((node.value / parentValue) * 100).toFixed(1)
    : "100"

  // Hide labels when too small
  const showLabel = widthPercent > 6
  const swatches = palettes[palette]
  const swatch = swatches[Math.min(depth, swatches.length - 1)]
  const borderColor = depth === 0 ? "#000000" : "rgba(0, 0, 0, 0.18)"

  return (
    <div
      className="flame-node"
      style={{
        width: `${widthPercent}%`,
        background: swatch,
        borderLeft: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
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
          <span style={{ color: "rgba(0, 0, 0, 0.72)" }}>
            {" "}
            — {node.value.toLocaleString()} gas
          </span>
          <span style={{ color: "rgba(0, 0, 0, 0.58)" }}> ({percent}%)</span>
        </div>
      )}

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div
          style={{
            display: "flex",
            borderTop: "1px solid rgba(0, 0, 0, 0.12)",
          }}
        >
          {node.children.map((child) => (
            <FlameGraph
              key={`${depth + 1}-${child.name}`}
              node={child}
              parentValue={node.value}
              depth={depth + 1}
              palette={palette}
            />
          ))}
        </div>
      )}
    </div>
  )
}
