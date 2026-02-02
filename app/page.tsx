"use client"

import { useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode } from "@/lib/flame"

type Mode = "opcode" | "calls" | "functions"

export default function Home() {
  const [txHash, setTxHash] = useState("")
  const [opcodeRoot, setOpcodeRoot] =
    useState<FlameNode | null>(null)
  const [callRoot, setCallRoot] =
    useState<FlameNode | null>(null)
  const [functionRoot, setFunctionRoot] =
    useState<FlameNode | null>(null)

  const isValidTx = txHash.trim().length > 0

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
    } catch (err: any) {
      alert(err.message ?? "Trace failed")
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>GasScope</h1>

      <input
        value={txHash}
        onChange={(e) => setTxHash(e.target.value)}
        placeholder="Transaction hash"
        style={{ width: 400, padding: 8 }}
      />

      <div>
        <button
          onClick={loadTrace}
          disabled={!isValidTx}
        >
          Trace
        </button>
      </div>

      {opcodeRoot && (
        <>
          <h2>Opcode Gas Breakdown</h2>
          <FlameGraph node={opcodeRoot} />
        </>
      )}

      {callRoot && (
        <>
          <h2>External Call Tree</h2>
          <FlameGraph node={callRoot} />
        </>
      )}

      {functionRoot && (
        <>
          <h2>Solidity Function Attribution</h2>
          <FlameGraph node={functionRoot} />
        </>
      )}
    </main>
  )
}
