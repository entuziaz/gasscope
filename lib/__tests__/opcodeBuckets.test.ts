import { describe, expect, it } from "vitest"
import { opcodeToBucket } from "../opcodeBuckets"
import { OpcodeBucket } from "../types"

describe("opcodeToBucket", () => {
  it("maps representative opcodes into the expected semantic buckets", () => {
    const cases: Array<[string, OpcodeBucket]> = [
      ["PUSH1", "Stack"],
      ["POP", "Stack"],
      ["ADD", "Computation"],
      ["KECCAK256", "Computation"],
      ["MSTORE", "Memory"],
      ["SLOAD", "Storage"],
      ["CALLER", "Environment"],
      ["CALLDATACOPY", "Environment"],
      ["EXTCODEHASH", "Environment"],
      ["BASEFEE", "Environment"],
      ["JUMPI", "Control Flow"],
      ["CALL", "Calls"],
      ["LOG2", "Logging"],
      ["CREATE2", "Creation"],
      ["SELFDESTRUCT", "Other"],
    ]

    for (const [opcode, bucket] of cases) {
      expect(opcodeToBucket(opcode)).toBe(bucket)
    }
  })
})
