import { NextRequest, NextResponse } from "next/server"

type DebugTraceResponse = {
    jsonrpc: string
    id: number
    result?: {
        structLogs: any[]
    }
    error?: {
        code: number
        message: string
    }
}

/**
 * POST /api/trace
 * 
 * Body:
 * {
 *      "txHash": "0x..."
 * }
 * 
 * Responsiblity:
 * - Call debug_traceTransaction
 * - Return raw trace JSON
 */

export async function POST(req: NextRequest) {
    const { txHash } = await req.json()

    if (!txHash || typeof txHash !== "string") {
        return NextResponse.json(
            { error: "txHash is required" },
            { status: 400 }
        )
    }

    const rpcUrl = process.env.RSK_RPC_URL ??  "http://localhost:4444"

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "debug_traceTransaction",
        params: [txHash],
    }

    let rpcResponse: DebugTraceResponse

    try {
        const res = await fetch(rpcUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        rpcResponse = await res.json()
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to reach RPC node" },
            { status: 500 }
        )
    }

    if (rpcResponse.error) {
        return NextResponse.json(
        { error: rpcResponse.error.message },
        { status: 500 }
        )
    }

  return NextResponse.json(rpcResponse.result)

}
