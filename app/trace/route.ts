import { NextRequest, NextResponse } from "next/server"
import { StructLog } from "@/lib/types"
import { buildOpcodeFlame } from "@/lib/traces/opcodeTrace"
import { buildCallFlame } from "@/lib/traces/callTrace"
import { toErrorMessage } from "@/lib/errors"

type TraceMode = "opcode" | "calls"
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 12
const RATE_LIMIT_MAX_KEYS = 1024

const traceRateLimit = new Map<string, number[]>()

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) return firstIp
  }

  return "unknown"
}

function pruneRateLimitStore(now: number): void {
  for (const [key, timestamps] of traceRateLimit.entries()) {
    const activeTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    )

    if (activeTimestamps.length === 0) {
      traceRateLimit.delete(key)
      continue
    }

    traceRateLimit.set(key, activeTimestamps)
  }

  while (traceRateLimit.size > RATE_LIMIT_MAX_KEYS) {
    const oldestKey = traceRateLimit.keys().next().value
    if (oldestKey === undefined) break
    traceRateLimit.delete(oldestKey)
  }
}

function consumeRateLimit(ip: string, now: number): boolean {
  pruneRateLimitStore(now)

  const recentTimestamps = (
    traceRateLimit.get(ip) ?? []
  ).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    traceRateLimit.set(ip, recentTimestamps)
    return false
  }

  recentTimestamps.push(now)
  traceRateLimit.set(ip, recentTimestamps)
  return true
}

export async function POST(req: NextRequest) {
  const now = Date.now()
  const clientIp = getClientIp(req)

  if (!consumeRateLimit(clientIp, now)) {
    return NextResponse.json(
      { error: "Too many trace requests. Please wait about 60 seconds and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
          ),
        },
      }
    )
  }

  let body: { txHash?: string; mode?: TraceMode }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { txHash, mode } = body

  if (!txHash || typeof txHash !== "string") {
    return NextResponse.json(
      { error: "txHash is required" },
      { status: 400 }
    )
  }

  const normalizedTxHash = txHash.trim()

  if (!TX_HASH_PATTERN.test(normalizedTxHash)) {
    return NextResponse.json(
      { error: "Invalid txHash format" },
      { status: 400 }
    )
  }

  if (!mode || !["opcode", "calls"].includes(mode)) {
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
          normalizedTxHash,
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

      const root = await buildCallFlame(json.result)
      return NextResponse.json({ mode, root })
    }

    // ─────────────────────────────────────────────
    // structLogs-based traces (opcode)
    // ─────────────────────────────────────────────
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "debug_traceTransaction",
      params: [normalizedTxHash],
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

    throw new Error("Unreachable")
  } catch (err: unknown) {
    return NextResponse.json(
      { error: toErrorMessage(err) },
      { status: 500 }
    )
  }
}
