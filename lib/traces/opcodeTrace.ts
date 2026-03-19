import { FlameNode } from "../flame"
import { createOpcodeAggregator } from "./opcodeAggregator"
import { StructLog } from "../types"

/**
 * structLogs -> opcode gas -> semantic bucket flamegraph
 */

export function buildOpcodeFlame(
  structLogs: StructLog[]
): FlameNode {
  const aggregator = createOpcodeAggregator()

  for (const log of structLogs) {
    aggregator.add(log)
  }

  return aggregator.finish()
}
