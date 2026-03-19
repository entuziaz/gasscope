# GasScope

<figure>
<img width="1271" height="696" alt="App screenshot" src="https://github.com/user-attachments/assets/b891a05b-b93e-4cb1-aea9-e171b3603808" />
<figcaption>App screenshot</figcaption>
</figure>

## Introduction

GasScope is a transaction gas profiler for Rootstock. The goal is to make gas analysis less of a guess-and-check process by showing where gas is spent inside a traced transaction, in a form that is fast to inspect.

Currently, the app exposes two backend trace modes from the same transaction: opcode-level gas breakdown and external call frames. The UI also includes an experimental function-attribution card, but it is currently a placeholder derived locally and does not trigger an additional backend trace request.

## Requirements

- A Rootstock RPC node with `debug_traceTransaction` enabled
- `RSK_RPC_URL` pointing to that node
- If you need an RSKj node, use the official Rootstock setup guides for [CLI](https://dev.rootstock.io/node-operators/setup/node-runner/cli/), [macOS](https://dev.rootstock.io/node-operators/setup/node-runner/macos/), [Linux](https://dev.rootstock.io/node-operators/setup/node-runner/linux/), or [Windows](https://dev.rootstock.io/node-operators/setup/node-runner/windows/).

Example `.env.local`:

```bash
RSK_RPC_URL="http://localhost:4444"
```

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs at `http://localhost:3000`.

<figure>
<img width="1026" height="699" alt="Tracing a transaction" src="https://github.com/user-attachments/assets/57775bc6-716c-487d-9f6e-769ea53d7685" />
<figcaption>GasScope in action</figcaption>
</figure>

## Example request

```bash
curl -X POST http://localhost:3000/trace \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xded3d94dc58c6e7c2725ad3db893febfac805be6b8b0fb8a493c8a5db8585dc6",
    "mode": "calls"
  }'
```

Example response shape:

```json
{
  "mode": "calls",
  "root": {
    "name": "CALL",
    "value": 1108639,
    "children": []
  }
}
```

## Current outputs

- `opcode`: aggregated gas usage by opcode category
- `calls`: external call tree from `callTracer`

## Notes

- `opcode` mode is parsed server-side from streamed `structLogs` rather than loading the entire RPC JSON response into memory first.
- The experimental Solidity-level function attribution card in the UI is currently a placeholder. Accurate labels still require verified source, compiler metadata, and sourcemaps.
