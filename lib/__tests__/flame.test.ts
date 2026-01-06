import { describe, it, expect } from "vitest"
import { toFlameTree } from "../flame"
import { CallFrame } from "../types"

describe("toFlameTree", () => {
    it("converts a single CallFrame into a FlameNode", () => {
        const frame: CallFrame = {
            id: "1",
            depth: 1,
            name: "CALL",
            gasUsed: 300,
            opcodes: { counts: {}, gas: {} },
            children: [],
        }

        const flame = toFlameTree(frame)

        expect(flame).toEqual({
            name: "CALL",
            value: 300,
        })
    })

    it("converts nested CallFrames into nested FlameNodes", () => {
        const frame: CallFrame = {
            id: "0",
            depth: 0,
            name: "ROOT",
            gasUsed: 1000,
            opcodes: { counts: {}, gas: {} },
            children: [
                {
                    id: "1",
                    depth: 1,
                    name: "CALL",
                    gasUsed: 600,
                    opcodes: { counts: {}, gas: {} },
                    children: [
                        {
                            id: "2",
                            depth: 2,
                            name: "CALL",
                            gasUsed: 400,
                            opcodes: { counts: {}, gas: {} },
                            children: [],
                        },
                    ],
                },
            ],
        }

        const flame = toFlameTree(frame)

        expect(flame).toEqual({
            name: "ROOT",
            value: 1000,
            children: [
                {
                    name: "CALL",
                    value: 600,
                    children: [
                        {
                            name: "CALL",
                            value: 400,
                        },
                    ],
                },
            ],
        })
    })

})
