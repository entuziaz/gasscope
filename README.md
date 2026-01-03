# GasScope

## Introduction

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

GasScope is a visual gas profiler that pinpoints exactly where gas is being spent inside a complex transaction. It solves the critical problem of gas optimization, which is currently a "guess-and-check" process. Users submit a transaction hash, and GasScope generates a "flame graph" showing the gas cost of every internal function call. It’s the Tx-Ray for performance, enabling developers to build highly efficient and cost-effective dApps on Rootstock.

### Intended Scope:
- [] Develop a backend service that uses the debug_traceTransaction RPC method, focusing on the gasCost for each step. 
- [] Implement a parser to aggregate the gas costs per function call, building a tree-like data structure of the transaction's execution path. 
- [] Build a React frontend that accepts a transaction hash (or can be linked from Tx-Ray). 
- [] The UI will render the gas data as an interactive flame graph, allowing developers to instantly spot the most expensive function calls. 
- [] Display a simple "cost-by-opcode" breakdown to identify low-level gas sinks (e.g., SSTORE, LOG, CREATE). 
- [] Deploy as an open-source tool for the entire Rootstock developer community.


### Starting Folder Structure:

```text
GasScope (Next.js)
│
├─ app/
│   ├─ page.tsx              ← UI (tx input)
│   ├─ trace/
│   │   └─ route.ts          ← backend API
│   ├─ components/
│   │   ├─ FlameGraph.tsx
│   │   └─ OpcodeTable.tsx
│
├─ lib/
│   ├─ trace.ts              ← RPC call
│   ├─ parser.ts             ← call-tree builder
│   └─ types.ts              ← shared types
│
└─ package.json
```


## Getting Started

First, run the development server:

```bash
npm run dev
# or
pnpm dev
```
