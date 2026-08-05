# Nuro contracts

On-chain layer for the $NURO economy on **Robinhood Chain** (EVM L2). Built with
Foundry.

> ⚠️ **Audit gate.** These contracts are a tested, devnet-ready foundation. They
> **must** be independently audited before they custody real funds on mainnet.
> Nothing here is "proven" until it passes that gate - same discipline as the
> inference side of Nuro.

---

## The economic model - token, revenue, GPUs, swarm

**$NURO** is an ERC-20 launched externally (Robinhood launchpad). It is three
things at once:

1. **Metering unit** - inference is billed in it (or a stable, settled to it).
2. **Staking asset** - stake it to earn a share of network revenue.
3. **Governance** - later, stakers govern privacy parameters.

### Money flow (real yield)

Every paid inference request is settled and split. Recommended split:

```
          user pays for inference (USDC or $NURO)
                          │
              ┌───────────┴───────────┐
              ▼           ▼            ▼
        ~60% GPU      ~30% Treasury  ~10% Staking pool
        workers       (privacy R&D)  (fundRewards → stakers)
```

- **GPU workers (~60%)** are paid **per job**, and a payout only releases against
  a **valid correctness/privacy receipt** - the same receipt discipline the
  research uses to prove the swarm ran your job correctly and privately. The
  receipt is the proof-of-work gate for getting paid. (Off-chain settlement
  service verifies receipts, then triggers payouts.)
- **Treasury (~30%)** funds the privacy research (matches the site copy).
- **Staking pool (~10%)** is fed by calling `fundRewards(amount)` on
  `NuroStaking`, which distributes pro-rata to everyone currently staked.

The split percentages are **policy, enforced by the off-chain settlement service**
(and, later, a `Settlement` contract - see Roadmap). `NuroStaking` only needs to
receive its slice via `fundRewards`.

### How staking pays real yield

`NuroStaking` uses the MasterChef `accRewardPerShare` accumulator:

- `fundRewards(x)` raises `accRewardPerShare` by `x / totalStaked`.
- Each staker's claimable balance = their share of everything funded **while they
  were staked**. Late joiners never dilute past rewards; leavers stop earning.
- O(1) per user - no loops, no keeper needed to "drip".

### Self-custody guarantees

- Principal is per-user and withdrawable **only by that user's wallet**.
- There is **no** admin function that can move, seize, or slash principal or owed
  rewards. `rescueToken` is hard-blocked from the stake/reward tokens.
- Owner can only: set the unstake cooldown (≤ 7 days) and rescue *unrelated*
  tokens sent by mistake.

---

## Contract: `NuroStaking`

| Function | Who | What |
|---|---|---|
| `stake(amount)` | user | lock $NURO (settles pending first) |
| `unstake(amount)` | user | withdraw principal after cooldown |
| `claim()` | user | withdraw accrued rewards |
| `compound()` | user | restake rewards (only if reward == $NURO) |
| `fundRewards(amount)` | treasury/settlement | distribute revenue to stakers |
| `setUnstakeCooldown(s)` | owner | 0…7 days |
| `pendingRewards(user)` / `users(user)` / `totalStaked` | view | UI reads |

Decimal-safe (`1e27` precision, handles USDC-6 vs $NURO-18) and fee-on-transfer
tolerant (credits actual received balance).

---

## Build, test, deploy

```bash
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-git  # first time
forge build
forge test -vv          # 9 tests, incl. pro-rata + self-custody invariants

# deploy (fill contracts/.env from .env.example first)
cp .env.example .env     # set STAKE_TOKEN, REWARD_TOKEN, OWNER, RPC_URL, PRIVATE_KEY…
forge script script/DeployStaking.s.sol:DeployStaking --rpc-url robinhood --broadcast --verify
```

`REWARD_TOKEN` = USDC address for **real yield**, or the same as `STAKE_TOKEN`
to pay rewards in $NURO (which also enables `compound`).

---

## Wire the website to the deployed contract

Add to `website/.env` (all read at build time by Vite):

```bash
VITE_CHAIN_ID=<robinhood_chain_id>
VITE_CHAIN_RPC_URL=https://<robinhood_rpc>
VITE_CHAIN_NAME=Robinhood Chain
VITE_CHAIN_EXPLORER=https://<explorer>
VITE_CHAIN_CURRENCY_SYMBOL=ETH

VITE_NURO_TOKEN_ADDRESS=0x<nuro_erc20>
VITE_REWARD_TOKEN_ADDRESS=0x<usdc_or_nuro>
VITE_STAKING_ADDRESS=0x<deployed_NuroStaking>
```

Until `VITE_STAKING_ADDRESS` + `VITE_NURO_TOKEN_ADDRESS` + RPC are set, the
`/staking` page shows a "coming online" state (no broken calls).

---

## Roadmap (deferred, named not claimed)

- **`Settlement` contract** - split inference payments on-chain
  (workers / treasury / staking) so the revenue policy is trustless, not just an
  off-chain service.
- **Worker registry + slashing** - stake $NURO as worker collateral; slash on a
  failed compute/privacy receipt. (Research item, kept separate from custody.)
- **Governance** - stakers vote privacy parameters and the revenue split.
