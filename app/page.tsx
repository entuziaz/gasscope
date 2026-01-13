"use client"

import { useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode, opcodeGasToFlame } from "@/lib/flame"

export default function Home() {
  const [root, setRoot] = useState<FlameNode | null>(null)
  const [txHash, setTxHash] = useState("")
  const isValidTx = txHash.trim().length > 0

  async function loadTrace() {
    const res = await fetch("/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash,
        mode: "flame",
      }),
    })

    const data = await res.json()
    setRoot(data.root)
    // const flameRoot = opcodeGasToFlame(data.opcodes.gas)
    // setRoot(flameRoot)
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: root ? "flex-start" : "center",
        padding: "32px",
      }}
    >
      {/* Header / Input Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          textAlign: "center",
        }}
      >
        <h1 style={{ marginBottom: 8 }}>GasScope</h1>
        <p style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
          Minimal flame graph for EVM gas profiling
        </p>

        <input
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste transaction hash"
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #ccc",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#000"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#ccc"
          }}
        />

        <button
          onClick={loadTrace}
          disabled={!isValidTx}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px",
            fontSize: 14,
            borderRadius: 8,
            border: "none",
            cursor: isValidTx ? "pointer" : "not-allowed",
            background: isValidTx ? "#000" : "#e5e5e5",
            color: isValidTx ? "#fff" : "#888",
            transition: "all 0.15s ease",
          }}
        >
          Trace Transaction
        </button>

      </div>

      {/* Flame graph */}
      {root && (
        <div
          style={{
            width: "100%",
            marginTop: 40,
          }}
        >
          <FlameGraph node={root} />
        </div>
      )}
    </main>
  )
}
