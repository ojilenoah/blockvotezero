# BlockVote — Blockchain Voting Protocol

A full-stack voting platform where every ballot is recorded on a public blockchain. Built to explore whether elections can be made tamper-evident and independently verifiable without surrendering UX.

**Live contract:** [`0xc0895D…65B5` on Polygon Amoy](https://amoy.polygonscan.com/address/0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5) — 44+ real elections deployed
**Stack:** React · TypeScript · Solidity · Polygon · Supabase · Tailwind
**Status:** Deployed · Source on GitHub

---

## The problem

Conventional voting systems require trusting a central authority with both the ballot box and the count. There's no way for a voter, an observer, or a journalist to independently confirm that the result on screen matches the votes that were cast. BlockVote replaces that opaque pipeline with a public smart contract — every vote is a signed transaction anyone can audit.

## What I built

- A **Solidity voting contract** deployed on Polygon Amoy that manages election lifecycle, candidate registration, and tamper-evident vote tallying.
- A **React + TypeScript front-end** that reads election state, displays live results, and lets registered voters cast ballots through MetaMask.
- A **Supabase-backed identity layer** for NIN (National Identification Number) registration, voter-status tracking, and admin authentication.
- A **brutalist design system** with full light/dark theming, animated state transitions (Framer Motion), and a Duolingo-style button language for primary actions.
- A **public blockchain explorer** built into the app — every contract transaction reconstructed from on-chain state and presented next to the election timeline.

## Engineering highlights

**Multicall3-batched contract reads.** Loading the home page used to fire 3 RPC calls per election sequentially. I rewrote the read path to encode every `getElectionInfo` / `getAllCandidates` / `getTotalVotes` call into a single `aggregate3` invocation against Multicall3 — N elections fetch in one round-trip instead of 3N.

**Persistent client-side cache.** A small TTL cache backed by `localStorage` with custom `Date` rehydration (the JSON.stringify replacer is bound to its holder object to survive `Date.toJSON()`). Warm reloads skip the network entirely.

**Hybrid backend.** A single env flag (`VITE_DEMO_MODE`) swaps the entire data layer between live Polygon contract reads and a Supabase-backed mock. The mock generates the same transaction shape as the chain, so the UI never knows which is wired in — handy for offline development, screenshots, and demos that don't need gas.

**Real-tx reconstruction without an indexer.** The contract emits no events, so traditional `eth_getLogs` filtering returns nothing. The Explorer's transaction feed is reconstructed entirely from contract state (election count → per-election createElection entry → per-vote castVote entry), so it works on a vanilla Alchemy free tier without paying for an indexer.

**Optional Etherscan path.** When a key is configured, the Explorer prefers Etherscan's V2 indexed transaction list and surfaces real on-chain hashes that link back to PolygonScan.

## Stack

| Layer | Choices |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query |
| UI | Tailwind CSS, Shadcn/UI, Framer Motion, Recharts |
| Wallet | MetaMask, ethers.js v6, `@metamask/detect-provider` |
| Blockchain | Solidity, Polygon Amoy testnet, Multicall3 |
| Backend | Supabase (Postgres + Auth), Express (dev), Vercel serverless |
| Tooling | esbuild, drizzle-kit, etherscan v2 API |

## What I'd do differently

The first version stored admin status in `sessionStorage`, which anyone could spoof from DevTools. I rebuilt that on top of Supabase Auth — email + password, server-validated session, real JWT. The lesson: a wallet address allow-list reads as authentication but isn't one. Sign-ins need a signed challenge or a real auth provider.

If I shipped this further, the next priorities would be: route-level code splitting (the main bundle is 400 KB gzipped — `lazy()` on `/admin/*` and `/explorer` cuts ~30% off the first load), tightening Supabase RLS policies for production, and migrating the contract to an upgradeable proxy so I can patch the missing events without redeploying state.

## Links

- **Source:** `<your-github-repo-url>`
- **Live deploy:** `<your-vercel-deploy-url>`
- **Smart contract:** [amoy.polygonscan.com/address/0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5](https://amoy.polygonscan.com/address/0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5)
