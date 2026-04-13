import { CallFrame, OpcodeStats } from "./types"

/**
 * Legacy non-streaming opcode aggregation helper.
 *
 * Production code no longer imports this module. The shipped trace route uses
 * the streaming opcode aggregator in `lib/traces/opcodeAggregator.ts` while it
 * consumes struct logs from the RPC response.
 *
 * This implementation is retained as a reference for tests and for any future
 * workflows that intentionally build a full in-memory call tree first.
 *
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
    for (const [op, count] of Object.entries(node.opcodes.counts ?? {})) {
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
