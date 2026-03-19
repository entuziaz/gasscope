import { describe, expect, it } from "vitest"
import { streamStructLogs } from "../rpc/streamStructLogs"

function toStream(
  chunks: string[]
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

describe("streamStructLogs", () => {
  it("yields structLogs incrementally from a chunked RPC response", async () => {
    const chunks = [
      '{"jsonrpc":"2.0","id":1,"result":{"struct',
      'Logs":[{"op":"PUSH1","depth":0,"gasCost":3},',
      '{"op":"CALL","depth":0,"gasCost":700},',
      '{"op":"SSTORE","depth":1,"gasCost":200}]}}',
    ]

    const logs = []

    for await (const log of streamStructLogs(toStream(chunks))) {
      logs.push(log)
    }

    expect(logs).toEqual([
      { op: "PUSH1", depth: 0, gasCost: 3 },
      { op: "CALL", depth: 0, gasCost: 700 },
      { op: "SSTORE", depth: 1, gasCost: 200 },
    ])
  })

  it("supports nested arrays and objects inside each structLog entry", async () => {
    const chunks = [
      '{"result":{"structLogs":[',
      '{"op":"SLOAD","depth":1,"gasCost":100,"stack":["0x01"],"storage":{"0x0":"0x1"}}',
      "]}}",
    ]

    const logs = []

    for await (const log of streamStructLogs(toStream(chunks))) {
      logs.push(log)
    }

    expect(logs).toEqual([
      { op: "SLOAD", depth: 1, gasCost: 100 },
    ])
  })
})
