"use client"

import { KeyboardEvent, useId } from "react"
import { FlameNode } from "@/lib/flame"
import styles from "./FlameGraph.module.css"

type Props = {
  node: FlameNode
  parentValue?: number
  depth?: number
  palette?: "orange" | "pink" | "green"
}

type FlatNode = {
  depth: number
  name: string
  percentOfParent: string
  percentOfRoot: string
  value: number
}

const palettes = {
  orange: { h: 34, s: 100 },
  pink: { h: 313, s: 100 },
  green: { h: 83, s: 100 }, 
} as const;

function formatPercent(value: number) {
  return value.toFixed(1)
}

function buildFlatNodes(
  node: FlameNode,
  rootValue: number,
  parentValue = rootValue,
  depth = 0
): FlatNode[] {
  const percentOfParent =
    parentValue > 0 ? formatPercent((node.value / parentValue) * 100) : "0.0"
  const percentOfRoot =
    rootValue > 0 ? formatPercent((node.value / rootValue) * 100) : "0.0"

  return [
    {
      depth,
      name: node.name,
      percentOfParent: depth === 0 ? "100.0" : percentOfParent,
      percentOfRoot,
      value: node.value,
    },
    ...(node.children?.flatMap((child) =>
      buildFlatNodes(child, rootValue, node.value, depth + 1)
    ) ?? []),
  ]
}

function buildGraphLabel(node: FlameNode) {
  const childCount = node.children?.length ?? 0
  return `${node.name} flame graph with ${childCount} top-level segment${childCount === 1 ? "" : "s"} and ${node.value.toLocaleString()} gas total. Use Tab or arrow keys to inspect each segment, or review the data table below.`
}

function handleSegmentKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const current = event.currentTarget
  const root = current.closest("[data-flame-root='true']")

  if (!root) return

  const segments = Array.from(
    root.querySelectorAll<HTMLElement>("[data-flame-segment='true']")
  )
  const currentIndex = segments.indexOf(current)

  if (currentIndex === -1) return

  const moveFocus = (nextIndex: number) => {
    const target = segments[nextIndex]
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    moveFocus(Math.min(currentIndex + 1, segments.length - 1))
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    moveFocus(Math.max(currentIndex - 1, 0))
  }

  if (event.key === "Home") {
    moveFocus(0)
  }

  if (event.key === "End") {
    moveFocus(segments.length - 1)
  }
}

function FlameGraphNode({
  node,
  parentValue,
  depth = 0,
  palette = "orange",
}: Props) {
  const base = parentValue ?? node.value
  const widthPercent =
    base > 0 ? Math.max((node.value / base) * 100, 0.4) : 100

  const isRoot = depth === 0
  const percent = parentValue
    ? formatPercent((node.value / parentValue) * 100)
    : "100.0"

  const showLabel = widthPercent > 6
  const swatches = palettes[palette]
  // const swatch = swatches[Math.min(depth, swatches.length - 1)]
  // const borderColor = depth === 0 ? "#000000" : "rgba(0, 0, 0, 0.18)"


  // Calculate color dynamically: 
  // We start at 50% lightness and get lighter by 7% per depth level, 
  // capping at 90% so text remains readable.
  const theme = palettes[palette];
  const lightness = Math.min(50 + depth * 7, 90);
  const swatch = `hsl(${theme.h}, ${theme.s}%, ${lightness}%)`;

  // Slightly darker border for deeper levels to maintain separation
  const borderColor = depth === 0 ? "#000000" : `hsl(${theme.h}, ${theme.s}%, ${lightness - 10}%)`;

  const ariaLabel = `${node.name}, ${node.value.toLocaleString()} gas, ${percent}% of parent${isRoot ? ", root segment" : ""}`
  const tooltipId = useId()
  const titleText = showLabel
    ? `${node.name} — ${node.value.toLocaleString()} gas (${percent}%)`
    : undefined


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
      title={titleText}
      aria-label={ariaLabel}
      aria-describedby={!showLabel ? tooltipId : undefined}
      aria-roledescription="flame graph segment"
      data-flame-segment="true"
      onKeyDown={handleSegmentKeyDown}
      role="group"
      tabIndex={0}
    >
      {showLabel ? (
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
      ) : (
        <>
          <span className={styles.srOnly}>{ariaLabel}</span>
          <span
            className={styles.segmentTooltip}
            id={tooltipId}
            role="tooltip"
          >
            {node.name}
            <span className={styles.tooltipMeta}>
              {" "}
              {node.value.toLocaleString()} gas ({percent}%)
            </span>
          </span>
        </>
      )}

      {node.children && node.children.length > 0 && (
        <div className={styles.children}>
          {node.children.map((child, index) => (
            <FlameGraphNode
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

export function FlameGraph({ node, palette = "orange" }: Props) {
  const labelId = useId()
  const descriptionId = useId()
  const tableId = useId()
  const flatNodes = buildFlatNodes(node, node.value)
  const shouldCollapseTable = flatNodes.length > 5
  const tableMarkup = (
    <table className={styles.table}>
      <caption className={styles.srOnly}>
        Gas usage by flame graph segment
      </caption>
      <thead>
        <tr>
          <th scope="col">Segment</th>
          <th scope="col">Depth</th>
          <th scope="col">Gas</th>
          <th scope="col">% of parent</th>
          <th scope="col">% of total</th>
        </tr>
      </thead>
      <tbody>
        {flatNodes.map((entry, index) => (
          <tr key={`${entry.depth}-${entry.name}-${index}`}>
            <th data-label="Segment" scope="row">
              {entry.name}
            </th>
            <td data-label="Depth">{entry.depth}</td>
            <td data-label="Gas">{entry.value.toLocaleString()}</td>
            <td data-label="% of parent">{entry.percentOfParent}%</td>
            <td data-label="% of total">{entry.percentOfRoot}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <figure className={styles.figure}>
      <figcaption id={labelId} className={styles.caption}>
        {node.name} gas flame graph
      </figcaption>

      <p id={descriptionId} className={styles.srOnly}>
        {buildGraphLabel(node)}
      </p>

      <div
        aria-describedby={`${descriptionId} ${tableId}`}
        aria-label={buildGraphLabel(node)}
        aria-labelledby={labelId}
        className={styles.graph}
        data-flame-root="true"
        role="img"
      >
        <FlameGraphNode node={node} palette={palette} />
      </div>

      {shouldCollapseTable ? (
        <details className={styles.tableDisclosure}>
          <summary className={styles.tableSummary} id={tableId}>
            Accessible flame graph data ({flatNodes.length} rows)
          </summary>
          <div className={styles.tableWrap}>{tableMarkup}</div>
        </details>
      ) : (
        <div className={styles.tableSection}>
          <h3 className={styles.tableHeading} id={tableId}>
            Accessible flame graph data
          </h3>
          <div className={styles.tableWrap}>{tableMarkup}</div>
        </div>
      )}
    </figure>
  )
}
