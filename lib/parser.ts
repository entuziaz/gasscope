import { OpcodeStats, CallFrame, StructLog } from "./types"


function emptyOpcodeStats(): OpcodeStats {
  return {
    counts: {},
    gas: {},
  }
}

/**
 * Infer the semantic reason a new call frame was created.
 *
 * IMPORTANT:
 * - This function must be called with the opcode that CAUSED
 *   the depth increase (i.e. the opcode executed in the parent frame).
 *
 * @param callOpcode Opcode that triggered the depth increase
 */
function inferFrameName(callOpcode: string): string {
  switch (callOpcode) {
    case "CALL":
    case "DELEGATECALL":
    case "STATICCALL":
    case "CALLCODE":
      return callOpcode
    default:
      return "INTERNAL"
  }
}

/**
 * Parse EVM structLogs into a hierarchical call frame tree.
 *
 * Input:
 * - structLogs[] from debug_traceTransaction
 *
 * Output:
 * - Root CallFrame containing nested call frames
 *
 * Core idea:
 * - Call frames are detected via DEPTH changes
 * - The opcode that CAUSED a new frame lives in the PREVIOUS log
 * - Gas is always attributed to the CURRENT frame
 */
export function parseTrace(structLogs: StructLog[]): CallFrame {
    // --- Step 1: Initialization ---
    const rootFrame: CallFrame = {
        id: "0",
        depth: 0,
        name: "ROOT",
        gasUsed: 0,
        opcodes: emptyOpcodeStats(),
        children: [],
    }

    // Call stack (represents active frames)
    const stack: CallFrame[] = []
    stack.push(rootFrame)

    let prevDepth = 0
    let prevLog: StructLog | null = null
    let frameIdCounter = 1


    // --- Step 2: Process logs sequentially ---
    for (const log of structLogs) {
        const currDepth = log.depth

        // --- ENTER: new call frame ---
        if (currDepth > prevDepth) {
            if (!prevLog) {
                throw new Error("Depth increased without a previous opcode")
            }

            if (currDepth !== prevDepth + 1) {
                throw new Error(
                `Invalid depth jump from ${prevDepth} to ${currDepth}`
                )
            }

            const parent = stack[stack.length - 1]

            const frame: CallFrame = {
                id: String(frameIdCounter++),
                depth: currDepth,
                name: inferFrameName(prevLog.op),
                gasUsed: 0,
                opcodes: emptyOpcodeStats(),
                children: [],
            }

            parent.children.push(frame)
            stack.push(frame)
        }

        // --- EXIT: return from call(s) ---
        else if (currDepth < prevDepth) {
            while (stack.length > 0 && stack[stack.length - 1].depth > currDepth) {
                stack.pop()
            }
        }

        // --- EXECUTE: attribute gas ---
        const currentFrame = stack[stack.length - 1]

        // Attribute opcode gas to the currently executing frame
        currentFrame.gasUsed += log.gasCost

        // opcode count
        currentFrame.opcodes.counts[log.op] =
            (currentFrame.opcodes.counts[log.op] ?? 0) + 1

        // opcode gas
        currentFrame.opcodes.gas[log.op] =
            (currentFrame.opcodes.gas[log.op] ?? 0) + log.gasCost

        // update state
        prevDepth = currDepth
        prevLog = log
    }

    return rootFrame
}
