import { bucketizeOpcodeGas } from "../bucketize"
import { FlameNode } from "../flame"
import { StructLog } from "../types"

export function createOpcodeAggregator(): {
  add(log: StructLog): void
  finish(): FlameNode
} {
  const gasByOpcode: Record<string, number> = {}

  return {
    add(log) {
      gasByOpcode[log.op] =
        (gasByOpcode[log.op] ?? 0) + log.gasCost
    },
    finish() {
      return bucketizeOpcodeGas(gasByOpcode)
    },
  }
}
