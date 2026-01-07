import { CallFrame } from "./types"

export type FlameNode = {
    name: string 
    value: number 
    children?: FlameNode[]
}

/**
 * 
 * @param frame Convert a CallFrame tree into a FlameNode tree
 * for flame graph viz
 * 
 */
export function toFlameTree(frame: CallFrame): FlameNode {
    const node: FlameNode = {
        name: frame.name,
        value: frame.gasUsed,
    }

    if (frame.children.length > 0) {
        node.children = frame.children.map(toFlameTree)
    }

    return node

}


/**
 * This is used to visualize gas distribution by EVM opcode
 * (e.g. SSTORE, CALL, LOG) in a flame graph. Each opcode becomes
 * a direct child of a synthetic ROOT node, with its gas cost
 * represented as the node's value.
 *
 * Opcodes with zero gas usage are omitted. Children are sorted
 * in descending order of gas usage so the most expensive
 * opcodes appear first in the visualization.
 *
 * @param gasByOpcode - A map of EVM opcode names to total gas consumed
 *                      during a transaction execution.
 *
 * @returns A FlameNode tree where:
 * - ROOT.value is the sum of gas across all opcodes
 * - ROOT.children are opcode nodes with their respective gas costs
 */

export function opcodeGasToFlame(
  gasByOpcode: Record<string, number>
): FlameNode {
  const children: FlameNode[] = Object.entries(gasByOpcode)
    .filter(([, gas]) => gas > 0)
    .sort((a, b) => b[1] - a[1]) // biggest first
    .map(([op, gas]) => ({
      name: op,
      value: gas,
    }))

  const total = children.reduce((sum, c) => sum + c.value, 0)

  return {
    name: "ROOT",
    value: total,
    children,
  }
}
