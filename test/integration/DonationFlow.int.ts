import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ImpactoMoney Donation Flow Integration Test", function () {
    async function deployImpactToMoneyFixture() {
        const [owner, beneficiary] = await ethers.getSigners();

        // Deploy stablecoin contracts (assuming they follow the StableCoinUSDC pattern)
        const StableCoinUSDT = await ethers.getContractFactory("StableCoinUSDT");
        const stableCoinUSDT = await StableCoinUSDT.deploy(owner.address);

        const StableCoinUAUSD = await ethers.getContractFactory("StableCoinUAUSD");
        const stableCoinUAUSD = await StableCoinUAUSD.deploy(owner.address);

        const StableCoinUSDC = await ethers.getContractFactory("StableCoinUSDC");
        const stableCoinUSDC = await StableCoinUSDC.deploy(owner.address);

        const StableCoinPaypalUSDT = await ethers.getContractFactory("StableCoinPaypalUSDT");
        const stableCoinPaypalUSDT = await StableCoinPaypalUSDT.deploy(owner.address);

        // Deploy ImpactoMoney contract
        const ImpactoMoney = await ethers.getContractFactory("ImpactoMoney");
        const impactoMoney = await ImpactoMoney.deploy(
            await stableCoinUAUSD.getAddress(),
            await stableCoinPaypalUSDT.getAddress(),
            await stableCoinUSDT.getAddress(),
            await stableCoinUSDC.getAddress(),
            "ipfs://",
            owner.address
        );

        return {
            impactoMoney,
            owner,
            beneficiary,
            stableCoinPaypalUSDT,
            stableCoinUAUSD,
            stableCoinUSDC,
            stableCoinUSDT,
        };
    }

    it("should successfully complete the donation flow", async function () {
        const { impactoMoney, owner, beneficiary, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);

        // Step 1: Whitelist the beneficiary
        await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        expect(await impactoMoney.whitelistedBeneficiaries(beneficiary.address)).to.be.true;

        // Step 2: Approve the ImpactoMoney contract to spend USDT
        const donationAmount = ethers.parseUnits("100", 18); // 100 USDT
        await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), donationAmount);
        expect(await stableCoinUSDT.allowance(owner.address, impactoMoney.getAddress())).to.equal(donationAmount);

        // Step 3: Record initial balances
        const initialOwnerBalance = await stableCoinUSDT.balanceOf(owner.address);
        const initialBeneficiaryBalance = await stableCoinUSDT.balanceOf(beneficiary.address);

        // Step 4: Call donateAndMint
        const beneficiaries = [beneficiary.address];
        const currencyChoice = 2; // USDT
        const tx = await impactoMoney.connect(owner).donateAndMint(beneficiaries, donationAmount, currencyChoice);
        await tx.wait();

        // Step 5: Verify outcomes
        // NFT minted to beneficiary
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
        expect(await impactoMoney.beneficiaryTokenId(beneficiary.address)).to.equal(1);

        // USDT transferred from owner to beneficiary
        expect(await stableCoinUSDT.balanceOf(owner.address)).to.equal(initialOwnerBalance - donationAmount);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(initialBeneficiaryBalance + donationAmount);

        // Locked amount set
        expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(donationAmount);

        // Token ID incremented
        expect(await impactoMoney.tokenId()).to.equal(2);

        // Event emitted
        await expect(tx).to.emit(impactoMoney, "NFTMinted").withArgs(beneficiary.address, 1);
    });
});