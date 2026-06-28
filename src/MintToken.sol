pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MintToken is ERC20, Ownable {
    constructor() ERC20("TEST", "TEST") Ownable(msg.sender) {
        _mint(msg.sender, 100000000 * 10 ** decimals()); // Mint 100M tokens to the deployer
    }
}
