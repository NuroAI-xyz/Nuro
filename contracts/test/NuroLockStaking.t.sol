// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NuroLockStaking} from "../src/NuroLockStaking.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Nuro", "NURO") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract NuroLockStakingTest is Test {
    NuroLockStaking staking;
    MockERC20 nuro;

    address owner = address(0xABCD);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant APY_BPS = 1000; // 10%

    function setUp() public {
        nuro = new MockERC20();
        staking = new NuroLockStaking(address(nuro), APY_BPS, owner);

        // Seed users and the reward pool.
        nuro.mint(alice, 10_000e18);
        nuro.mint(bob, 10_000e18);
        nuro.mint(owner, 100_000e18);

        vm.startPrank(owner);
        nuro.approve(address(staking), type(uint256).max);
        staking.fundRewards(10_000e18);
        vm.stopPrank();
    }

    function _stake(address who, uint256 amount, NuroLockStaking.Term term)
        internal
        returns (uint256 id)
    {
        vm.startPrank(who);
        nuro.approve(address(staking), amount);
        id = staking.stake(amount, term);
        vm.stopPrank();
    }

    function testQuoteReward() public view {
        // 1-year at 10% APY => exactly 10% of principal.
        assertEq(staking.quoteReward(1_000e18, NuroLockStaking.Term.OneYear), 100e18);
        // 6-month => ~ (182/365)*10% = 4.986%. Use a variable principal so the
        // expected value is computed with the same runtime integer division as
        // the contract (all-literal math would fold to a rejected fraction).
        uint256 principal = 1_000e18;
        uint256 expectedSixMo = (principal * 1000 * 182 days) / (365 days * 10_000);
        assertEq(staking.quoteReward(principal, NuroLockStaking.Term.SixMonths), expectedSixMo);
    }

    function testOneYearFullCycle() public {
        uint256 id = _stake(alice, 1_000e18, NuroLockStaking.Term.OneYear);
        assertEq(staking.totalStaked(), 1_000e18);
        assertEq(staking.totalReserved(), 100e18);

        // Can't withdraw before maturity.
        vm.prank(alice);
        vm.expectRevert("still locked");
        staking.withdraw(id);

        vm.warp(block.timestamp + 365 days);
        uint256 pre = nuro.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(id);
        // principal (1000) + reward (100).
        assertEq(nuro.balanceOf(alice) - pre, 1_100e18);
        assertEq(staking.totalStaked(), 0);
        assertEq(staking.totalReserved(), 0);
    }

    function testSixMonthCycle() public {
        uint256 amount = 2_000e18;
        uint256 expectedReward = staking.quoteReward(amount, NuroLockStaking.Term.SixMonths);
        uint256 id = _stake(alice, amount, NuroLockStaking.Term.SixMonths);

        vm.warp(block.timestamp + 182 days);
        uint256 pre = nuro.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(id);
        assertEq(nuro.balanceOf(alice) - pre, amount + expectedReward);
    }

    function testInsufficientRewardPoolReverts() public {
        // Drain surplus: reserve almost the whole pool. Pool = 10_000 reward.
        // A 1-year stake of 100_000 would reserve 10_000 exactly (ok), 100_001 fails.
        nuro.mint(alice, 200_000e18);
        vm.startPrank(alice);
        nuro.approve(address(staking), type(uint256).max);
        staking.stake(100_000e18, NuroLockStaking.Term.OneYear); // reserves exactly 10_000
        assertEq(staking.availableRewards(), 0);
        vm.expectRevert("insufficient reward pool");
        staking.stake(1_000e18, NuroLockStaking.Term.OneYear);
        vm.stopPrank();
    }

    function testEmergencyWithdrawReturnsPrincipalForfeitsReward() public {
        uint256 id = _stake(alice, 1_000e18, NuroLockStaking.Term.OneYear);
        assertEq(staking.totalReserved(), 100e18);

        uint256 pre = nuro.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(id);
        assertEq(nuro.balanceOf(alice) - pre, 1_000e18); // principal only
        assertEq(staking.totalReserved(), 0); // reward released back to pool
        assertEq(staking.totalStaked(), 0);
    }

    function testOwnerCanOnlyWithdrawUnreservedSurplus() public {
        _stake(alice, 1_000e18, NuroLockStaking.Term.OneYear); // reserves 100
        // Surplus = pool(10_000) - reserved(100) = 9_900.
        assertEq(staking.availableRewards(), 9_900e18);

        vm.startPrank(owner);
        vm.expectRevert("exceeds surplus");
        staking.withdrawExcessRewards(owner, 9_901e18);
        staking.withdrawExcessRewards(owner, 9_900e18); // ok
        vm.stopPrank();

        // Principal + reserved reward remain fully backed.
        assertEq(nuro.balanceOf(address(staking)), 1_000e18 + 100e18);
    }

    function testOwnerCannotTouchPrincipalOrReserved() public {
        _stake(alice, 1_000e18, NuroLockStaking.Term.OneYear);
        // After surplus reclaimed, availableRewards == 0, so owner can pull nothing.
        uint256 avail = staking.availableRewards();
        vm.prank(owner);
        staking.withdrawExcessRewards(owner, avail);
        assertEq(staking.availableRewards(), 0);
        vm.prank(owner);
        vm.expectRevert("exceeds surplus");
        staking.withdrawExcessRewards(owner, 1);
    }

    function testSetApyOnlyAffectsFutureStakes() public {
        uint256 id1 = _stake(alice, 1_000e18, NuroLockStaking.Term.OneYear); // 10% -> 100
        vm.prank(owner);
        staking.setApy(2000); // 20%
        uint256 id2 = _stake(bob, 1_000e18, NuroLockStaking.Term.OneYear); // 20% -> 200

        assertEq(staking.getPosition(alice, id1).reward, 100e18);
        assertEq(staking.getPosition(bob, id2).reward, 200e18);
    }

    function testApyCapEnforced() public {
        vm.prank(owner);
        vm.expectRevert("apy too high");
        staking.setApy(5001);
    }

    function testMultiplePositionsPerUser() public {
        _stake(alice, 500e18, NuroLockStaking.Term.SixMonths);
        _stake(alice, 700e18, NuroLockStaking.Term.OneYear);
        assertEq(staking.positionCount(alice), 2);
        assertEq(staking.totalStaked(), 1_200e18);
    }
}
