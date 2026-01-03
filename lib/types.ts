// 1. CallFrame
// 2. OpcodeStates

// output
export type CallFrame = {
    id: string
    depth: number
    name: string
    gasUsed: number
    opcodes: OpcodeStats
    children: CallFrame[]
}

export type OpcodeStats = {
    counts: Record<string, number>
    gas: Record<string, number>
}

// input
export type StructLog = {
    op: string
    depth: number
    gasCost: number
}

