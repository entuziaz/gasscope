"use client"

import { useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode } from "@/lib/flame"
import { toErrorMessage } from "@/lib/errors"
import styles from "./page.module.css"

type Mode = "opcode" | "calls" | "functions"
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/

export default function Home() {
  const [txHash, setTxHash] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  )
  const [opcodeRoot, setOpcodeRoot] =
    useState<FlameNode | null>(null)
  const [callRoot, setCallRoot] =
    useState<FlameNode | null>(null)
  const [functionRoot, setFunctionRoot] =
    useState<FlameNode | null>(null)

  const isValidTx = TX_HASH_PATTERN.test(txHash.trim())
  const hasNestedExternalCalls = Boolean(
    callRoot?.children && callRoot.children.length > 0
  )
  const hasResults = Boolean(
    opcodeRoot || callRoot || functionRoot
  )

  async function fetchTrace(mode: Mode) {
    const res = await fetch("/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, mode }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.root as FlameNode
  }

  async function loadTrace() {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      const [opcode, calls, functions] =
        await Promise.all([
          fetchTrace("opcode"),
          fetchTrace("calls"),
          fetchTrace("functions"),
        ])

      setOpcodeRoot(opcode)
      setCallRoot(calls)
      setFunctionRoot(functions)
    } catch (err: unknown) {
      setErrorMessage(toErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
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

          <div className={`${styles.tracePanel} ${styles.tracePanelEmpty}`}>
            <div className={`${styles.traceActions} ${styles.traceActionsInline}`}>
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
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  disabled={isLoading}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>
              <button
                className={styles.traceButton}
                onClick={loadTrace}
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

          <div className={`${styles.tracePanel} ${styles.tracePanelResults}`}>
            <div className={`${styles.traceActions} ${styles.traceActionsInline}`}>
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
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  disabled={isLoading}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>
              <button
                className={styles.traceButton}
                onClick={loadTrace}
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

        {functionRoot && (
          <article className={`${styles.resultCard} ${styles.experimentalCard}`}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.sectionKicker}>Experimental</p>
                <h2>Solidity Function Attribution</h2>
              </div>
              <span className={styles.statusPill}>Needs metadata</span>
            </div>
            <p className={styles.sectionCopy}>
              Unavailable for this transaction because the app
              only has EVM execution traces. Solidity-level
              attribution needs verified source, compiler
              metadata, and sourcemaps.
            </p>
            <div className={styles.flameWrap}>
              <FlameGraph
                node={functionRoot}
                palette="green"
              />
            </div>
          </article>
        )}
      </section>
    </main>
  )
}
