import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { buildCallFlame } from "../traces/callTrace"
import { resetCallLabelResolverCaches } from "../resolvers/callLabel"
import { CallTracerFrame } from "../types"

describe("buildCallFlame", () => {
  const originalEnv = {
    explorerUrl: process.env.EXPLORER_API_URL,
    explorerTemplate: process.env.EXPLORER_API_URL_TEMPLATE,
    explorerKey: process.env.EXPLORER_API_KEY,
    fourByteUrl: process.env.FOURBYTE_API_URL,
    fourByteTemplate: process.env.FOURBYTE_API_URL_TEMPLATE,
    enable4byte: process.env.ENABLE_4BYTE_LOOKUP,
  }

  beforeEach(() => {
    resetCallLabelResolverCaches()
    process.env.EXPLORER_API_URL = ""
    process.env.EXPLORER_API_URL_TEMPLATE = ""
    process.env.EXPLORER_API_KEY = ""
    process.env.FOURBYTE_API_URL = "https://example.com/4byte"
    process.env.FOURBYTE_API_URL_TEMPLATE = ""
    process.env.ENABLE_4BYTE_LOOKUP = "true"
  })

  afterEach(() => {
    resetCallLabelResolverCaches()
    process.env.EXPLORER_API_URL = originalEnv.explorerUrl
    process.env.EXPLORER_API_URL_TEMPLATE =
      originalEnv.explorerTemplate
    process.env.EXPLORER_API_KEY = originalEnv.explorerKey
    process.env.FOURBYTE_API_URL = originalEnv.fourByteUrl
    process.env.FOURBYTE_API_URL_TEMPLATE =
      originalEnv.fourByteTemplate
    process.env.ENABLE_4BYTE_LOOKUP = originalEnv.enable4byte
    vi.restoreAllMocks()
  })

  it("uses fallback labels when no metadata resolver is configured", async () => {
    process.env.ENABLE_4BYTE_LOOKUP = "false"

    const frame: CallTracerFrame = {
      to: "0x1234567890abcdef1234567890abcdef12345678",
      gasUsed: "0x5208",
      input: "0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001",
    }

    const flame = await buildCallFlame(frame)

    expect(flame.name).toBe("0x1234...5678::0xa9059cbb (36 bytes)")
    expect(flame.value).toBe(21000)
  })

  it("decodes verified contracts through explorer ABI", async () => {
    process.env.EXPLORER_API_URL =
      "https://example.com/api"
    process.env.ENABLE_4BYTE_LOOKUP = "false"

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "1",
          result:
            '[{"type":"function","name":"transfer","stateMutability":"nonpayable","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]}]',
          ContractName: "MockToken",
        }),
      } as Response)

    vi.stubGlobal("fetch", fetchMock)

    const frame: CallTracerFrame = {
      to: "0x1234567890abcdef1234567890abcdef12345678",
      gasUsed: "0x100",
      input:
        "0xa9059cbb00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000002",
    }

    const flame = await buildCallFlame(frame)

    expect(flame.name).toBe(
      "MockToken.transfer(address,uint256)"
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to 4byte signatures when ABI is unavailable", async () => {
    process.env.EXPLORER_API_URL =
      "https://example.com/api"
    process.env.FOURBYTE_API_URL =
      "https://example.com/4byte"

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) => {
        const url = String(input)

        if (url.includes("module=contract")) {
          return {
            ok: true,
            json: async () => ({
              status: "0",
              result: "Contract source code not verified",
            }),
          } as Response
        }

        return {
          ok: true,
          json: async () => ({
            results: [
              {
                text_signature:
                  "transfer(address,uint256)",
              },
            ],
          }),
        } as Response
      })

    vi.stubGlobal("fetch", fetchMock)

    const frame: CallTracerFrame = {
      to: "0x1234567890abcdef1234567890abcdef12345678",
      gasUsed: "0xff",
      input:
        "0xa9059cbb0000000000000000000000001111111111111111111111111111111111111111",
    }

    const flame = await buildCallFlame(frame)

    expect(flame.name).toBe(
      "transfer(address,uint256) [4-byte best effort]"
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
