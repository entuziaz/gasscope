import { OpcodeStats, CallFrame, StructLog } from "./types"


function emptyOpcodeStats(): OpcodeStats {
  return {
    counts: {},
    gas: {},
  }
}

function inferFrameName(): string {
  return "CALL"
}

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

  const stack: CallFrame[] = []
  stack.push(rootFrame)

  let prevDepth = 0
  let frameIdCounter = 1

  // --- Step 2: Process logs sequentially ---
  for (const log of structLogs) {
    const currDepth = log.depth

    // --- ENTER: new call frame ---
    if (currDepth > prevDepth) {
      if (currDepth !== prevDepth + 1) {
        throw new Error(
          `Invalid depth jump: ${prevDepth} -> ${currDepth}`
        )
      }

      const parent = stack[stack.length - 1]

      const newFrame: CallFrame = {
        id: String(frameIdCounter++),
        depth: currDepth,
        name: inferFrameName(),
        gasUsed: 0,
        opcodes: emptyOpcodeStats(),
        children: [],
      }

      parent.children.push(newFrame)
      stack.push(newFrame)
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

    prevDepth = currDepth
  }

  return rootFrame
}
