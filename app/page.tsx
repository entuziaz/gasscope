"use client"

import { useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode } from "@/lib/flame"

type Mode = "opcode" | "calls" | "functions"

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Trace failed"
}

export default function Home() {
  const [txHash, setTxHash] = useState("")
  const [opcodeRoot, setOpcodeRoot] =
    useState<FlameNode | null>(null)
  const [callRoot, setCallRoot] =
    useState<FlameNode | null>(null)
  const [functionRoot, setFunctionRoot] =
    useState<FlameNode | null>(null)

  const isValidTx = txHash.trim().length > 0
  const hasNestedExternalCalls = Boolean(
    callRoot?.children && callRoot.children.length > 0
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
      alert(toErrorMessage(err))
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">Transaction Gas Profiler</span>
          <h1>GasScope</h1>
          <p className="hero-text">
            Inspect opcode costs, external call frames, and
            verified-function labels from a single transaction
            trace.
          </p>
        </div>

        <div className="trace-panel">
          <label
            className="trace-label"
            htmlFor="txHash"
          >
            Transaction Hash
          </label>

          <input
            id="txHash"
            className="trace-input"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />

          <div className="trace-actions">
            <button
              className="trace-button"
              onClick={loadTrace}
              disabled={!isValidTx}
            >
              Trace Transaction
            </button>
            <p className="trace-hint">
              Use a node that exposes{" "}
              <code>debug_traceTransaction</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="results-grid">
        {opcodeRoot && (
          <article className="result-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Low-Level View</p>
                <h2>Opcode Gas Breakdown</h2>
              </div>
            </div>
            <p className="section-copy">
              Aggregated gas distribution by opcode category.
              This highlights low-level gas sinks, not Solidity
              function boundaries.
            </p>
            <div className="flame-wrap">
              <FlameGraph node={opcodeRoot} />
            </div>
          </article>
        )}

        {callRoot && (
          <article className="result-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Execution Frames</p>
                <h2>External Call Tree</h2>
              </div>
            </div>
            <p className="section-copy">
              Labels are resolved in this order: verified ABI,
              4-byte signature lookup, then raw address and
              selector fallback.
            </p>
            {!hasNestedExternalCalls && (
              <p className="section-note">
                This transaction has a single external execution
                frame. No nested contract-to-contract calls were
                observed by <code>callTracer</code>.
              </p>
            )}
            <div className="flame-wrap">
              <FlameGraph node={callRoot} />
            </div>
          </article>
        )}

        {functionRoot && (
          <article className="result-card experimental-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Experimental</p>
                <h2>Solidity Function Attribution</h2>
              </div>
              <span className="status-pill">Needs metadata</span>
            </div>
            <p className="section-copy">
              Unavailable for this transaction because the app
              only has EVM execution traces. Solidity-level
              attribution needs verified source, compiler
              metadata, and sourcemaps.
            </p>
            <div className="flame-wrap">
              <FlameGraph node={functionRoot} />
            </div>
          </article>
        )}
      </section>
    </main>
  )
}
