// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ImpactoMoney: A contract that is used for minting and redeeming vouchers

contract ImpactoMoney is ERC1155, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    //maximum number of beneficiary per bulk mint to avoid gas issues
    uint256 public constant MAX_BENEFICIARIES = 50;

    IERC20 public UAUSD;
    IERC20 public PayPalUSD;
    IERC20 public USDT;
    IERC20 public USDC;

    uint256 public tokenId = 1;
    mapping(uint256 => string) private tokenURIs; // New mapping for token-specific URIs
    mapping(uint256 => uint256) public lockedAmount;
    mapping(uint256 => uint256) public voucherCurrency; // Currency choice per voucher
    mapping(address => uint256) public beneficiaryTokenId;
    mapping(address => bool) public whitelistedBeneficiaries;

    event MetadataURIUpdated(string newMetadataURI);
    event NFTMinted(address indexed beneficiary, uint256 indexed tokenId);
    event Redeemed(
        address indexed beneficiary,
        address indexed serviceProvider,
        uint256 amount
    );

    constructor(
        address uausdAddress,
        address paypalUsdtAddress,
        address usdtAddress,
        address usdcAddress,
        string memory initialMetadataURI,
        address initialOwner
    ) ERC1155(initialMetadataURI) Ownable(initialOwner) {
        UAUSD = IERC20(uausdAddress);
        PayPalUSD = IERC20(paypalUsdtAddress);
        USDT = IERC20(usdtAddress);
        USDC = IERC20(usdcAddress);

        tokenURIs[tokenId] = initialMetadataURI;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner(), "Only admin can perform this action");
        _;
    }

    modifier onlyWhitelisted() {
        require(whitelistedBeneficiaries[msg.sender], "Not whitelisted");
        _;
    }

    function updateMetadataURI(
        string memory newMetadataURI
    ) external onlyOwner {
        tokenURIs[tokenId] = newMetadataURI; // Set URI for new tokenId
        _setURI(newMetadataURI);
        emit MetadataURIUpdated(newMetadataURI);
    }

    function uri(uint256 _id) public view override returns (string memory) {
        return tokenURIs[_id]; // Retrieve the specific URI for each tokenId
    }

    function donateAndMint(
        address[] memory beneficiaries,
        uint256 voucherPrice,
        uint256 currencyChoice
    ) external onlyAdmin whenNotPaused nonReentrant {
        uint256 count = beneficiaries.length;

        require(count > 0, "Beneficiaries list is empty");
        require(
            count <= MAX_BENEFICIARIES,
            "Exceeds Maximum Beneficiaries(50)"
        );
        require(voucherPrice > 0, "Donation amount must be greater than zero");

        IERC20 selectedCurrency;
        if (currencyChoice == 0) {
            selectedCurrency = UAUSD;
        } else if (currencyChoice == 1) {
            selectedCurrency = PayPalUSD;
        } else if (currencyChoice == 2) {
            selectedCurrency = USDT;
        } else if (currencyChoice == 3) {
            selectedCurrency = USDC;
        } else {
            revert("Invalid currency choice");
        }

        require(
            selectedCurrency.balanceOf(msg.sender) >= voucherPrice * count,
            "Insufficient currency balance"
        );
        require(
            selectedCurrency.allowance(msg.sender, address(this)) >=
                voucherPrice * count,
            "Insufficient allowance"
        );

        for (uint256 i = 0; i < count; i++) {
            address beneficiary = beneficiaries[i];
            require(beneficiary != address(0), "Zero address not allowed");
            require(
                whitelistedBeneficiaries[beneficiary],
                "Beneficiary not whitelisted"
            );

            for (uint256 j = 0; j < i; j++) {
                require(
                    beneficiaries[j] != beneficiary,
                    "Duplicate address not allowed"
                );
            }

            beneficiaryTokenId[beneficiary] = tokenId;
            tokenURIs[tokenId] = uri(0);
            _mint(beneficiary, tokenId, 1, "");
            emit NFTMinted(beneficiary, tokenId);

            selectedCurrency.safeTransferFrom(
                msg.sender,
                address(this),
                voucherPrice
            );
            lockedAmount[tokenId] = voucherPrice;
            voucherCurrency[tokenId] = currencyChoice;

            tokenId++; 
        }
    }

    function redeem(
        address beneficiary,
        address serviceProvider,
        uint256 currencyChoice,
        uint256 voucherId
    ) external nonReentrant whenNotPaused onlyWhitelisted {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(
            serviceProvider != address(0),
            "Invalid service provider address"
        );
       require(msg.sender == beneficiary, "Only beneficiary can redeem their voucher");
       require(balanceOf(beneficiary, voucherId) > 0, "Beneficiary does not own this NFT");

        uint256 locked = lockedAmount[voucherId];
        require(locked > 0, "No locked amount available");

        // Validate currency matches voucher's issuance
        require(
            voucherCurrency[voucherId] == currencyChoice,
            "Currency choice mismatch"
        );

        _burn(beneficiary, voucherId, 1);

        // Transfer from contract (escrow) to service provider
        if (currencyChoice == 0) {
            UAUSD.safeTransfer(serviceProvider, locked);
        } else if (currencyChoice == 1) {
            PayPalUSD.safeTransfer(serviceProvider, locked);
        } else if (currencyChoice == 2) {
            USDT.safeTransfer(serviceProvider, locked);
        } else if (currencyChoice == 3) {
            USDC.safeTransfer(serviceProvider, locked);
        } else {
            revert("Invalid currency choice");
        }

        emit Redeemed(beneficiary, serviceProvider, locked);
        lockedAmount[voucherId] = 0;
    }

    function whitelistBeneficiaries(
        address[] memory beneficiaries
    ) external onlyOwner {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            require(beneficiaries[i] != address(0), "Zero address not allowed");
            whitelistedBeneficiaries[beneficiaries[i]] = true;
        }
    }

    function removeWhitelistedBeneficiaries(
        address[] memory beneficiaries
    ) external onlyOwner {
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            require(beneficiaries[i] != address(0), "Zero address not allowed");
            whitelistedBeneficiaries[beneficiaries[i]] = false;
        }
    }

    function pauseContract() external onlyOwner {
        _pause();
    }

    function unpauseContract() external onlyOwner {
        _unpause();
    }
}
