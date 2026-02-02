import { StructLog } from "@/lib/types"
import { FlameNode } from "@/lib/flame"

/**
 * Solidity-level gas attribution using sourcemaps.
 *
 * NOTE:
 * This cannot be derived from EVM call depth.
 * Requires:
 *  - runtime bytecode
 *  - solc sourcemap
 *  - pc -> source range mapping
 *
 * This is intentionally stubbed.
 */

export function buildFunctionFlame(
  structLogs: StructLog[]
): FlameNode {
  const totalGas = structLogs.reduce(
    (sum, l) => sum + (l.gasCost ?? 0),
    0
  )

  return {
    name: "ROOT",
    value: totalGas,
    children: [
      {
        name:
          "Solidity function attribution (requires source + sourcemap)",
        value: totalGas,
      },
    ],
  }
}
