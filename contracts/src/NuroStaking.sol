// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NuroStaking
 * @notice Self-custody $NURO staking with real-yield rewards.
 *
 * Design
 * ------
 * - **Self-custody.** A user's principal is tracked per-user and can only ever be
 *   withdrawn by that user. There is deliberately NO owner/admin path that can
 *   move, seize, or slash staked principal or owed rewards. `rescueToken` is
 *   explicitly forbidden from touching the stake or reward token.
 * - **Deferred token config.** The contract can be deployed before $NURO exists.
 *   The owner sets the stake/reward token addresses exactly once via {setTokens}
 *   at launch; staking is disabled until then and the addresses are immutable
 *   thereafter, so anyone who stakes is guaranteed the token can't be swapped.
 * - **Real yield.** Rewards are not emitted on a fixed schedule. Network revenue
 *   (USDC, or $NURO) is deposited via {fundRewards}, which raises a global
 *   `accRewardPerShare` accumulator. Each staker's claimable balance is their
 *   pro-rata share of everything funded while they were staked (MasterChef
 *   accounting - O(1) per user, no unbounded loops).
 * - **Decimal-safe.** `ACC_PRECISION = 1e27` keeps accounting precise even when
 *   the reward token (e.g. USDC, 6 decimals) has fewer decimals than the stake
 *   token (e.g. $NURO, 18 decimals).
 * - **Fee-on-transfer tolerant.** Deposits credit the *actual* received balance,
 *   so a launchpad token with a transfer tax still accounts correctly.
 *
 * @dev SECURITY: devnet/testnet-ready foundation. MUST be independently audited
 *      before custodying real funds on mainnet.
 */
