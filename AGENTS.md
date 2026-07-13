# Project Overview

This project is a side-scrolling Web3 game built on the Avalanche Fuji Testnet.

Users connect a wallet and play through game stages. After completing a stage,
the server validates the result and awards ERC-20 game tokens. Equipment earned
in the game can be minted as ERC-721 NFTs and traded for game tokens in the
marketplace.

## Tech Stack

- Next.js App Router
- TypeScript with strict mode
- Phaser 3
- wagmi
- viem
- RainbowKit
- Solidity
- Hardhat
- Avalanche Fuji Testnet
- Zustand
- Tailwind CSS
- Supabase

## Architecture Rules

- Keep game logic and blockchain logic separate.
- Place Phaser code under `src/game`.
- Place smart contracts under `contracts`.
- Place Web3-related code under `src/features/web3`.
- Place shared UI components under `src/components`.
- Do not use the `any` type.
- Never hard-code environment variables, secrets, or private keys.
- Every transaction flow must expose `pending`, `success`, and `error` states.
- Run lint and type checking after implementation.

## Security Rules

- The game client must never determine its own reward amount.
- The server must validate every stage-clear result before a reward is issued.
- A user must not be able to claim the same stage reward more than once.
- Smart-contract minting permissions must be restricted to an administrator or
  an authorized reward contract.
- Never commit `.env` files or private keys to Git.

## MVP Scope

1. Wallet connection
2. One side-scrolling stage
3. Monsters and a boss
4. Stage-clear flow
5. ERC-20 reward claiming
6. NFT item minting
7. Inventory
8. Marketplace listing and purchasing
9. Transaction history

## Definition of Done

- Code follows the directory boundaries and security rules above.
- Blockchain transactions provide visible pending, success, and error feedback.
- Relevant tests pass.
- Lint passes.
- Type checking passes with TypeScript strict mode enabled.
