import { FlameNode } from "@/lib/flame"

type CallTracerFrame = {
  type?: string
  from?: string
  to?: string
  input?: string
  gasUsed?: string
  calls?: CallTracerFrame[]
}

function hexToNumber(hex?: string): number {
  if (!hex) return 0
  return Number.parseInt(hex, 16)
}

function selectorLabel(frame: CallTracerFrame): string {
  if (!frame.input || frame.input.length < 10) {
    return frame.to ?? "UNKNOWN"
  }
  return `${frame.to}::${frame.input.slice(0, 10)}`
}

function toFlameNode(frame: CallTracerFrame): FlameNode {
  return {
    name: selectorLabel(frame),
    value: hexToNumber(frame.gasUsed),
    children: frame.calls?.map(toFlameNode),
  }
}

/**
 * callTracer result -> FlameNode tree
 */
export function buildCallFlame(
  rootFrame: CallTracerFrame
): FlameNode {
  // ROOT === top-level call frame
  return toFlameNode(rootFrame)
}
