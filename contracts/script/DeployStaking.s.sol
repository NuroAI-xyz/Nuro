// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {NuroStaking} from "../src/NuroStaking.sol";

/**
 * Deploy NuroStaking BEFORE $NURO exists.
 *
 * The token addresses are NOT set here - the owner calls {setTokens} at launch
 * (see SetTokens.s.sol). Deploy with cooldown 0 so users can unstake anytime.
 *
 * Required env:
 *   PRIVATE_KEY       deployer key
 *   UNSTAKE_COOLDOWN  seconds (0 = unstake anytime; max 604800 = 7 days)
 *   OWNER             admin address (sets tokens once, tunes cooldown, rescues
 *                     non-core tokens; can NEVER touch user funds)
 *
 * Example:
 *   forge script script/DeployStaking.s.sol:DeployStaking \
 *     --rpc-url robinhood --broadcast
 */
contract DeployStaking is Script {
    function run() external returns (NuroStaking staking) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 cooldown = vm.envOr("UNSTAKE_COOLDOWN", uint256(0));
        address owner = vm.envAddress("OWNER");

        vm.startBroadcast(pk);
        staking = new NuroStaking(cooldown, owner);
        vm.stopBroadcast();

        console2.log("NuroStaking deployed at:", address(staking));
        console2.log("  owner:", owner);
        console2.log("  cooldown:", cooldown);
        console2.log("  tokensSet:", staking.tokensSet());
        console2.log("Next: owner calls setTokens(nuro, reward) at launch.");
    }
}
