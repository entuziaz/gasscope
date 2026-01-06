import { CallFrame, OpcodeStats } from "./types"

/**
 * Aggregate opcode statistics across the entire call tree.
 *
 * This is a PURE function:
 * - No mutation of input frames
 * - Deterministic output
 *
 * @param frame Root CallFrame
 * @returns Aggregated OpcodeStats
 */
export function aggregateOpcodes(frame: CallFrame): OpcodeStats {
  const result: OpcodeStats = {
    counts: {},
    gas: {},
  }

  function visit(node: CallFrame) {
    // Merge this frame's opcode stats
    for (const [op, count] of Object.entries(node.opcodes.counts)) {
      result.counts[op] = (result.counts[op] ?? 0) + count
    }

    for (const [op, gas] of Object.entries(node.opcodes.gas)) {
      result.gas[op] = (result.gas[op] ?? 0) + gas
    }

    // Recurse
    for (const child of node.children) {
      visit(child)
    }
  }

  visit(frame)
  return result
}
