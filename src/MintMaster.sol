pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MintToken.sol";

/**
 * @title MintMaster
 * @dev A secure distribution vault that releases tokens only when authorized by the backend.
 * This contract does not accept public ETH or public minting calls.
 */
contract MintMaster is Ownable, Pausable, ReentrancyGuard {
    MintToken public immutable mintToken;
    address public immutable ownerWallet;

    uint256 public constant MAX_DISTRIBUTION_SUPPLY = 50_000_000 * 10**18; // 50% of 100M
    uint256 public totalDistributed;

    event TokensDistributed(address indexed user, uint256 amount, string requestId);

    constructor(address _mintTokenAddress, address _ownerWallet) Ownable(msg.sender) {
        require(_mintTokenAddress != address(0), "Invalid MintToken address");
        require(_ownerWallet != address(0), "Invalid owner wallet address");
        
        mintToken = MintToken(_mintTokenAddress);
        ownerWallet = _ownerWallet;
    }

    /**
     * @dev Distributes tokens to a user. Only callable by the backend (owner).
     * This is called after the backend has verified the email flow and payment.
     */
    function distributeTokens(
        address user,
        uint256 amount,
        string calldata requestId
    ) external onlyOwner nonReentrant whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");
        require(totalDistributed + amount <= MAX_DISTRIBUTION_SUPPLY, "Distribution supply exhausted");

        totalDistributed += amount;

        // Transfer tokens from this vault to the user
        bool success = mintToken.transfer(user, amount);
        require(success, "Token transfer failed");

        emit TokensDistributed(user, amount, requestId);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Allows owner to withdraw any accidental ETH sent to this contract.
     */
    function withdrawETH() public onlyOwner {
        (bool success, ) = ownerWallet.call{value: address(this).balance}("");
        require(success, "Failed to withdraw ETH");
    }

    /**
     * @dev Allows owner to withdraw any ERC20 tokens (e.g., to reclaim undistributed supply).
     */
    function withdrawTokens(address _tokenAddress) public onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        bool success = token.transfer(ownerWallet, token.balanceOf(address(this)));
        require(success, "Token withdrawal failed");
    }

    /**
     * @dev Rejects any direct ETH deposits.
     */
    receive() external payable {
        revert("Direct deposits not allowed. Use the backend-verified flow.");
    }
}
