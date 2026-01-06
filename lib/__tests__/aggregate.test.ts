import { describe, it, expect } from "vitest"
import { aggregateOpcodes } from "../aggregate"
import { CallFrame } from "../types"

describe("aggregateOpcodes", () => {
  it("aggregates opcode stats across nested call frames", () => {
    const tree: CallFrame = {
      id: "0",
      depth: 0,
      name: "ROOT",
      gasUsed: 1000,
      opcodes: {
        counts: { PUSH1: 2 },
        gas: { PUSH1: 6 },
      },
      children: [
        {
          id: "1",
          depth: 1,
          name: "CALL",
          gasUsed: 600,
          opcodes: {
            counts: { CALL: 1, SLOAD: 2 },
            gas: { CALL: 700, SLOAD: 200 },
          },
          children: [
            {
              id: "2",
              depth: 2,
              name: "CALL",
              gasUsed: 400,
              opcodes: {
                counts: { SSTORE: 1 },
                gas: { SSTORE: 20000 },
              },
              children: [],
            },
          ],
        },
      ],
    }

    const stats = aggregateOpcodes(tree)

    expect(stats.counts).toEqual({
      PUSH1: 2,
      CALL: 1,
      SLOAD: 2,
      SSTORE: 1,
    })

    expect(stats.gas).toEqual({
      PUSH1: 6,
      CALL: 700,
      SLOAD: 200,
      SSTORE: 20000,
    })
  })
})
