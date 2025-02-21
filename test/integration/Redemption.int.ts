
// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { ImpactoMoney, StableCoinUSDT } from "../../typechain-types";

// describe("Redemption Flow Integration Test", function () {
//   let impacto: ImpactoMoney;
//   let stableCoin: StableCoinUSDT;
//   let owner: any, admin: any, beneficiary: any, serviceProvider: any;
//   const voucherPrice = ethers.parseUnits("10", 18);

//   beforeEach(async function () {
//     [owner, admin, beneficiary, serviceProvider] = await ethers.getSigners();

//     // Deploy the stablecoin
//     const StableCoinFactory = await ethers.getContractFactory("StableCoinUSDT");
//     stableCoin = (await StableCoinFactory.deploy(owner.address)) as StableCoinUSDT;
//     await stableCoin.deployed();

//     // Deploy ImpactoMoney
//     const ImpactoMoneyFactory = await ethers.getContractFactory("ImpactoMoney");
//     impacto = (await ImpactoMoneyFactory.deploy(
//       stableCoin.address,
//       stableCoin.address,
//       stableCoin.address,
//       stableCoin.address,
//       "ipfs://initialMetadata",
//       owner.address
//     )) as ImpactoMoney;
//     await impacto.deployed();

//     // Whitelist beneficiary
//     await impacto.whitelistBeneficiaries([beneficiary.address]);

//     // Fund admin and approve ImpactoMoney for donation
//     await stableCoin.transfer(admin.address, voucherPrice.mul(2));
//     await stableCoin.connect(admin).approve(impacto.address, voucherPrice.mul(2));

//     // Simulate a donation to mint the voucher
//     await impacto.connect(owner).donateAndMint([beneficiary.address], voucherPrice, 0);
//   });

//   it("should allow voucher redemption and transfer funds to service provider", async function () {
//     // Beneficiary redeems their voucher; assuming voucherId is 1
//     await expect(
//       impacto.connect(beneficiary).redeem(beneficiary.address, serviceProvider.address, 0, 1)
//     ).to.emit(impacto, "Redeemed");

//     // Verify that the beneficiary's locked funds are reset
//     const lockedAfter = await impacto.lockedAmount(beneficiary.address);
//     expect(lockedAfter).to.equal(0);

//     // Verify that the service provider received the funds (voucherPrice amount)
//     const serviceBalance = await stableCoin.balanceOf(serviceProvider.address);
//     expect(serviceBalance).to.equal(voucherPrice);
//   });
// });
