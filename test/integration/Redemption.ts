import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ImpactoMoney Redeem Flow Integration Test", function () {
    async function deployImpactToMoneyFixture() {
        const [owner, beneficiary, serviceProvider] = await ethers.getSigners();


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
            serviceProvider,
            stableCoinPaypalUSDT,
            stableCoinUAUSD,
            stableCoinUSDC,
            stableCoinUSDT,
        };
    }

    it("should successfully complete the redeem flow", async function () {
        const { impactoMoney, owner, beneficiary, serviceProvider, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);

        console.log("Owner address:", owner.address);
        console.log("Beneficiary address:", beneficiary.address);
        console.log("Service Provider address:", serviceProvider.address);
        console.log("ImpactoMoney address:", await impactoMoney.getAddress());
        console.log("Deployed StableCoinUSDT address:", await stableCoinUSDT.getAddress());

        console.log("Owner initial USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(owner.address), 18));
        console.log("Beneficiary initial USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(beneficiary.address), 18));

        const donationAmount = ethers.parseUnits("100", 18);
        await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), donationAmount);
        await impactoMoney.connect(owner).donateAndMint([beneficiary.address], donationAmount, 2);

        console.log("Beneficiary USDT after mint:", ethers.formatUnits(await stableCoinUSDT.balanceOf(beneficiary.address), 18));
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(donationAmount);

        await stableCoinUSDT.connect(beneficiary).approve(impactoMoney.getAddress(), donationAmount);
        console.log("Beneficiary allowance to contract:", ethers.formatUnits(await stableCoinUSDT.allowance(beneficiary.address, impactoMoney.getAddress()), 18));

        const initialBeneficiaryUSDT = await stableCoinUSDT.balanceOf(beneficiary.address);
        const initialServiceProviderUSDT = await stableCoinUSDT.balanceOf(serviceProvider.address);
        console.log("Before redeem - Beneficiary USDT:", ethers.formatUnits(initialBeneficiaryUSDT, 18));
        console.log("Before redeem - Service Provider USDT:", ethers.formatUnits(initialServiceProviderUSDT, 18));

        const tx = await impactoMoney.connect(beneficiary).redeem(
            beneficiary.address,
            serviceProvider.address,
            2,
            1
        );
        await tx.wait();

        console.log("After redeem - Beneficiary USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(beneficiary.address), 18));
        console.log("After redeem - Service Provider USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(serviceProvider.address), 18));

        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(0);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(0);
        expect(await stableCoinUSDT.balanceOf(serviceProvider.address)).to.equal(initialServiceProviderUSDT + donationAmount);
        expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(0);
        await expect(tx).to.emit(impactoMoney, "Redeemed").withArgs(beneficiary.address, serviceProvider.address, donationAmount);
    });
});