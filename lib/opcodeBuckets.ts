import { OpcodeBucket } from "./types"

const STACK_OPS = new Set(["POP"])

const STORAGE_OPS = new Set(["SLOAD", "SSTORE"])

const MEMORY_OPS = new Set([
  "MLOAD",
  "MSTORE",
  "MSTORE8",
  "MCOPY",
  "MSIZE",
])

const CONTROL_FLOW_OPS = new Set([
  "JUMP",
  "JUMPI",
  "JUMPDEST",
  "PC",
  "STOP",
  "RETURN",
  "REVERT",
  "INVALID",
])

const CALL_OPS = new Set([
  "CALL",
  "DELEGATECALL",
  "STATICCALL",
  "CALLCODE",
])

const CREATION_OPS = new Set(["CREATE", "CREATE2"])

const LOGGING_OPS = new Set([
  "LOG0",
  "LOG1",
  "LOG2",
  "LOG3",
  "LOG4",
])

const ENVIRONMENT_OPS = new Set([
  "ADDRESS",
  "BALANCE",
  "ORIGIN",
  "CALLER",
  "CALLVALUE",
  "CALLDATALOAD",
  "CALLDATASIZE",
  "CALLDATACOPY",
  "CODESIZE",
  "CODECOPY",
  "GASPRICE",
  "EXTCODESIZE",
  "EXTCODECOPY",
  "EXTCODEHASH",
  "RETURNDATASIZE",
  "RETURNDATACOPY",
  "BLOCKHASH",
  "COINBASE",
  "TIMESTAMP",
  "NUMBER",
  "DIFFICULTY",
  "PREVRANDAO",
  "GASLIMIT",
  "CHAINID",
  "SELFBALANCE",
  "BASEFEE",
  "BLOBHASH",
  "BLOBBASEFEE",
  "GAS",
])

const OTHER_OPS = new Set(["SELFDESTRUCT"])

export function opcodeToBucket(op: string): OpcodeBucket {
  if (
    op.startsWith("PUSH") ||
    op.startsWith("DUP") ||
    op.startsWith("SWAP") ||
    STACK_OPS.has(op)
  ) {
    return "Stack"
  }

  if (STORAGE_OPS.has(op)) return "Storage"
  if (MEMORY_OPS.has(op)) return "Memory"
  if (CONTROL_FLOW_OPS.has(op)) return "Control Flow"
  if (CALL_OPS.has(op)) return "Calls"
  if (CREATION_OPS.has(op)) return "Creation"
  if (LOGGING_OPS.has(op)) return "Logging"
  if (ENVIRONMENT_OPS.has(op)) return "Environment"
  if (OTHER_OPS.has(op)) return "Other"

  return "Computation"
}
