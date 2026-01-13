import { FlameNode } from "./flame"
import { opcodeToBucket } from "./opcodeBuckets"
import { OpcodeBucket } from "./types"

/**
 * Convert flat opcode gas stats into a hierarchical flame tree:
 *
 * ROOT
 *  ├─ Storage
 *  │    ├─ SSTORE
 *  │    └─ SLOAD
 *  ├─ Control Flow
 *  │    ├─ JUMP
 *  │    └─ JUMPI
 *  └─ Stack
 *       ├─ PUSH
 *       ├─ DUP
 *       └─ SWAP
 *
 */
export function bucketizeOpcodeGas(
  gasByOpcode: Record<string, number>
): FlameNode {
  const bucketTotals: Partial<Record<OpcodeBucket, number>> = {}
  const bucketChildren: Partial<
    Record<OpcodeBucket, Record<string, number>>
  > = {}

  let totalGas = 0

  // Aggregate opcode gas into semantic buckets
  for (const [op, gas] of Object.entries(gasByOpcode)) {
    if (gas <= 0) continue

    const bucket = opcodeToBucket(op)

    // bucket total
    bucketTotals[bucket] = (bucketTotals[bucket] ?? 0) + gas

    // bucket children
    if (!bucketChildren[bucket]) {
      bucketChildren[bucket] = {}
    }

    bucketChildren[bucket]![op] =
      (bucketChildren[bucket]![op] ?? 0) + gas

    totalGas += gas
  }

  // Convert buckets into FlameNodes
  const bucketNodes: FlameNode[] = Object.entries(bucketTotals)
    .filter(([, gas]) => gas && gas > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([bucket, gas]) => {
      const opcodeChildren = Object.entries(
        bucketChildren[bucket as OpcodeBucket] ?? {}
      )
        .sort((a, b) => b[1] - a[1])
        .map(([op, gas]) => ({
          name: op,
          value: gas,
        }))

      return {
        name: bucket,
        value: gas!,
        children: opcodeChildren,
      }
    })

  // wrap in ROOT
  return {
    name: "ROOT",
    value: totalGas,
    children: bucketNodes,
  }
}
