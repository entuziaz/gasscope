"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode } from "@/lib/flame"
import { toErrorMessage } from "@/lib/errors"
import styles from "./page.module.css"

type Mode = "opcode" | "calls"
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/

type TraceFormProps = {
  isLoading: boolean
  isValidTx: boolean
  txHash: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTxHashChange: (value: string) => void
}

function TraceForm({
  isLoading,
  isValidTx,
  txHash,
  onSubmit,
  onTxHashChange,
}: TraceFormProps) {
  return (
    <form
      className={`${styles.traceActions} ${styles.traceActionsInline}`}
      onSubmit={onSubmit}
    >
      <div className={styles.traceInputWrap}>
        <label
          className={styles.traceLabel}
          htmlFor="txHash"
        >
          Txn Hash
        </label>
        <input
          id="txHash"
          className={styles.traceInput}
          value={txHash}
          onChange={(e) => onTxHashChange(e.target.value)}
          placeholder="0x..."
          disabled={isLoading}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <button
        className={styles.traceButton}
        type="submit"
        disabled={!isValidTx || isLoading}
        aria-busy={isLoading}
      >
        {isLoading && (
          <span
            className={styles.traceButtonSpinner}
            aria-hidden="true"
          />
        )}
        {isLoading ? "Tracing..." : "Trace Transaction"}
      </button>
    </form>
  )
}

