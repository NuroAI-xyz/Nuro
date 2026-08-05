// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NuroStaking} from "../src/NuroStaking.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable _dec;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _dec = d;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract NuroStakingTest is Test {
    NuroStaking staking;
    MockERC20 nuro; // 18 decimals
    MockERC20 usdc; // 6 decimals (real-yield reward)

    address owner = address(0xABCD);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address treasury = address(0x7EE);

    function setUp() public {
        nuro = new MockERC20("Nuro", "NURO", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        staking = new NuroStaking(0, owner);
        vm.prank(owner);
        staking.setTokens(address(nuro), address(usdc));

        nuro.mint(alice, 1_000e18);
        nuro.mint(bob, 1_000e18);
        usdc.mint(treasury, 1_000_000e6);

        vm.prank(alice);
        nuro.approve(address(staking), type(uint256).max);
        vm.prank(bob);
        nuro.approve(address(staking), type(uint256).max);
        vm.prank(treasury);
        usdc.approve(address(staking), type(uint256).max);
    }

    function _stake(address who, uint256 amount) internal {
        vm.prank(who);
        staking.stake(amount);
    }

    function _fund(uint256 amount) internal {
        vm.prank(treasury);
        staking.fundRewards(amount);
    }

    function test_RewardsSplitProRata() public {
        _stake(alice, 100e18); // 25%
        _stake(bob, 300e18); // 75%

        _fund(1_000e6); // 1,000 USDC

        assertApproxEqAbs(staking.pendingRewards(alice), 250e6, 1);
        assertApproxEqAbs(staking.pendingRewards(bob), 750e6, 1);
    }

    function test_NoRewardsBeforeStaking() public {
        _stake(alice, 100e18);
        _fund(100e6); // only alice staked -> all to alice
        _stake(bob, 100e18); // bob joins AFTER funding

        assertApproxEqAbs(staking.pendingRewards(alice), 100e6, 1);
        assertEq(staking.pendingRewards(bob), 0);
    }

    function test_ClaimTransfersRewards() public {
        _stake(alice, 100e18);
        _fund(500e6);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        staking.claim();
        assertApproxEqAbs(usdc.balanceOf(alice) - before, 500e6, 1);
        assertEq(staking.pendingRewards(alice), 0);
    }

    function test_UnstakeReturnsPrincipal() public {
        _stake(alice, 100e18);
        uint256 before = nuro.balanceOf(alice);
        vm.prank(alice);
        staking.unstake(100e18);
        assertEq(nuro.balanceOf(alice) - before, 100e18);
        assertEq(staking.totalStaked(), 0);
    }

    function test_FundRevertsWithNoStakers() public {
        vm.prank(treasury);
        vm.expectRevert(bytes("no stakers"));
        staking.fundRewards(100e6);
    }

    function test_CooldownBlocksEarlyUnstake() public {
        vm.prank(owner);
        staking.setUnstakeCooldown(1 days);
        _stake(alice, 100e18);

        vm.prank(alice);
        vm.expectRevert(bytes("cooldown active"));
        staking.unstake(50e18);

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        staking.unstake(50e18); // ok now
        (uint256 amt,,,) = staking.users(alice);
        assertEq(amt, 50e18);
    }

    function test_RescueForbidsCoreTokens() public {
        vm.prank(owner);
        vm.expectRevert(bytes("core token"));
        staking.rescueToken(address(nuro), owner, 1);
    }

    function test_CompoundUnavailableWhenRewardDiffers() public {
        _stake(alice, 100e18);
        _fund(100e6);
        vm.prank(alice);
        vm.expectRevert(bytes("compound unavailable"));
        staking.compound();
    }

    function test_SetTokensIsOneShot() public {
        vm.prank(owner);
        vm.expectRevert(bytes("tokens already set"));
        staking.setTokens(address(nuro), address(usdc));
    }

    function test_SetTokensOnlyOwner() public {
        NuroStaking fresh = new NuroStaking(0, owner);
        vm.prank(alice);
        vm.expectRevert();
        fresh.setTokens(address(nuro), address(usdc));
    }

    function test_StakeBlockedUntilTokensSet() public {
        NuroStaking fresh = new NuroStaking(0, owner);
        vm.prank(alice);
        vm.expectRevert(bytes("tokens not set"));
        fresh.stake(1e18);
    }

    function test_UnstakeAnytimeWithZeroCooldown() public {
        _stake(alice, 100e18);
        // no warp: cooldown is 0, so unstake succeeds immediately
        vm.prank(alice);
        staking.unstake(100e18);
        assertEq(staking.totalStaked(), 0);
    }

    function test_LateJoinerDoesNotDilutePastRewards() public {
        _stake(alice, 100e18);
        _fund(100e6); // alice earns 100
        _stake(bob, 100e18);
        _fund(100e6); // split 50/50

        assertApproxEqAbs(staking.pendingRewards(alice), 150e6, 2);
        assertApproxEqAbs(staking.pendingRewards(bob), 50e6, 2);
    }
}
