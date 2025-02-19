// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";




/// @title StableCoin: An ERC20 token with staking and burning capabilities
contract StableCoinPaypalUSDT is ERC20, Ownable {
    bool public paused = false;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    constructor(address initialOwner)
        ERC20("StableCoinPaypalUSDT", "PaypalUSDT")
        Ownable(initialOwner)
    {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    modifier whenNotPaused() {
        require(!paused, "Transfers are paused");
        _;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(uint256 amount) external whenNotPaused {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
}