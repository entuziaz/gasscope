# GasScope (Under construction)

## Introduction

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

GasScope is a visual gas profiler that pinpoints exactly where gas is being spent inside a complex transaction. It solves the critical problem of gas optimization, which is currently a "guess-and-check" process. Users submit a transaction hash, and GasScope generates a "flame graph" showing the gas cost of every internal function call. It’s the Tx-Ray for performance, enabling developers to build highly efficient and cost-effective dApps on Rootstock.

### Intended Scope:
- [ ] Develop a backend service that uses the debug_traceTransaction RPC method, focusing on the gasCost for each step. 
- [x] Implement a parser to aggregate the gas costs per function call, building a tree-like data structure of the transaction's execution path. 
- [ ] Build a React frontend that accepts a transaction hash (or can be linked from Tx-Ray). 
- [ ] The UI will render the gas data as an interactive flame graph, allowing developers to instantly spot the most expensive function calls. 
- [ ] Display a simple "cost-by-opcode" breakdown to identify low-level gas sinks (e.g., SSTORE, LOG, CREATE). 
- [ ] Deploy as an open-source tool for the entire Rootstock developer community.


### Starting Folder Structure:

```text
GasScope (Next.js)
│
├─ app/
│   ├─ page.tsx              ← UI (tx input)
│   ├─ trace/
│   │   └─ route.ts          ← backend API (RPC call)
│   ├─ components/
│   │   ├─ FlameGraph.tsx
│   │   └─ OpcodeTable.tsx
│
├─ lib/
│   ├─ trace.ts             
│   ├─ parser.ts             ← call-tree builder
│   └─ types.ts              ← shared types
│
└─ package.json
```


## Getting Started

First, run the development server:

```bash
pnpm dev
```

Try to obtain a flame tree by supplying a real transaction hash with the following terminal command. Be sure to keep your rskj node running.

```bash
curl -X POST http://localhost:3000/trace \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0xded3d94dc58c6e7c2725ad3db893febfac805be6b8b0fb8a493c8a5db8585dc6"
  }'
```

You should get something like:

```bash
{
    "root": {
        "name": "ROOT",
        "value": 1108639
    }
}
```

or:

```bash
{
  "mode": "flame",
  "root": {
    "name": "ROOT",
    "value": 1108639
  },
  "opcodes": {
    "counts": {
      "PUSH1": 206,
      "MSTORE": 1,
      "CALLVALUE": 1,
      "DUP1": 804,
      "ISZERO": 403,
      "PUSH2": 1817,
      "JUMPI": 407,
      "JUMPDEST": 1616,
      "POP": 2814,
      "CALLDATASIZE": 2,
      "LT": 202,
      "PUSH0": 1007,
      "CALLDATALOAD": 2,
      "SHR": 1,
      "PUSH4": 2,
      "EQ": 3,
      "SUB": 2,
      "DUP2": 1008,
      "ADD": 402,
      "SWAP1": 1406,
      "SWAP2": 1205,
      "JUMP": 1410,
      "DUP3": 1202,
      "DUP5": 2,
      "SLT": 1,
      "DUP6": 1,
      "SWAP3": 602,
      "SLOAD": 200,
      "DUP4": 200,
      "GT": 200,
      "SSTORE": 200,
      "STOP": 1
    },
  }
}

```

To run tests:

```bash
pnpm test
```

Flamegraph Nodes:
A flame graph is uses nested flexboxes to represent:
- X-axis → proportional to value (gas)
- Y-axis → call depth
- Children sit on top of parents
- Siblings sit side-by-side

So every node renders:

```text
┌──────────────────────────────┐
│ CALL (400k gas)               │  ← width proportional to value
│ ┌──────────────┐ ┌─────────┐ │
│ │ CALL (250k)  │ │ CALL(150│ │
│ └──────────────┘ └─────────┘ │
└──────────────────────────────┘
```

