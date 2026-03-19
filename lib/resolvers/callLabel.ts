import { Interface, type InterfaceAbi } from "ethers"
import {
  CallTracerFrame,
  ResolvedCallLabel,
} from "../types"

type ExplorerAbiResult = {
  abi: unknown[]
  contractName?: string
} | null

type CallLabelResolverOptions = {
  fetchImpl?: typeof fetch
}

const ABI_CACHE_MAX_ENTRIES = 512
const FOUR_BYTE_CACHE_MAX_ENTRIES = 1024

const abiCache = new Map<string, Promise<ExplorerAbiResult>>()
const fourByteCache = new Map<string, Promise<string[] | null>>()

export function resetCallLabelResolverCaches(): void {
  abiCache.clear()
  fourByteCache.clear()
}

function setBoundedCache<K, V>(
  cache: Map<K, V>,
  key: K,
  value: V,
  maxEntries: number
): void {
  if (!cache.has(key) && cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }

  cache.set(key, value)
}

function shortAddress(address?: string): string {
  if (!address) return "UNKNOWN"
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function extractSelector(input?: string): string | undefined {
  if (!input || !input.startsWith("0x") || input.length < 10) {
    return undefined
  }

  return input.slice(0, 10).toLowerCase()
}

export function getCalldataBytes(input?: string): number {
  if (!input || !input.startsWith("0x")) return 0
  return Math.max((input.length - 2) / 2, 0)
}

export function buildFallbackLabel(
  frame: CallTracerFrame
): ResolvedCallLabel {
  const selector = extractSelector(frame.input)
  const calldataBytes = getCalldataBytes(frame.input)
  const address = frame.to
  const target = shortAddress(address ?? frame.type)

  const suffix = selector
    ? `${selector} (${calldataBytes} bytes)`
    : `${calldataBytes} bytes`

  return {
    label: `${target}::${suffix}`,
    source: "fallback",
    selector,
    calldataBytes,
    address,
  }
}

function getFetchImpl(fetchImpl?: typeof fetch): typeof fetch | null {
  if (fetchImpl) return fetchImpl
  if (typeof fetch === "function") return fetch
  return null
}

function getTimeoutSignal(ms: number): AbortSignal | undefined {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(ms)
  }

  return undefined
}

function getExplorerUrl(address: string): string | null {
  const template = process.env.EXPLORER_API_URL_TEMPLATE
  if (template) {
    return template.replace(
      "{address}",
      encodeURIComponent(address)
    )
  }

  const baseUrl = process.env.EXPLORER_API_URL
  if (!baseUrl) return null

  const url = new URL(baseUrl)
  url.searchParams.set("module", "contract")
  url.searchParams.set("action", "getabi")
  url.searchParams.set("address", address)

  const apiKey = process.env.EXPLORER_API_KEY
  if (apiKey) {
    url.searchParams.set("apikey", apiKey)
  }

  return url.toString()
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseJsonArray(value: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseExplorerAbiPayload(
  payload: unknown
): ExplorerAbiResult {
  if (!payload) return null

  if (Array.isArray(payload)) {
    return { abi: payload }
  }

  if (isRecord(payload) && Array.isArray(payload.abi)) {
    return {
      abi: payload.abi,
      contractName:
        typeof payload.contractName === "string"
          ? payload.contractName
          : typeof payload.name === "string"
            ? payload.name
            : undefined,
    }
  }

  if (isRecord(payload) && typeof payload.abi === "string") {
    const parsedAbi = parseJsonArray(payload.abi)
    if (!parsedAbi) return null

    return {
      abi: parsedAbi,
      contractName:
        typeof payload.contractName === "string"
          ? payload.contractName
          : typeof payload.name === "string"
            ? payload.name
            : undefined,
    }
  }

  if (isRecord(payload) && typeof payload.result === "string") {
    const trimmed = payload.result.trim()

    if (trimmed.toLowerCase() === "contract source code not verified") {
      return null
    }

    if (trimmed.startsWith("[")) {
      const parsedAbi = parseJsonArray(trimmed)
      if (!parsedAbi) return null

      return {
        abi: parsedAbi,
        contractName:
          typeof payload.contractName === "string"
            ? payload.contractName
            : typeof payload.ContractName === "string"
              ? payload.ContractName
              : typeof payload.name === "string"
                ? payload.name
                : undefined,
      }
    }
  }

  if (isRecord(payload) && payload.result) {
    return parseExplorerAbiPayload(payload.result)
  }

  return null
}

async function fetchExplorerAbi(
  address: string,
  fetchImpl?: typeof fetch
): Promise<ExplorerAbiResult> {
  const normalized = address.toLowerCase()
  const cached = abiCache.get(normalized)
  if (cached) return cached

  const job = (async () => {
    const fetcher = getFetchImpl(fetchImpl)
    const url = getExplorerUrl(normalized)
    if (!fetcher || !url) return null

    const res = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: getTimeoutSignal(2500),
    })

    if (!res.ok) return null

    const payload: unknown = await res.json()
    return parseExplorerAbiPayload(payload)
  })().catch(() => null)

  setBoundedCache(
    abiCache,
    normalized,
    job,
    ABI_CACHE_MAX_ENTRIES
  )
  return job
}

