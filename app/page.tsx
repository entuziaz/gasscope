"use client"

import { useState } from "react"
import { FlameGraph } from "./components/FlameGraph"
import { FlameNode, opcodeGasToFlame } from "@/lib/flame"

export default function Home() {
  const [root, setRoot] = useState<FlameNode | null>(null)
  const [txHash, setTxHash] = useState("")

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
    // setRoot(data.root)
    const flameRoot = opcodeGasToFlame(data.opcodes.gas)
    setRoot(flameRoot)
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>GasScope — Minimal Flame Graph</h1>

      <input
        value={txHash}
        onChange={(e) => setTxHash(e.target.value)}
        placeholder="Transaction hash"
        style={{ width: "80%" }}
      />

      <button onClick={loadTrace}>Trace</button>

      <div style={{ marginTop: 20 }}>
        {root && <FlameGraph node={root} />}
      </div>
    </main>
  )
}
