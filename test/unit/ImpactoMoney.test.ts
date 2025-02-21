import { expect } from "chai";
import { ethers } from "hardhat";
import { ImpactoMoney, StableCoinPaypalUSDT, StableCoinUAUSD, StableCoinUSDC, StableCoinUSDT } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ImpactToMoney Contract", function () {
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
        const impacToMoney = await ImpactoMoney.deploy(
            await stableCoinUAUSD.getAddress(),
            await stableCoinUSDC.getAddress(),
            await stableCoinUSDT.getAddress(),
            await stableCoinPaypalUSDT.getAddress(),
            "ipfs://",
            owner.address
        );

        return { impacToMoney, owner, beneficiary, stableCoinPaypalUSDT, stableCoinUAUSD, stableCoinUSDC, stableCoinUSDT };
    }

    it("should deploy the ImpactToMoney Contract", async function () {
        const { impacToMoney } = await deployImpactToMoneyFixture();
        expect(await impacToMoney.getAddress()).to.be.properAddress;
    });
});