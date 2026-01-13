// 1. CallFrame
// 2. OpcodeStates

// input
export type StructLog = {
    op: string
    depth: number
    gasCost: number
}

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

export type OpcodeBucket =
  | "Storage"
  | "Memory"
  | "Control Flow"
  | "Computation"
  | "Stack"
  | "Environment"
  | "Calls"
  | "Logging"
  | "Creation"
  | "Other"