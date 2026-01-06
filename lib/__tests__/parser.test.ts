import { describe, it, expect } from "vitest"
import { parseTrace } from "../parser"
import { StructLog } from "../types"

describe("parseTrace", () => {
  it("builds a single CALL frame with correct gas attribution", () => {
    const logs: StructLog[] = [
      { op: "PUSH1", depth: 0, gasCost: 3 },
      { op: "CALL", depth: 0, gasCost: 700 },
      { op: "SLOAD", depth: 1, gasCost: 100 },
      { op: "SSTORE", depth: 1, gasCost: 200 },
      { op: "STOP", depth: 1, gasCost: 0 },
      { op: "POP", depth: 0, gasCost: 2 },
    ]

    const tree = parseTrace(logs)

    // ROOT assertions
    expect(tree.name).toBe("ROOT")
    expect(tree.children.length).toBe(1)

    // CALL frame assertions
    const callFrame = tree.children[0]
    expect(callFrame.name).toBe("CALL")
    expect(callFrame.depth).toBe(1)
    expect(callFrame.children.length).toBe(0)

    // Gas attribution
    expect(callFrame.gasUsed).toBe(300) // 100 + 200
    expect(callFrame.opcodes.counts["SLOAD"]).toBe(1)
    expect(callFrame.opcodes.counts["SSTORE"]).toBe(1)
  })
})