export default function Home() {
  const traceAbortRef = useRef<AbortController | null>(null)
  const [txHash, setTxHash] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  )
  const [opcodeRoot, setOpcodeRoot] =
    useState<FlameNode | null>(null)
  const [callRoot, setCallRoot] =
    useState<FlameNode | null>(null)
  const [opcodeError, setOpcodeError] = useState<string | null>(
    null
  )
  const [callError, setCallError] = useState<string | null>(
    null
  )

  const isValidTx = TX_HASH_PATTERN.test(txHash.trim())
  const hasNestedExternalCalls = Boolean(
    callRoot?.children && callRoot.children.length > 0
  )
  const hasResults = Boolean(opcodeRoot || callRoot)

  useEffect(() => {
    return () => {
      traceAbortRef.current?.abort()
    }
  }, [])

  async function fetchTrace(
    mode: Mode,
    traceTxHash: string,
    signal: AbortSignal
  ) {
    const res = await fetch("/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: traceTxHash, mode }),
      signal,
    })

    let data: unknown = null

    try {
      data = await res.json()
    } catch {
      if (!res.ok) {
        throw new Error(
          res.statusText || `Trace request failed with status ${res.status}`
        )
      }

      throw new Error("Trace response was not valid JSON")
    }

    if (!res.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : res.statusText || `Trace request failed with status ${res.status}`

      throw new Error(message)
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("root" in data)
    ) {
      throw new Error("Trace response payload was invalid")
    }

    return data.root as FlameNode
  }

  async function loadTrace() {
    const traceTxHash = txHash.trim()
    const controller = new AbortController()

    traceAbortRef.current?.abort()
    traceAbortRef.current = controller

    try {
      setIsLoading(true)
      setErrorMessage(null)
      setOpcodeError(null)
      setCallError(null)

      const [opcodeResult, callResult] =
        await Promise.allSettled([
          fetchTrace("opcode", traceTxHash, controller.signal),
          fetchTrace("calls", traceTxHash, controller.signal),
        ])

      const didAbort =
        (opcodeResult.status === "rejected" &&
          opcodeResult.reason instanceof Error &&
          opcodeResult.reason.name === "AbortError") ||
        (callResult.status === "rejected" &&
          callResult.reason instanceof Error &&
          callResult.reason.name === "AbortError")

      if (didAbort) {
        return
      }

      if (opcodeResult.status === "fulfilled") {
        setOpcodeRoot(opcodeResult.value)
      } else {
        setOpcodeRoot(null)
        setOpcodeError(toErrorMessage(opcodeResult.reason))
      }

      if (callResult.status === "fulfilled") {
        setCallRoot(callResult.value)
      } else {
        setCallRoot(null)
        setCallError(toErrorMessage(callResult.reason))
      }

      if (
        opcodeResult.status === "rejected" &&
        callResult.status === "rejected"
      ) {
        setErrorMessage(
          "Trace request failed for both opcode and external call views. Check the per-view errors below."
        )
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.name === "AbortError"
      ) {
        return
      }

      setErrorMessage(toErrorMessage(err))
    } finally {
      if (traceAbortRef.current === controller) {
        traceAbortRef.current = null
        setIsLoading(false)
      }
    }
  }

  function handleTraceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidTx || isLoading) {
      return
    }

    void loadTrace()
  }

  return (
    <main
      className={`${styles.appShell} ${hasResults ? styles.hasResults : styles.isEmpty}`}
    >
      {!hasResults ? (
        <section className={`${styles.heroPanel} ${styles.heroPanelCentered} ${styles.heroPanelEmpty}`}>
          <div className={`${styles.heroCopy} ${styles.heroCopyEmpty}`}>
            <span className={styles.heroKicker}>Transaction Gas Profiler</span>
            <h1>GasScope</h1>
            <p className={styles.heroText}>
              Inspect opcode costs, external call frames, and
              verified-function labels from a single transaction
              trace.
            </p>
            <p className={`${styles.traceHint} ${styles.traceHintEmpty}`}>
              A Rootstock RPC node with debug_traceTransaction is required
            </p>
          </div>

          <div className={styles.tracePanelGroup}>
            <div className={`${styles.tracePanel} ${styles.tracePanelEmpty}`}>
              <TraceForm
                isLoading={isLoading}
                isValidTx={isValidTx}
                txHash={txHash}
                onSubmit={handleTraceSubmit}
                onTxHashChange={setTxHash}
              />
            </div>
            {errorMessage && (
              <p className={styles.traceError} role="alert">
                <span className={styles.traceErrorIcon} aria-hidden="true">
                  🚫
                </span>
                {errorMessage}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className={`${styles.heroPanel} ${styles.heroPanelResults}`}>
          <div className={`${styles.heroCopy} ${styles.heroCopyResults}`}>
            <span className={styles.heroKicker}>Transaction Gas Profiler</span>
            <h1>GasScope</h1>
          </div>

          <div className={styles.tracePanelGroup}>
            <div className={`${styles.tracePanel} ${styles.tracePanelResults}`}>
              <TraceForm
                isLoading={isLoading}
                isValidTx={isValidTx}
                txHash={txHash}
                onSubmit={handleTraceSubmit}
                onTxHashChange={setTxHash}
              />
            </div>
            {errorMessage && (
              <p className={styles.traceError} role="alert">
                <span className={styles.traceErrorIcon} aria-hidden="true">
                  🚫
                </span>
                {errorMessage}
              </p>
            )}
          </div>
        </section>
      )}

      <section className={styles.resultsGrid}>
        {opcodeRoot && (
          <article className={styles.resultCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Low-Level View</p>
                <h2>Opcode Gas Breakdown</h2>
              </div>
            </div>
            <p className={styles.sectionCopy}>
              Aggregated gas distribution by opcode category.
              This highlights low-level gas sinks, not Solidity
              function boundaries.
            </p>
            <div className={styles.flameWrap}>
              <FlameGraph
                node={opcodeRoot}
                palette="orange"
              />
            </div>
          </article>
        )}

        {!opcodeRoot && opcodeError && (
          <article className={styles.resultCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Low-Level View</p>
                <h2>Opcode Gas Breakdown</h2>
              </div>
            </div>
            <p className={styles.sectionCopy}>
              Aggregated gas distribution by opcode category.
              This highlights low-level gas sinks, not Solidity
              function boundaries.
            </p>
            <p className={styles.sectionError} role="alert">
              Opcode trace unavailable: {opcodeError}
            </p>
          </article>
        )}

        {callRoot && (
          <article className={styles.resultCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Execution Frames</p>
                <h2>External Call Tree</h2>
              </div>
            </div>
            <p className={styles.sectionCopy}>
              Labels are resolved in this order: verified ABI,
              4-byte signature lookup, then raw address and
              selector fallback.
            </p>
            {!hasNestedExternalCalls && (
              <p className={styles.sectionNote}>
                This transaction has a single external execution
                frame. No nested contract-to-contract calls were
                observed by <code>callTracer</code>.
              </p>
            )}
            <div className={styles.flameWrap}>
              <FlameGraph
                node={callRoot}
                palette="pink"
              />
            </div>
          </article>
        )}

        {!callRoot && callError && (
          <article className={styles.resultCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Execution Frames</p>
                <h2>External Call Tree</h2>
              </div>
            </div>
            <p className={styles.sectionCopy}>
              Labels are resolved in this order: verified ABI,
              4-byte signature lookup, then raw address and
              selector fallback.
            </p>
            <p className={styles.sectionError} role="alert">
              External call trace unavailable: {callError}
            </p>
          </article>
        )}
      </section>
    </main>
  )
}
