import { isIP } from "node:net"
import { NextRequest, NextResponse } from "next/server"
import { CallTracerFrame, StructLog } from "@/lib/types"
import { buildOpcodeFlame } from "@/lib/traces/opcodeTrace"
import { createOpcodeAggregator } from "@/lib/traces/opcodeAggregator"
import { buildCallFlame } from "@/lib/traces/callTrace"
import { toErrorMessage } from "@/lib/errors"
import { getTimeoutSignal, isRecord } from "@/lib/runtime"
import { streamStructLogs } from "@/lib/rpc/streamStructLogs"

type TraceMode = "opcode" | "calls"
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 12
const RATE_LIMIT_MAX_KEYS = 1024
const RPC_TIMEOUT_MS = 30_000
const RPC_MAX_RESPONSE_BYTES = 10 * 1024 * 1024
const RPC_MAX_STREAM_BYTES = 100 * 1024 * 1024
const UNTRUSTED_RATE_LIMIT_KEY = "untrusted-client"

// NOTE: 
// Rate limiter assumes single instance. Each Node worker or serverless
// instance keeps its own Map, so limits are not enforced globally across a
// scaled deployment and reset on restart/cold start. 
// For production, prefer a shared external store (for example Redis/Upstash) 
// or platform-level rate limiting in front of this route.
const traceRateLimit = new Map<string, number[]>()

function normalizeIp(rawIp: string | null | undefined): string | null {
  if (!rawIp) return null

  const trimmed = rawIp.trim()
  if (!trimmed) return null

  const withoutBrackets =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed
  const normalized = withoutBrackets.startsWith("::ffff:")
    ? withoutBrackets.slice(7)
    : withoutBrackets

  return isIP(normalized) ? normalized : null
}

function parseForwardedChain(headerValue: string | null): string[] {
  if (!headerValue) return []

  return headerValue
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((ip): ip is string => ip !== null)
}

function getTrustedProxyIps(): Set<string> {
  return new Set(
    (process.env.TRUSTED_PROXY_IPS ?? "")
      .split(",")
      .map((value) => normalizeIp(value))
      .filter((ip): ip is string => ip !== null)
  )
}

function getRuntimeRequestIp(req: NextRequest): string | null {
  const requestWithIp = req as NextRequest & {
    ip?: string
  }

  return normalizeIp(requestWithIp.ip)
}

function getTrustedForwardedClientIp(
  req: NextRequest,
  peerIp: string
): string | null {
  if (process.env.TRUST_PROXY_HEADERS !== "true") {
    return null
  }

  const trustedProxies = getTrustedProxyIps()
  if (!trustedProxies.has(peerIp)) {
    return null
  }

  const forwardedChain = parseForwardedChain(
    req.headers.get("x-forwarded-for")
  )

  if (forwardedChain.length === 0) {
    return null
  }

  for (let index = forwardedChain.length - 1; index >= 0; index -= 1) {
    const candidateIp = forwardedChain[index]
    if (!trustedProxies.has(candidateIp)) {
      return candidateIp
    }
  }

  return null
}

function getRateLimitKey(req: NextRequest): string {
  const peerIp = getRuntimeRequestIp(req)
  if (!peerIp) {
    return UNTRUSTED_RATE_LIMIT_KEY
  }

  const forwardedClientIp = getTrustedForwardedClientIp(
    req,
    peerIp
  )

  return forwardedClientIp ?? peerIp
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

async function readJsonWithLimit(
  res: Response,
  maxBytes: number
): Promise<unknown> {
  const contentLength = res.headers.get("content-length")
  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10)
    if (Number.isFinite(bytes) && bytes > maxBytes) {
      throw new Error("Trace response too large")
    }
  }

  if (!res.body) {
    return res.json()
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      throw new Error("Trace response too large")
    }

    chunks.push(value)
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return JSON.parse(new TextDecoder().decode(body)) as unknown
}

async function fetchRpcJson(
  rpcUrl: string,
  payload: unknown
): Promise<Record<string, unknown>> {
  let res: Response

  try {
    res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: getTimeoutSignal(RPC_TIMEOUT_MS),
    })
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      throw new Error("Trace RPC timed out")
    }

    throw err
  }

  if (!res.ok) {
    throw new Error(`Trace RPC failed with status ${res.status}`)
  }

  const json = await readJsonWithLimit(
    res,
    RPC_MAX_RESPONSE_BYTES
  )

  if (
    typeof json !== "object" ||
    json === null ||
    Array.isArray(json)
  ) {
    throw new Error("Trace RPC returned invalid JSON")
  }

  return json as Record<string, unknown>
}

async function fetchRpcResponse(
  rpcUrl: string,
  payload: unknown
): Promise<Response> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: getTimeoutSignal(RPC_TIMEOUT_MS),
    })

    if (!res.ok) {
      throw new Error(`Trace RPC failed with status ${res.status}`)
    }

    return res
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      throw new Error("Trace RPC timed out")
    }

    throw err
  }
}

async function buildOpcodeFlameFromRpc(
  rpcUrl: string,
  txHash: string
): Promise<ReturnType<typeof buildOpcodeFlame>> {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "debug_traceTransaction",
    params: [txHash],
  }

  const res = await fetchRpcResponse(rpcUrl, payload)
  const contentLength = res.headers.get("content-length")
  if (contentLength) {
    const bytes = Number.parseInt(contentLength, 10)
    if (
      Number.isFinite(bytes) &&
      bytes > RPC_MAX_STREAM_BYTES
    ) {
      throw new Error("Trace response too large")
    }
  }

  if (!res.body) {
    throw new Error("Trace RPC returned no body")
  }

  const aggregator = createOpcodeAggregator()
  let totalBytes = 0

  const originalBody = res.body
  const countingBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = originalBody.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value) continue

          totalBytes += value.byteLength
          if (totalBytes > RPC_MAX_STREAM_BYTES) {
            throw new Error("Trace response too large")
          }

          controller.enqueue(value)
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    },
  })

  for await (const log of streamStructLogs(countingBody)) {
    aggregator.add(log)
  }

  return aggregator.finish()
}

function getRpcErrorMessage(
  payload: Record<string, unknown>
): string | null {
  if (!isRecord(payload.error)) return null
  return typeof payload.error.message === "string"
    ? payload.error.message
    : "Trace RPC returned an error"
}

export async function POST(req: NextRequest) {
  const now = Date.now()
  const clientIp = getRateLimitKey(req)

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

      const json = await fetchRpcJson(rpcUrl, payload)
      const rpcError = getRpcErrorMessage(json)
      if (rpcError) throw new Error(rpcError)

      const root = await buildCallFlame(
        json.result as CallTracerFrame
      )
      return NextResponse.json({ mode, root })
    }

    if (mode === "opcode") {
      const root = await buildOpcodeFlameFromRpc(
        rpcUrl,
        normalizedTxHash
      )
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
