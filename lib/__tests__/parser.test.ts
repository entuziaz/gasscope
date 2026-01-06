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

    it("handles nested CALLs (0 → 1 → 2 → 1 → 0)", () => {
        const structLogs: StructLog[] = [
            { op: "PUSH1", depth: 0, gasCost: 3 },
            { op: "CALL", depth: 0, gasCost: 700 },

            { op: "PUSH1", depth: 1, gasCost: 3 },
            { op: "CALL", depth: 1, gasCost: 700 },

            { op: "SSTORE", depth: 2, gasCost: 20000 },

            { op: "STOP", depth: 1, gasCost: 0 },
            { op: "STOP", depth: 0, gasCost: 0 },
        ]

        const root = parseTrace(structLogs)

        // ROOT assertions
        expect(root.depth).toBe(0)
        expect(root.children.length).toBe(1)

        const firstCall = root.children[0]
        expect(firstCall.name).toBe("CALL")
        expect(firstCall.depth).toBe(1)
        expect(firstCall.children.length).toBe(1)

        const nestedCall = firstCall.children[0]
        expect(nestedCall.name).toBe("CALL")
        expect(nestedCall.depth).toBe(2)
        expect(nestedCall.children.length).toBe(0)

        // Gas assertions
        expect(root.gasUsed).toBe(703)        // PUSH1 + CALL
        expect(firstCall.gasUsed).toBe(703)   // PUSH1 + CALL
        expect(nestedCall.gasUsed).toBe(20000)
    })

    it("handles multiple sibling CALLs (0 → 1 → 0 → 1 → 0)", () => {
        const structLogs: StructLog[] = [
            { op: "CALL", depth: 0, gasCost: 700 },
            { op: "SSTORE", depth: 1, gasCost: 200 },
            { op: "STOP", depth: 1, gasCost: 0 },
            { op: "POP", depth: 0, gasCost: 2 },

            { op: "CALL", depth: 0, gasCost: 700 },
            { op: "SSTORE", depth: 1, gasCost: 300 },
            { op: "STOP", depth: 1, gasCost: 0 },
            { op: "POP", depth: 0, gasCost: 2 },
        ]

        const root = parseTrace(structLogs)

        expect(root.children.length).toBe(2)

        const first = root.children[0]
        const second = root.children[1]

        expect(first.depth).toBe(1)
        expect(second.depth).toBe(1)

        expect(first.children.length).toBe(0)
        expect(second.children.length).toBe(0)

        expect(first.gasUsed).toBe(200)
        expect(second.gasUsed).toBe(300)
        })


})