contract NuroStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @dev Fixed-point precision for the reward accumulator.
    uint256 public constant ACC_PRECISION = 1e27;
    /// @dev Hard cap on the unstake cooldown the owner may configure.
    uint256 public constant MAX_COOLDOWN = 7 days;

    /// @notice The staked token ($NURO). Set once by the owner at token launch.
    IERC20 public stakeToken;
    /// @notice The reward token (USDC/USDG for real yield, or $NURO).
    IERC20 public rewardToken;
    /// @notice Whether rewards are paid in the stake token (enables {compound}).
    bool public rewardIsStake;
    /// @notice True once the owner has configured the token addresses at launch.
    bool public tokensSet;

    /// @notice Global accumulator: rewards per staked unit, scaled by ACC_PRECISION.
    uint256 public accRewardPerShare;
    /// @notice Total principal currently staked.
    uint256 public totalStaked;
    /// @notice Lifetime rewards deposited via {fundRewards}.
    uint256 public totalRewardsFunded;
    /// @notice Seconds a user must wait after their last stake before unstaking.
    uint256 public unstakeCooldown;

    struct UserInfo {
        uint256 amount; // staked principal
        uint256 rewardDebt; // accounting checkpoint (amount * accRewardPerShare / PRECISION)
        uint256 pending; // settled-but-unclaimed rewards
        uint256 lastStakeTime; // timestamp of most recent stake/compound
    }

    mapping(address => UserInfo) public users;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);
    event Compounded(address indexed user, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount, uint256 accRewardPerShare);
    event CooldownUpdated(uint256 cooldown);
    event TokensSet(address indexed stakeToken, address indexed rewardToken);

    /// @param _cooldown Unstake cooldown in seconds (0 = unstake anytime).
    /// @param _owner    Admin: sets the token addresses once at launch, tunes the
    ///                  cooldown, and rescues non-core tokens. Can NEVER move user funds.
    constructor(uint256 _cooldown, address _owner) Ownable(_owner) {
        require(_cooldown <= MAX_COOLDOWN, "cooldown too long");
        unstakeCooldown = _cooldown;
    }

    /// @notice Configure the stake + reward tokens once, at $NURO launch.
    /// @dev One-shot and owner-only. Staking is disabled until this is called and
    ///      the addresses can never change afterwards, so the self-custody
    ///      guarantee holds for everyone who stakes after launch. Pass the same
    ///      address for both to pay $NURO rewards (enables {compound}).
    function setTokens(address _stakeToken, address _rewardToken) external onlyOwner {
        require(!tokensSet, "tokens already set");
        require(_stakeToken != address(0) && _rewardToken != address(0), "zero token");
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
        rewardIsStake = _stakeToken == _rewardToken;
        tokensSet = true;
        emit TokensSet(_stakeToken, _rewardToken);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Rewards `user` could claim right now.
    function pendingRewards(address user) external view returns (uint256) {
        UserInfo storage u = users[user];
        uint256 accumulated = (u.amount * accRewardPerShare) / ACC_PRECISION;
        return u.pending + (accumulated - u.rewardDebt);
    }

    /// @notice Timestamp after which `user` may unstake.
    function unlockTime(address user) external view returns (uint256) {
        return users[user].lastStakeTime + unstakeCooldown;
    }

    // ------------------------------------------------------------------
    // Rewards funding (called by the settlement layer / treasury)
    // ------------------------------------------------------------------

    /// @notice Deposit `amount` reward tokens and distribute pro-rata to stakers.
    /// @dev Reverts if nothing is staked so revenue is never stranded.
    function fundRewards(uint256 amount) external nonReentrant {
        require(tokensSet, "tokens not set");
        require(amount > 0, "zero amount");
        require(totalStaked > 0, "no stakers");

        uint256 before = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = rewardToken.balanceOf(address(this)) - before;
        require(received > 0, "no reward received");

        accRewardPerShare += (received * ACC_PRECISION) / totalStaked;
        totalRewardsFunded += received;
        emit RewardsFunded(msg.sender, received, accRewardPerShare);
    }

    // ------------------------------------------------------------------
    // User actions (self-custody)
    // ------------------------------------------------------------------

    /// @notice Stake `amount` of $NURO.
    function stake(uint256 amount) external nonReentrant {
        require(tokensSet, "tokens not set");
        require(amount > 0, "zero amount");
        UserInfo storage u = users[msg.sender];
        _settle(u);

        uint256 before = stakeToken.balanceOf(address(this));
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakeToken.balanceOf(address(this)) - before;
        require(received > 0, "no stake received");

        u.amount += received;
        totalStaked += received;
        u.lastStakeTime = block.timestamp;
        _syncDebt(u);
        emit Staked(msg.sender, received);
    }

    /// @notice Withdraw `amount` of staked principal after the cooldown.
    function unstake(uint256 amount) external nonReentrant {
        UserInfo storage u = users[msg.sender];
        require(amount > 0, "zero amount");
        require(u.amount >= amount, "insufficient stake");
        require(block.timestamp >= u.lastStakeTime + unstakeCooldown, "cooldown active");

        _settle(u);
        u.amount -= amount;
        totalStaked -= amount;
        _syncDebt(u);

        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Claim accrued rewards.
    function claim() external nonReentrant {
        UserInfo storage u = users[msg.sender];
        _settle(u);
        uint256 amount = u.pending;
        require(amount > 0, "nothing to claim");
        u.pending = 0;
        _syncDebt(u);

        rewardToken.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Restake accrued rewards as principal (only when rewards == $NURO).
    function compound() external nonReentrant {
        require(rewardIsStake, "compound unavailable");
        UserInfo storage u = users[msg.sender];
        _settle(u);
        uint256 amount = u.pending;
        require(amount > 0, "nothing to compound");
        u.pending = 0;

        u.amount += amount;
        totalStaked += amount;
        u.lastStakeTime = block.timestamp;
        _syncDebt(u);
        emit Compounded(msg.sender, amount);
    }

    // ------------------------------------------------------------------
    // Owner (non-custodial parameters only)
    // ------------------------------------------------------------------

    function setUnstakeCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown <= MAX_COOLDOWN, "cooldown too long");
        unstakeCooldown = _cooldown;
        emit CooldownUpdated(_cooldown);
    }

    /// @notice Rescue tokens accidentally sent here. Can NEVER touch the stake or
    ///         reward token, preserving the self-custody guarantee.
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(stakeToken) && token != address(rewardToken), "core token");
        require(to != address(0), "zero to");
        IERC20(token).safeTransfer(to, amount);
    }

    // ------------------------------------------------------------------
    // Internal accounting
    // ------------------------------------------------------------------

    function _settle(UserInfo storage u) internal {
        if (u.amount > 0) {
            uint256 accumulated = (u.amount * accRewardPerShare) / ACC_PRECISION;
            u.pending += accumulated - u.rewardDebt;
        }
    }

    function _syncDebt(UserInfo storage u) internal {
        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;
    }
}
