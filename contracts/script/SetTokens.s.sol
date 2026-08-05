// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {NuroStaking} from "../src/NuroStaking.sol";

/**
 * Configure the $NURO token on an already-deployed NuroStaking, at launch.
 * Must be run by the OWNER key. One-shot: reverts if tokens are already set.
 *
 * Required env:
 *   PRIVATE_KEY   owner key (must equal the staking contract's owner)
 *   STAKING       deployed NuroStaking address
 *   STAKE_TOKEN   $NURO ERC-20 (the launchpad mint address)
 *   REWARD_TOKEN  reward token (USDC/USDG for real yield, or = STAKE_TOKEN)
 *
 * Example:
 *   forge script script/SetTokens.s.sol:SetTokens --rpc-url robinhood --broadcast
 */
contract SetTokens is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        NuroStaking staking = NuroStaking(vm.envAddress("STAKING"));
        address stakeToken = vm.envAddress("STAKE_TOKEN");
        address rewardToken = vm.envAddress("REWARD_TOKEN");

        vm.startBroadcast(pk);
        staking.setTokens(stakeToken, rewardToken);
        vm.stopBroadcast();

        console2.log("Tokens set on:", address(staking));
        console2.log("  stakeToken:", stakeToken);
        console2.log("  rewardToken:", rewardToken);
    }
}
