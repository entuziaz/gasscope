import { NextRequest, NextResponse } from "next/server"
import { StructLog } from "@/lib/types"
import { buildOpcodeFlame } from "@/lib/traces/opcodeTrace"
import { buildCallFlame } from "@/lib/traces/callTrace"
import { buildFunctionFlame } from "@/lib/traces/functionTrace"

type TraceMode = "opcode" | "calls" | "functions"

export async function POST(req: NextRequest) {
  const { txHash, mode }: { txHash?: string; mode?: TraceMode } =
    await req.json()

  if (!txHash || typeof txHash !== "string") {
    return NextResponse.json(
      { error: "txHash is required" },
      { status: 400 }
    )
  }

  if (!mode || !["opcode", "calls", "functions"].includes(mode)) {
    return NextResponse.json(
      { error: `Invalid mode: ${mode}` },
      { status: 400 }
    )
  }

  const rpcUrl =
    process.env.RSK_RPC_URL ?? "http://localhost:4444"

  try {
    if (mode === "calls") {
      // ─────────────────────────────────────────────
      // External call frame trace (callTracer)
      // ─────────────────────────────────────────────
      const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "debug_traceTransaction",
        params: [
          txHash,
          {
            tracer: "callTracer",
            tracerConfig: {
              onlyTopCall: false,
              withLog: true,
            },
          },
        ],
      }

      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (json.error) throw new Error(json.error.message)

      const root = buildCallFlame(json.result)
      return NextResponse.json({ mode, root })
    }

    // ─────────────────────────────────────────────
    // structLogs-based traces (opcode / functions)
    // ─────────────────────────────────────────────
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "debug_traceTransaction",
      params: [txHash],
    }

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    if (json.error) throw new Error(json.error.message)

    const structLogs: StructLog[] | undefined =
      json.result?.structLogs

    if (!structLogs) {
      throw new Error("No structLogs returned")
    }

    if (mode === "opcode") {
      const root = buildOpcodeFlame(structLogs)
      return NextResponse.json({ mode, root })
    }

    if (mode === "functions") {
      const root = buildFunctionFlame(structLogs)
      return NextResponse.json({ mode, root })
    }

    throw new Error("Unreachable")
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Trace failed" },
      { status: 500 }
    )
  }
}
