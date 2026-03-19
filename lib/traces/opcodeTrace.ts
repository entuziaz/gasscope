import { aggregateOpcodes } from "../aggregate"
import { bucketizeOpcodeGas } from "../bucketize"
import { FlameNode } from "../flame"
import { parseTrace } from "../parser"
import { StructLog } from "../types"

/**
 * structLogs -> opcode gas -> semantic bucket flamegraph
 */

export function buildOpcodeFlame(
  structLogs: StructLog[]
): FlameNode {
  const callTree = parseTrace(structLogs)
  const opcodeStats = aggregateOpcodes(callTree)

  return bucketizeOpcodeGas(opcodeStats.gas)
}
