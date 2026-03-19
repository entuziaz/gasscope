import { StructLog } from "../types"

function normalizeStructLog(value: unknown): StructLog {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid structLog entry")
  }

  const entry = value as Record<string, unknown>

  if (typeof entry.op !== "string") {
    throw new Error("structLog.op must be a string")
  }

  if (typeof entry.depth !== "number") {
    throw new Error("structLog.depth must be a number")
  }

  if (typeof entry.gasCost !== "number") {
    throw new Error("structLog.gasCost must be a number")
  }

  return {
    op: entry.op,
    depth: entry.depth,
    gasCost: entry.gasCost,
  }
}

class StructLogStreamParser {
  private phase:
    | "seekKey"
    | "seekArrayStart"
    | "readArray"
    | "done" = "seekKey"
  private inString = false
  private isEscaped = false
  private currentString = ""
  private pendingString: string | null = null
  private objectBuffer = ""
  private objectNesting = 0

  feed(chunk: string): StructLog[] {
    const logs: StructLog[] = []

    for (const char of chunk) {
      if (this.phase === "done") break

      if (this.objectNesting > 0) {
        this.objectBuffer += char
        this.consumeObjectChar(char)

        if (this.objectNesting === 0) {
          logs.push(
            normalizeStructLog(JSON.parse(this.objectBuffer))
          )
          this.objectBuffer = ""
        }

        continue
      }

      if (this.phase === "seekKey") {
        this.consumeKeySearchChar(char)
        continue
      }

      if (this.phase === "seekArrayStart") {
        if (/\s/.test(char)) continue

        if (char !== "[") {
          throw new Error("structLogs must be a JSON array")
        }

        this.phase = "readArray"
        continue
      }

      if (this.phase === "readArray") {
        if (/\s/.test(char) || char === ",") continue

        if (char === "]") {
          this.phase = "done"
          continue
        }

        if (char !== "{") {
          throw new Error(
            "structLogs entries must be JSON objects"
          )
        }

        this.objectBuffer = "{"
        this.objectNesting = 1
        this.inString = false
        this.isEscaped = false
      }
    }

    return logs
  }

  finish(): void {
    if (this.objectNesting > 0) {
      throw new Error("Incomplete structLogs entry")
    }

    if (this.phase !== "done") {
      throw new Error("structLogs array not found or incomplete")
    }
  }

  private consumeKeySearchChar(char: string): void {
    if (this.inString) {
      if (this.isEscaped) {
        this.currentString += char
        this.isEscaped = false
        return
      }

      if (char === "\\") {
        this.currentString += char
        this.isEscaped = true
        return
      }

      if (char === "\"") {
        this.inString = false
        this.pendingString = this.currentString
        this.currentString = ""
        return
      }

      this.currentString += char
      return
    }

    if (char === "\"") {
      this.inString = true
      this.currentString = ""
      return
    }

    if (this.pendingString === null) return

    if (/\s/.test(char)) return

    if (char === ":") {
      if (this.pendingString === "structLogs") {
        this.phase = "seekArrayStart"
      }
      this.pendingString = null
      return
    }

    this.pendingString = null
  }

  private consumeObjectChar(char: string): void {
    if (this.inString) {
      if (this.isEscaped) {
        this.isEscaped = false
        return
      }

      if (char === "\\") {
        this.isEscaped = true
        return
      }

      if (char === "\"") {
        this.inString = false
      }

      return
    }

    if (char === "\"") {
      this.inString = true
      return
    }

    if (char === "{" || char === "[") {
      this.objectNesting += 1
      return
    }

    if (char === "}" || char === "]") {
      this.objectNesting -= 1
    }
  }
}

export async function* streamStructLogs(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<StructLog> {
  const parser = new StructLogStreamParser()
  const decoder = new TextDecoder()
  const reader = body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue

    const chunk = decoder.decode(value, { stream: true })
    for (const log of parser.feed(chunk)) {
      yield log
    }
  }

  const tail = decoder.decode()
  if (tail) {
    for (const log of parser.feed(tail)) {
      yield log
    }
  }

  parser.finish()
}
