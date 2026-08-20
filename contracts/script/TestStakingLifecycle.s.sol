// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {NuroStaking} from "../src/NuroStaking.sol";

/**
 * End-to-end smoke test of a LIVE NuroStaking deployment, run from the owner key.
 * Exercises the full lifecycle in one broadcast and asserts the accounting:
 *
 *   approve -> stake(500) -> fundRewards(100) -> [pending == 100]
 *           -> compound()  [principal 500 -> 600]
 *           -> fundRewards(50) -> [pending == 50]
 *           -> claim()     [receive 50]
 *           -> unstake(600) [principal back]
 *
 * Because stake == reward == $NURO and we're the sole staker, the funded rewards
 * are our own tokens recycled, so the wallet's $NURO balance is net-neutral at
 * the end (minus gas). Nothing is left stranded in the contract.
 *
 * Required env: PRIVATE_KEY, STAKING, STAKE_TOKEN (== $NURO).
 * Run: forge script script/TestStakingLifecycle.s.sol:TestStakingLifecycle \
 *        --rpc-url robinhood --broadcast
 */
contract TestStakingLifecycle is Script {
    uint256 constant STAKE = 500e18;
    uint256 constant FUND1 = 100e18;
    uint256 constant FUND2 = 50e18;
    /// Rounding tolerance: MasterChef integer division leaves at most a few wei
    /// of dust in the pool, which is expected and economically negligible.
    uint256 constant DUST = 1e9;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        NuroStaking s = NuroStaking(vm.envAddress("STAKING"));
        IERC20 nuro = IERC20(vm.envAddress("STAKE_TOKEN"));

        uint256 startBal = nuro.balanceOf(me);
        console2.log("staker:", me);
        console2.log("start $NURO balance:", startBal);
        require(startBal >= STAKE + FUND1 + FUND2, "insufficient $NURO for test");
        require(s.totalStaked() == 0, "expected empty pool for clean test");

        vm.startBroadcast(pk);

        nuro.approve(address(s), STAKE + FUND1 + FUND2);

        s.stake(STAKE);
        (uint256 amt0,,,) = s.users(me);
        console2.log("after stake -> principal:", amt0);
        require(amt0 == STAKE, "stake principal mismatch");
        require(s.totalStaked() == STAKE, "totalStaked mismatch");

        s.fundRewards(FUND1);
        uint256 p1 = s.pendingRewards(me);
        console2.log("after fundRewards(100) -> pending:", p1);
        require(p1 == FUND1, "pending after fund1 mismatch");

        s.compound();
        (uint256 amt1,,,) = s.users(me);
        console2.log("after compound -> principal:", amt1);
        require(amt1 == STAKE + FUND1, "compounded principal mismatch");
        require(s.pendingRewards(me) == 0, "pending should reset after compound");

        s.fundRewards(FUND2);
        uint256 p2 = s.pendingRewards(me);
        console2.log("after fundRewards(50) -> pending:", p2);
        require(p2 <= FUND2 && FUND2 - p2 <= DUST, "pending after fund2 mismatch");

        uint256 preClaim = nuro.balanceOf(me);
        s.claim();
        uint256 claimed = nuro.balanceOf(me) - preClaim;
        console2.log("claimed:", claimed);
        require(claimed <= FUND2 && FUND2 - claimed <= DUST, "claimed amount mismatch");

        (uint256 principal,,,) = s.users(me);
        s.unstake(principal);
        (uint256 amtEnd,,,) = s.users(me);
        console2.log("after unstake -> principal:", amtEnd);
        require(amtEnd == 0, "principal should be zero after unstake");
        require(s.totalStaked() == 0, "pool should be empty after unstake");

        vm.stopBroadcast();

        uint256 endBal = nuro.balanceOf(me);
        console2.log("end $NURO balance:", endBal);
        require(endBal <= startBal && startBal - endBal <= DUST, "wallet balance should be net-neutral");
        require(nuro.balanceOf(address(s)) <= DUST, "contract should hold ~no $NURO");
        console2.log("LIFECYCLE OK: stake/fund/compound/claim/unstake all verified");
    }
}
