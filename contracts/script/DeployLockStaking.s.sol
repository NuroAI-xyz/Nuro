// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {NuroLockStaking} from "../src/NuroLockStaking.sol";

/**
 * Deploy NuroLockStaking (fixed-term 6mo/1yr locks, fixed APY paid at maturity)
 * and optionally seed the reward pool in the same broadcast.
 *
 * Required env:
 *   PRIVATE_KEY   deployer key (should equal OWNER to seed the pool here)
 *   STAKE_TOKEN   $NURO ERC-20 (stake == reward token)
 *   OWNER         admin (funds/reclaims unreserved pool, tunes APY; never touches
 *                 principal or reserved rewards)
 * Optional env:
 *   APY_BPS       APY in basis points (default 1000 = 10%)
 *   FUND_AMOUNT   $NURO (base units) to seed the reward pool now (default 0)
 *
 * Run:
 *   forge script script/DeployLockStaking.s.sol:DeployLockStaking \
 *     --rpc-url robinhood --broadcast
 */
contract DeployLockStaking is Script {
    function run() external returns (NuroLockStaking staking) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address token = vm.envAddress("STAKE_TOKEN");
        address owner = vm.envAddress("OWNER");
        uint256 apyBps = vm.envOr("APY_BPS", uint256(1000));
        uint256 fundAmount = vm.envOr("FUND_AMOUNT", uint256(0));

        vm.startBroadcast(pk);
        staking = new NuroLockStaking(token, apyBps, owner);
        if (fundAmount > 0) {
            IERC20(token).approve(address(staking), fundAmount);
            staking.fundRewards(fundAmount);
        }
        vm.stopBroadcast();

        console2.log("NuroLockStaking deployed at:", address(staking));
        console2.log("  token:", token);
        console2.log("  owner:", owner);
        console2.log("  apyBps:", apyBps);
        console2.log("  reward pool funded:", fundAmount);
        console2.log("  availableRewards:", staking.availableRewards());
    }
}
