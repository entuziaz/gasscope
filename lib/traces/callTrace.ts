import { FlameNode } from "../flame"
import { resolveCallLabel } from "../resolvers/callLabel"
import { CallTracerFrame } from "../types"

function hexToNumber(hex?: string): number {
  if (!hex) return 0

  const value = BigInt(hex)
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("gasUsed exceeds Number.MAX_SAFE_INTEGER")
  }

  return Number(value)
}

async function toFlameNode(
  frame: CallTracerFrame
): Promise<FlameNode> {
  const resolved = await resolveCallLabel(frame)
  const children = frame.calls
    ? await Promise.all(frame.calls.map(toFlameNode))
    : undefined

  return {
    name: resolved.label,
    value: hexToNumber(frame.gasUsed),
    children,
  }
}

/**
 * callTracer result -> FlameNode tree
 */
export async function buildCallFlame(
  rootFrame: CallTracerFrame
): Promise<FlameNode> {
  // ROOT === top-level call frame
  return toFlameNode(rootFrame)
}
