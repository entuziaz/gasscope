import { FlameNode } from "@/lib/flame"
import styles from "./FlameGraph.module.css"

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
      className={styles.node}
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
          className={`${styles.label} ${isRoot ? styles.labelRoot : styles.labelChild}`}
          style={{
            fontWeight: isRoot ? 600 : 400,
          }}
        >
          {node.name}
          <span className={styles.value}>
            {" "}
            — {node.value.toLocaleString()} gas
          </span>
          <span className={styles.percent}> ({percent}%)</span>
        </div>
      )}

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div
          className={styles.children}
        >
          {node.children.map((child, index) => (
            <FlameGraph
              key={`${depth + 1}-${index}-${child.name}`}
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
