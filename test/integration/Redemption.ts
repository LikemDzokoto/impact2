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

        console.log("Owner initial USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(owner.address), 18));
        console.log("Beneficiary initial USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(beneficiary.address), 18));
        console.log("Beneficiary initial ETH:", ethers.formatEther(await ethers.provider.getBalance(beneficiary.address)));
        console.log("Deployed StableCoinUSDT address:", await stableCoinUSDT.getAddress());
        console.log("ImpactoMoney USDT address:", await impactoMoney.USDT());



        //console log out all addresses 
        console.log("owner address", owner.address);
        console.log("Beneficiary address:", beneficiary.address);
        console.log("ServiceProvider address:", serviceProvider.address);


        // Set up donation flow (prerequisite for redeem)
        const donationAmount = ethers.parseUnits("100", 18); // 100 USDT
        await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), donationAmount);
        await impactoMoney.connect(owner).donateAndMint([beneficiary.address], donationAmount, 2); // USDT = 2

        // Verify setup
        expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
        expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(donationAmount);
        expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(donationAmount);

        // Beneficiary approves ImpactoMoney to spend USDT
        const beneficiarySigner = await ethers.provider.getSigner(beneficiary.address);
        await stableCoinUSDT.connect(beneficiarySigner).approve(impactoMoney.getAddress(), donationAmount);
        console.log("Beneficiary allowance to contract:", ethers.formatUnits(await stableCoinUSDT.allowance(beneficiary.address, impactoMoney.getAddress()), 18));
        expect(await stableCoinUSDT.allowance(beneficiary.address, impactoMoney.getAddress())).to.equal(donationAmount);



        // Before redeem balances
        const initialBeneficiaryBalance = await stableCoinUSDT.balanceOf(beneficiary.address);
        const initialServiceProviderBalance = await stableCoinUSDT.balanceOf(serviceProvider.address);
        console.log("Before redeem - Beneficiary USDT:", ethers.formatUnits(initialBeneficiaryBalance, 18));
        console.log("Before redeem - Service Provider USDT:", ethers.formatUnits(initialServiceProviderBalance, 18));
        console.log("Caller address for redeem:", beneficiary.address); // Confirm signer



        const tx = await impactoMoney.connect(beneficiary).redeem(
            beneficiary.address,
            serviceProvider.address,
            2,
            1
        );
        await tx.wait();
        
        try {
            console.log("After redeem - Beneficiary USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(beneficiary.address), 18));
            console.log("After redeem - Service Provider USDT:", ethers.formatUnits(await stableCoinUSDT.balanceOf(serviceProvider.address), 18));
            console.log("Last caller in contract:", await impactoMoney.lastCaller());
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.log("Redeem failed with error:", error.message);
                console.log("Last caller in contract (after fail):", await impactoMoney.lastCaller());
                throw error;
            }
        }
        


    // NFT is burned
    expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(0);

    // USDT transferred from beneficiary to service provider
    expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(initialBeneficiaryBalance - donationAmount);
    expect(await stableCoinUSDT.balanceOf(serviceProvider.address)).to.equal(initialServiceProviderBalance + donationAmount);

    console.log("Amount redeemed by Service Provider:", await stableCoinUSDT.balanceOf(serviceProvider.address));


    expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(0);

    ``
    await expect(tx)
        .to.emit(impactoMoney, "Redeemed")
        .withArgs(beneficiary.address, serviceProvider.address, donationAmount);
});
});