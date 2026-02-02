import { StructLog } from "@/lib/types";
import { parseTrace } from "@/lib/parser";
import { aggregateOpcodes } from "@/lib/aggregate";
import { bucketizeOpcodeGas } from "@/lib/bucketize";
import { FlameNode } from "@/lib/flame";

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