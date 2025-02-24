import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ImpactoMoney Donation Flow Integration Test", function () {
    async function deployImpactToMoneyFixture() {
        const [owner, beneficiary] = await ethers.getSigners();

        const StableCoinUSDT = await ethers.getContractFactory("StableCoinUSDT");
        const stableCoinUSDT = await StableCoinUSDT.deploy(owner.address);

        const StableCoinUAUSD = await ethers.getContractFactory("StableCoinUAUSD");
        const stableCoinUAUSD = await StableCoinUAUSD.deploy(owner.address);

        const StableCoinUSDC = await ethers.getContractFactory("StableCoinUSDC");
        const stableCoinUSDC = await StableCoinUSDC.deploy(owner.address);

        const StableCoinPaypalUSDT = await ethers.getContractFactory("StableCoinPaypalUSDT");
        const stableCoinPaypalUSDT = await StableCoinPaypalUSDT.deploy(owner.address);

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

       
        await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        expect(await impactoMoney.whitelistedBeneficiaries(beneficiary.address)).to.be.true;

      
        const donationAmount = ethers.parseUnits("100", 18);
        await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), donationAmount);
        expect(await stableCoinUSDT.allowance(owner.address, impactoMoney.getAddress())).to.equal(donationAmount);

       
        const initialOwnerBalance = await stableCoinUSDT.balanceOf(owner.address);
        const initialBeneficiaryBalance = await stableCoinUSDT.balanceOf(beneficiary.address);
        const initialContractBalance = await stableCoinUSDT.balanceOf(impactoMoney.getAddress());

        const beneficiaries = [beneficiary.address];
        const currencyChoice = 2; // USDT
        const tx = await impactoMoney.connect(owner).donateAndMint(beneficiaries, donationAmount, currencyChoice);
        await tx.wait();

        // Verify NFT minting
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
        expect(await impactoMoney.beneficiaryTokenId(beneficiary.address)).to.equal(1);

        // Verify escrow: funds stay in contract, not beneficiary
        expect(await stableCoinUSDT.balanceOf(owner.address)).to.equal(initialOwnerBalance - donationAmount);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(initialBeneficiaryBalance); // No change
        expect(await stableCoinUSDT.balanceOf(impactoMoney.getAddress())).to.equal(initialContractBalance + donationAmount);

        // Verify voucher-specific locked amount
        expect(await impactoMoney.lockedAmount(1)).to.equal(donationAmount);

      
        expect(await impactoMoney.tokenId()).to.equal(2);

      
        await expect(tx).to.emit(impactoMoney, "NFTMinted").withArgs(beneficiary.address, 1);
    });
});