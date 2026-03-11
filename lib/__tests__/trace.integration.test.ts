import { describe, it, expect } from "vitest"
import { parseTrace } from "../parser"
import { toFlameTree } from "../flame"

describe("trace pipeline", () => {
  it("produces a FlameNode from structLogs", () => {
    const structLogs = [
      { op: "CALL", depth: 0, gasCost: 700 },
      { op: "SSTORE", depth: 1, gasCost: 200 },
      { op: "STOP", depth: 0, gasCost: 0 },
    ]

    const callTree = parseTrace(structLogs)
    const flame = toFlameTree(callTree)

    expect(flame.name).toBe("ROOT")
    expect(flame.children?.length).toBe(1)
    expect(flame.children?.[0].value).toBe(200)
  })
})
