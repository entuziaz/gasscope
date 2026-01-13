import { OpcodeBucket } from "./types"

export function opcodeToBucket(op: string): OpcodeBucket {
  if (op.startsWith("PUSH")) return "Stack"
  if (op.startsWith("DUP")) return "Stack"
  if (op.startsWith("SWAP")) return "Stack"

  switch (op) {
    case "SLOAD":
    case "SSTORE":
      return "Storage"

    case "MLOAD":
    case "MSTORE":
    case "MSTORE8":
    case "MSIZE":
      return "Memory"

    case "JUMP":
    case "JUMPI":
    case "JUMPDEST":
    case "STOP":
    case "RETURN":
    case "REVERT":
    case "INVALID":
      return "Control Flow"

    case "CALL":
    case "DELEGATECALL":
    case "STATICCALL":
    case "CALLCODE":
      return "Calls"

    case "CREATE":
    case "CREATE2":
      return "Creation"

    case "LOG0":
    case "LOG1":
    case "LOG2":
    case "LOG3":
    case "LOG4":
      return "Logging"

    case "SELFDESTRUCT":
      return "Other"

    default:
      return "Computation"
  }
}
