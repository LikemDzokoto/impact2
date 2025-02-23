import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Typed, AddressLike } from "ethers";

describe("ImpactToMoney Contract", function () {
    async function deployImpactToMoneyFixture() {
        const [owner, beneficiary ,nonOwner ,serviceProvider] = await ethers.getSigners();

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
            await stableCoinUSDC.getAddress(),
            await stableCoinUSDT.getAddress(),
            await stableCoinPaypalUSDT.getAddress(),
            "ipfs://",
            owner.address
        );

        return {
            impactoMoney,
            owner,
            beneficiary,
            nonOwner,
            serviceProvider,
            stableCoinPaypalUSDT,
            stableCoinUAUSD,
            stableCoinUSDC,
            stableCoinUSDT,
        };
    }

    it("should deploy the ImpactToMoney Contract", async function () {
        const { impactoMoney } = await deployImpactToMoneyFixture();
        expect(await impactoMoney.getAddress()).to.be.properAddress;
        expect(impactoMoney).to.be.ok;
    });

    describe("donateAndMint Function", function () {
        it("should only allow the owner to call donateAndMint", async function () {
            const { impactoMoney, nonOwner, beneficiary } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2; // USDT

            await expect(
                impactoMoney.connect(nonOwner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Only admin can perform this action");
        });

        it("should revert if beneficiary list is empty", async function () {
            const { impactoMoney, owner } = await loadFixture(deployImpactToMoneyFixture);
            const beneficiaries: Typed | AddressLike[] = [];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2;

            await expect(
                impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Beneficiaries list is empty");
        });

        it("should revert if voucher price is zero", async function () {
            const { impactoMoney, owner, beneficiary } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = 0;
            const currencyChoice = 2;

            await expect(
                impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Donation amount must be greater than zero");
        });

        it("should revert if insufficient balance", async function () {
            const { impactoMoney, owner, beneficiary, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("2000000", 18); // Exceeds initial 1M mint
            const currencyChoice = 2;

            await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);

            await expect(
                impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Insufficient currency balance");
        });

        it("should revert if insufficient allowance", async function () {
            const { impactoMoney, owner, beneficiary } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2;

            // No approval given
            await expect(
                impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Insufficient allowance");
        });

        it("should mint NFTs and transfer stablecoins to whitelisted beneficiaries", async function () {
            const { impactoMoney, owner, beneficiary, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2; // USDT

            await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);

            const initialBeneficiaryBalance = await stableCoinUSDT.balanceOf(beneficiary.address);
            await impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice);

            // Check NFT balance (tokenId starts at 1)
            expect(await impactoMoney.balanceOf(beneficiary.address, 1)).to.equal(1);
            expect(await impactoMoney.beneficiaryTokenId(beneficiary.address)).to.equal(1);

            // Check stablecoin transfer to beneficiary (not locked in contract)
            expect(await stableCoinUSDT.balanceOf(beneficiary.address)).to.equal(
                initialBeneficiaryBalance + voucherPrice
            );

            // Check lockedAmount mapping
            expect(await impactoMoney.lockedAmount(beneficiary.address)).to.equal(voucherPrice);

            // Check tokenId increment
            expect(await impactoMoney.tokenId()).to.equal(2);
        });

    })

    describe("redeem Function", function () {
        it("should revert if caller is not whitelisted", async function () {
            const { impactoMoney, owner, nonOwner } = await loadFixture(deployImpactToMoneyFixture);
            await expect(
                impactoMoney.connect(nonOwner).redeem(nonOwner.address, owner.address, 2, 1)
            ).to.be.revertedWith("Not whitelisted");
        });

        it("should revert if beneficiary does not own the NFT", async function () {
            const { impactoMoney, owner, beneficiary, serviceProvider , stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2;
            await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);
            await impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice);

            // Non-owner tries to redeem
            await expect(
                impactoMoney.connect(beneficiary).redeem(owner.address, serviceProvider.address, 2, 1)
            ).to.be.revertedWith("Beneficiary does not own this NFT");
        });

        it("should revert if locked amount is zero", async function () {
            const { impactoMoney, owner, beneficiary, serviceProvider,  stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.whitelistBeneficiaries([beneficiary.address]);
            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2;
            await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);
            await impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice);

            // Manually reset lockedAmount (not possible in current contract, so this test assumes prior redemption)
            await impactoMoney.connect(beneficiary).redeem(beneficiary.address, serviceProvider.address, 2, 1);
            await expect(
                impactoMoney.connect(beneficiary).redeem(beneficiary.address, serviceProvider.address, 2, 1)
            ).to.be.revertedWith("No locked amount available");
        });

        // it("should allow whitelisted beneficiary to redeem, burn NFT, and transfer stablecoin", async function () {
        //     const { impactoMoney, owner, beneficiary, serviceProvider, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
        //     await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);
        //     const beneficiaries = [beneficiary.address];
        //     const voucherPrice = ethers.parseUnits("100", 18);
        //     const currencyChoice = 2;

        //     await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);
        //     await impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice);

        //     // Assuming serviceProvider is set somehow; if not, adjust contract logic
        //     await impactoMoney.connect(beneficiary).redeem(1);

        //     // Check NFT is burned
        //     await expect(impactoMoney.owner(1)).to.be.reverted;

        //     // Check stablecoin transfer (assuming it goes to serviceProvider)
        //     expect(await stableCoinUSDT.balanceOf(serviceProvider.address)).to.equal(voucherPrice);

        //     // Check locked amount is reset
        //     expect(await impactoMoney.lockedAmount(1)).to.equal(0);
        // });


    });
    describe("Whitelist Functions", function () {
        it("should allow only owner to add to whitelist", async function () {
            const { impactoMoney, owner, nonOwner, beneficiary } = await loadFixture(deployImpactToMoneyFixture);
            await expect(
                impactoMoney.connect(nonOwner).whitelistBeneficiaries([beneficiary.address])).to.be.revertedWith("Ownable: caller is not the owner");

            await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address])
            expect(await impactoMoney.whitelistBeneficiaries([beneficiary.address])).to.be.true;
        });

        it("should allow only owner to remove from whitelist", async function () {
            const { impactoMoney, owner, nonOwner, beneficiary } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address]);

            await expect(
                impactoMoney.connect(nonOwner).removeWhitelistedBeneficiaries([beneficiary.address])
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await impactoMoney.connect(owner).removeWhitelistedBeneficiaries([beneficiary.address]);
            expect(await impactoMoney.whitelistBeneficiaries([beneficiary.address])).to.be.false;
        });
    });

    // Pausing tests
    describe("Pausing Functions", function () {
        it("should allow only owner to pause and unpause", async function () {
            const { impactoMoney, owner, nonOwner } = await loadFixture(deployImpactToMoneyFixture);

            await expect(impactoMoney.connect(nonOwner).pauseContract()).to.be.revertedWith("Ownable: caller is not the owner");
            await impactoMoney.connect(owner).pauseContract();
            expect(await impactoMoney.paused()).to.be.true;

            await expect(impactoMoney.connect(nonOwner).unpauseContract()).to.be.revertedWith("Ownable: caller is not the owner");
            await impactoMoney.connect(owner).unpauseContract();
            expect(await impactoMoney.paused()).to.be.false;
        });

        it("should prevent donateAndMint when paused", async function () {
            const { impactoMoney, owner, beneficiary, stableCoinUSDT } = await loadFixture(deployImpactToMoneyFixture);
            await impactoMoney.connect(owner).whitelistBeneficiaries([beneficiary.address])
            await impactoMoney.connect(owner).pauseContract();

            const beneficiaries = [beneficiary.address];
            const voucherPrice = ethers.parseUnits("100", 18);
            const currencyChoice = 2;

            await stableCoinUSDT.connect(owner).approve(impactoMoney.getAddress(), voucherPrice);
            await expect(
                impactoMoney.connect(owner).donateAndMint(beneficiaries, voucherPrice, currencyChoice)
            ).to.be.revertedWith("Pausable: paused");
        });





    });

})
