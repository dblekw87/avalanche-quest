# Web3 Network and Deployment Policy

## Chain registry

All layers consume one reviewed network registry containing environment name,
chain ID, native currency, RPC reference, explorer, confirmation policy, deployed
addresses, deployment block, ABI version, and feature flags. Contract addresses
are keyed by chain ID; never infer an address from a network label.

Validate RPC-reported chain ID at startup and before deployment. Public client RPCs
and server RPCs may differ, but must resolve to the same chain. Use multiple RPC
providers with bounded retries for production reads; never log provider credentials.

## Environment classes

| Environment | Examples | Assets | Required controls |
| --- | --- | --- | --- |
| Local | Hardhat simulated chain | disposable | automated deployment and resets allowed |
| Testnet | Fuji `43113`, Arbitrum Sepolia `421614` | no intended value | dedicated keys, faucet-only funds, source verification |
| Mainnet | Avalanche C-Chain `43114`, Arbitrum One `42161` | real value | multisig/hardware wallet, simulation, independent review, explicit human approval |

Chain IDs above are identifiers, not sufficient configuration. Confirm current RPC,
explorer, fee behavior, finality guidance, and platform requirements from official
sources when adding a network.

## Key and role separation

- Use separate player, deployer, reward signer, admin, pauser, relayer, and treasury
  identities. On mainnet, admin/treasury belong to reviewed multisigs where practical.
- Browser code may use public addresses and public RPC endpoints only.
- Secrets live in an approved secret manager, are least-privilege, rotatable, audited,
  and never printed by CI. `.env.example` contains names and comments, not values.
- Deployer authority is temporary. After setup, verify and revoke unnecessary roles.
- Reward signers have mint authorization only through narrow claim rules; they are not
  contract admins, deployers, or database superusers.

## Pre-deployment gate

- Pin compiler, optimizer, dependency, source commit, parameters, and deterministic
  artifacts; use the production compiler profile.
- Confirm target chain ID twice, sender, nonce, balance, gas policy, constructor args,
  CREATE/CREATE2 address expectations, and existing bytecode at target addresses.
- Run tests, static analysis/fuzzing when available, and a fork or equivalent
  simulation. Decode every planned transaction and admin call.
- Review token decimals/supply/cap, signer domain, role graph, pause state, ownership,
  proxy/admin/storage layout if applicable, marketplace token/NFT addresses, and event
  coverage. Prepare verification and monitoring commands before broadcast.

## Post-deployment gate

Record chain ID, addresses, transaction/block hashes, deployer, artifact hashes,
constructor args, compiler settings, deployment time, and reviewers. Verify source
and runtime bytecode, then test reads and a lowest-risk write. Confirm roles and revoke
temporary access. Update registry/ABI/indexer deployment blocks/UI and monitor events.

## Mainnet-specific rules

- Testnet success is necessary, not proof of mainnet safety.
- Never use test keys, browser hot wallets, public CI variables, unlimited automated
  spend, or a single personal EOA for durable administration.
- Show and approve the complete transaction batch; re-simulate against the latest
  state immediately before signing. Any target/calldata/value/nonce change invalidates
  prior approval.
- Immutable contracts have containment, migration, communication, and asset-recovery
  plans. Upgradeable systems require timelock/governance, storage tests, initializer
  protection, upgrade simulation, and public operational documentation.
- Cross-chain messaging, bridges, oracles, account abstraction, paymasters, swaps, and
  native-value settlement each require a separate threat model and specialist review.

## Finality and indexing

Confirmation depth is configurable per chain and asset risk. Indexers ingest with
overlap, deduplicate by `(chainId, txHash, logIndex)`, retain block hashes, rewind on
reorg, and distinguish observed from finalized. UI history may be eventually
consistent; balances and ownership come from chain reads when correctness matters.
