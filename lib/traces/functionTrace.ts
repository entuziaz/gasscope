import { FlameNode } from "../flame"

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

export function buildFunctionFlame(totalGas: number): FlameNode {
  return {
    name: "ROOT",
    value: totalGas,
    children: [
      {
        name:
          "Function attribution unavailable without verified source metadata",
        value: totalGas,
      },
    ],
  }
}
