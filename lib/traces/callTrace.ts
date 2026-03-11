import { FlameNode } from "../flame"
import { resolveCallLabel } from "../resolvers/callLabel"
import { CallTracerFrame } from "../types"

function hexToNumber(hex?: string): number {
  if (!hex) return 0
  return Number.parseInt(hex, 16)
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
