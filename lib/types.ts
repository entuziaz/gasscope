// 1. CallFrame
// 2. OpcodeStates

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