function getFourByteUrl(selector: string): string {
  const template = process.env.FOURBYTE_API_URL_TEMPLATE
  if (template) {
    return template.replace("{selector}", selector)
  }

  const url = new URL(
    process.env.FOURBYTE_API_URL ??
      "https://www.4byte.directory/api/v1/signatures/"
  )
  url.searchParams.set("hex_signature", selector)
  return url.toString()
}

async function fetchFourByteSignatures(
  selector: string,
  fetchImpl?: typeof fetch
): Promise<string[] | null> {
  if (process.env.ENABLE_4BYTE_LOOKUP === "false") {
    return null
  }

  const normalized = selector.toLowerCase()
  const cached = fourByteCache.get(normalized)
  if (cached) return cached

  const job = (async () => {
    const fetcher = getFetchImpl(fetchImpl)
    if (!fetcher) return null

    const res = await fetcher(getFourByteUrl(normalized), {
      headers: { Accept: "application/json" },
      signal: getTimeoutSignal(2500),
    })

    if (!res.ok) return null

    const payload: unknown = await res.json()
    const results =
      isRecord(payload) && Array.isArray(payload.results)
      ? payload.results
      : Array.isArray(payload)
        ? payload
        : []

    const signatures = results
      .map((item) => item?.text_signature)
      .filter((value): value is string => typeof value === "string")

    return signatures.length > 0 ? signatures : null
  })().catch(() => null)

  setBoundedCache(
    fourByteCache,
    normalized,
    job,
    FOUR_BYTE_CACHE_MAX_ENTRIES
  )
  return job
}

function decodeFromAbi(
  abiResult: NonNullable<ExplorerAbiResult>,
  input: string
): ResolvedCallLabel | null {
  try {
    const iface = new Interface(abiResult.abi as InterfaceAbi)
    const tx = iface.parseTransaction({ data: input })
    if (!tx) return null

    const signature = tx.fragment.format("sighash")

    return {
      label: abiResult.contractName
        ? `${abiResult.contractName}.${signature}`
        : signature,
      source: "abi",
      selector: extractSelector(input),
      calldataBytes: getCalldataBytes(input),
      contractName: abiResult.contractName,
      functionName: tx.name,
      signature,
    }
  } catch {
    return null
  }
}

function buildFourByteLabel(
  frame: CallTracerFrame,
  signatures: string[]
): ResolvedCallLabel {
  const selector = extractSelector(frame.input)
  const calldataBytes = getCalldataBytes(frame.input)
  const address = frame.to
  const best = signatures[0]

  const label =
    signatures.length === 1
      ? `${best} [4-byte best effort]`
      : `${shortAddress(address)}::${selector} [${signatures.length} possible signatures from 4-byte lookup]`

  return {
    label,
    source: "4byte",
    selector,
    calldataBytes,
    address,
    signature: best,
  }
}

export async function resolveCallLabel(
  frame: CallTracerFrame,
  options: CallLabelResolverOptions = {}
): Promise<ResolvedCallLabel> {
  const fallback = buildFallbackLabel(frame)
  const selector = fallback.selector

  if (!frame.input || !selector) {
    return fallback
  }

  if (frame.to) {
    const abiResult = await fetchExplorerAbi(frame.to, options.fetchImpl)
    if (abiResult) {
      const decoded = decodeFromAbi(abiResult, frame.input)
      if (decoded) {
        return { ...decoded, address: frame.to }
      }
    }
  }

  const signatures = await fetchFourByteSignatures(
    selector,
    options.fetchImpl
  )

  if (signatures) {
    return buildFourByteLabel(frame, signatures)
  }

  return fallback
}
