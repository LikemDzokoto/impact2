import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ImpactoMoney Redeem Flow Integration Test", function () {
    async function deployImpactToMoneyFixture() {
        const [owner, beneficiary, serviceProvider] = await ethers.getSigners();

        // Deploy stablecoin contracts
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
            serviceProvider,
            stableCoinPaypalUSDT,
            stableCoinUAUSD,
            stableCoinUSDC,
            stableCoinUSDT,
        };
    }

    it("should successfully complete the redeem flow", async function () {
        const { impactoMoney, owner, beneficiary, serviceProvider, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);

        // Step 1: Set up donation flow (prerequisite for redeem)
        const donationAmount = ethers.parseUnits("100", 18); // 100 USDT
        await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), donationAmount);
        await impactoMoney.connect(owner).donateAndMint([beneficiary.address], donationAmount, 2); // USDT = 2

        // Verify setup
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(donationAmount);
        expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(donationAmount);

        // Step 2: Beneficiary approves ImpactoMoney to spend USDT
        await stableCoinUSDT.connect(beneficiary).approve(impactoMoney.getAddress(), donationAmount);
        expect(await stableCoinUSDT.allowance(beneficiary.address, impactoMoney.getAddress())).to.equal(donationAmount);

        // Step 3: Record initial balances
        const initialBeneficiaryBalance = await stableCoinUSDT.balanceOf(beneficiary.address);
        const initialServiceProviderBalance = await stableCoinUSDT.balanceOf(serviceProvider.address);

        // Step 4: Call redeem
        const tx = await impactoMoney.connect(beneficiary).redeem(
            beneficiary.address,
            serviceProvider.address,
            2, // USDT
            1  // tokenId
        );
        await tx.wait();

        // Step 5: Verify outcomes
        // NFT is burned
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(0);

        // USDT transferred from beneficiary to service provider
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(initialBeneficiaryBalance - donationAmount);
        expect(await stableCoinUSDT.balanceOf(serviceProvider.address)).to.equal(initialServiceProviderBalance + donationAmount);

        // Locked amount reset
        expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(0);

        // Event emitted
        await expect(tx)
            .to.emit(impactoMoney, "Redeemed")
            .withArgs(beneficiary.address, serviceProvider.address, donationAmount);
    });
});