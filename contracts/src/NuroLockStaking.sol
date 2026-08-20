// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NuroLockStaking
 * @notice Fixed-term $NURO staking with a guaranteed APY, paid at maturity.
 *
 * Design
 * ------
 * - **Two lock terms.** A staker locks $NURO for either 6 months or 1 year and
 *   is quoted a reward up front at a fixed annual rate (APY), pro-rated to the
 *   lock length: a 1-year lock at 10% APY earns 10% of principal; a 6-month
 *   lock earns ~5%.
 * - **Reward reserved at stake time.** The exact reward is computed and *locked
 *   in* when you stake, then reserved out of the contract's reward pool. Staking
 *   reverts if the pool can't cover it, so every accepted stake is fully funded
 *   and the promised payout can never be diluted by later stakers or an APY
 *   change.
 * - **Self-custody.** Principal + the reserved reward for a position can only be
 *   released to its owner. The owner/admin can NEVER move, seize, or slash a
 *   staker's principal or reserved reward — {withdrawExcessRewards} is capped to
 *   the *unreserved* surplus only.
 * - **Escape hatch.** {emergencyWithdraw} returns principal early (before
 *   maturity), forfeiting the reward back into the pool. Locking is about the
 *   yield, never about trapping principal.
 * - **Fee-on-transfer tolerant.** Deposits credit the actually received balance.
 *
 * @dev SECURITY: audit before custodying material value on mainnet.
 */
contract NuroLockStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @dev Basis-points denominator (100% = 10_000).
    uint256 public constant BPS = 10_000;
    /// @dev APY is annualised over 365 days.
    uint256 public constant YEAR = 365 days;
    /// @dev Safety cap on the configurable APY (50%).
    uint256 public constant MAX_APY_BPS = 5_000;

    /// @notice The staked + reward token ($NURO). Immutable once deployed.
    IERC20 public immutable token;

    /// @notice Annual percentage yield in basis points (1000 = 10%).
    uint256 public apyBps;

    enum Term {
        SixMonths,
        OneYear
    }

    /// @notice Lock length (seconds) for each term.
    uint256 public constant SIX_MONTHS = 182 days;
    uint256 public constant ONE_YEAR = 365 days;

    struct Position {
        uint256 amount; // principal
        uint256 reward; // reward locked in at stake time
        uint64 unlockAt; // timestamp principal + reward unlock
        bool withdrawn; // settled (normal or emergency)
    }

    mapping(address => Position[]) private _positions;

    /// @notice Total principal currently locked across all positions.
    uint256 public totalStaked;
    /// @notice Total rewards reserved (owed) across all open positions.
    uint256 public totalReserved;

    event Staked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 reward,
        uint64 unlockAt
    );
    event Withdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 reward
    );
    event EmergencyWithdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 forfeitedReward
    );
    event RewardsFunded(address indexed funder, uint256 amount);
    event ExcessRewardsWithdrawn(address indexed to, uint256 amount);
    event ApyUpdated(uint256 apyBps);

    /// @param _token $NURO ERC-20 (stake == reward token).
    /// @param _apyBps Initial APY in basis points (e.g. 1000 = 10%).
    /// @param _owner  Admin: funds/reclaims the *unreserved* reward pool and
    ///                tunes the APY for FUTURE stakes. Can never touch principal
    ///                or a position's reserved reward.
    constructor(address _token, uint256 _apyBps, address _owner) Ownable(_owner) {
        require(_token != address(0), "zero token");
        require(_apyBps <= MAX_APY_BPS, "apy too high");
        token = IERC20(_token);
        apyBps = _apyBps;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function termSeconds(Term term) public pure returns (uint256) {
        return term == Term.OneYear ? ONE_YEAR : SIX_MONTHS;
    }

    /// @notice Reward that `amount` would earn for `term` at the current APY.
    function quoteReward(uint256 amount, Term term) public view returns (uint256) {
        return (amount * apyBps * termSeconds(term)) / (YEAR * BPS);
    }

    /// @notice Reward tokens available to back NEW stakes (unreserved surplus).
    function availableRewards() public view returns (uint256) {
        uint256 bal = token.balanceOf(address(this));
        uint256 committed = totalStaked + totalReserved;
        return bal > committed ? bal - committed : 0;
    }

    function positionCount(address user) external view returns (uint256) {
        return _positions[user].length;
    }

    function getPosition(address user, uint256 id) external view returns (Position memory) {
        return _positions[user][id];
    }

    function getPositions(address user) external view returns (Position[] memory) {
        return _positions[user];
    }

    // ------------------------------------------------------------------
    // Staking
    // ------------------------------------------------------------------

    /// @notice Lock `amount` of $NURO for `term`, reserving the reward up front.
    function stake(uint256 amount, Term term) external nonReentrant returns (uint256 positionId) {
        require(amount > 0, "zero amount");

        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - before;
        require(received > 0, "no stake received");

        uint256 reward = quoteReward(received, term);
        require(reward > 0, "reward rounds to zero");

        // The just-received principal must not count toward reward backing.
        uint256 committed = totalStaked + totalReserved;
        uint256 poolBefore = before > committed ? before - committed : 0;
        require(poolBefore >= reward, "insufficient reward pool");

        uint64 unlockAt = uint64(block.timestamp + termSeconds(term));
        _positions[msg.sender].push(
            Position({amount: received, reward: reward, unlockAt: unlockAt, withdrawn: false})
        );
        positionId = _positions[msg.sender].length - 1;

        totalStaked += received;
        totalReserved += reward;

        emit Staked(msg.sender, positionId, received, reward, unlockAt);
    }

    /// @notice After maturity, withdraw principal + the reserved reward.
    function withdraw(uint256 positionId) external nonReentrant {
        Position storage p = _positions[msg.sender][positionId];
        require(!p.withdrawn, "already withdrawn");
        require(block.timestamp >= p.unlockAt, "still locked");

        p.withdrawn = true;
        uint256 amount = p.amount;
        uint256 reward = p.reward;
        totalStaked -= amount;
        totalReserved -= reward;

        token.safeTransfer(msg.sender, amount + reward);
        emit Withdrawn(msg.sender, positionId, amount, reward);
    }

    /// @notice Exit before maturity: get principal back, forfeit the reward
    ///         (released back into the pool for other stakers).
    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        Position storage p = _positions[msg.sender][positionId];
        require(!p.withdrawn, "already withdrawn");

        p.withdrawn = true;
        uint256 amount = p.amount;
        uint256 forfeited = p.reward;
        totalStaked -= amount;
        totalReserved -= forfeited;

        token.safeTransfer(msg.sender, amount);
        emit EmergencyWithdrawn(msg.sender, positionId, amount, forfeited);
    }

    // ------------------------------------------------------------------
    // Owner (reward pool + APY only — never touches user funds)
    // ------------------------------------------------------------------

    /// @notice Top up the reward pool so more stakes can be accepted.
    function fundRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "zero amount");
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    /// @notice Reclaim only the UNRESERVED reward surplus. Principal and every
    ///         open position's reserved reward are untouchable.
    function withdrawExcessRewards(address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "zero to");
        require(amount <= availableRewards(), "exceeds surplus");
        token.safeTransfer(to, amount);
        emit ExcessRewardsWithdrawn(to, amount);
    }

    /// @notice Update the APY for FUTURE stakes. Existing positions keep the
    ///         reward they locked in at stake time.
    function setApy(uint256 _apyBps) external onlyOwner {
        require(_apyBps <= MAX_APY_BPS, "apy too high");
        apyBps = _apyBps;
        emit ApyUpdated(_apyBps);
    }
}
