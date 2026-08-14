// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Escrow + settlement contract for CiteFlowAI research sessions on BOT Chain.
/// Researchers fund a session by sending USDT directly to this contract. Once the
/// AI agent decides which sources were cited, the treasury owner settles the whole
/// session in a single transaction: paying every cited creator and refunding any
/// unspent budget, all recorded in one auditable event.
contract CiteFlowPayouts {
    address public owner;
    IERC20 public immutable usdt;

    event SessionSettled(
        bytes32 indexed sessionId,
        address[] recipients,
        uint256[] amounts,
        address refundTo,
        uint256 refundAmount
    );
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _usdt) {
        require(_usdt != address(0), "usdt address required");
        owner = msg.sender;
        usdt = IERC20(_usdt);
    }

    /// @notice Pays every cited creator for a research session and refunds unspent
    /// budget, in one transaction. Callable only by the treasury owner.
    function distribute(
        bytes32 sessionId,
        address[] calldata recipients,
        uint256[] calldata amounts,
        address refundTo,
        uint256 refundAmount
    ) external onlyOwner {
        require(recipients.length == amounts.length, "length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "zero recipient");
            require(usdt.transfer(recipients[i], amounts[i]), "payout failed");
        }

        if (refundAmount > 0) {
            require(refundTo != address(0), "zero refund address");
            require(usdt.transfer(refundTo, refundAmount), "refund failed");
        }

        emit SessionSettled(sessionId, recipients, amounts, refundTo, refundAmount);
    }

    /// @notice Escape hatch for moving USDT out of the contract outside the normal
    /// per-session settlement flow (e.g. recovering an over-funded session).
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero address");
        require(usdt.transfer(to, amount), "withdraw failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
