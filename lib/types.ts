// 1. CallFrame
// 2. OpcodeStates

// input
export type StructLog = {
    op: string
    depth: number
    gasCost: number
}

export type CallTracerFrame = {
    type?: string
    from?: string
    to?: string
    input?: string
    gasUsed?: string
    calls?: CallTracerFrame[]
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

export type CallLabelSource =
  | "fallback"
  | "abi"
  | "4byte"

export type ResolvedCallLabel = {
    label: string
    source: CallLabelSource
    selector?: string
    calldataBytes: number
    address?: string
    contractName?: string
    functionName?: string
    signature?: string
}
