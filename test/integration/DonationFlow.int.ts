
// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { ImpactoMoney, StableCoinUSDT } from "../../typechain-types";

// describe("Donation Flow Integration Test", function () {
//   let impacto: ImpactoMoney;
//   let stableCoin: StableCoinUSDT;
//   let owner: any, admin: any, beneficiary: any;
//   const voucherPrice = ethers.parseUnits("10", 18);

//   beforeEach(async function () {
//     [owner, admin, beneficiary] = await ethers.getSigners();

//     // Deploy StableCoinUSDT (acting as a stablecoin for testing)
//     const StableCoinFactory = await ethers.getContractFactory("StableCoinUSDT");
//     stableCoin = (await StableCoinFactory.deploy(owner.address)) as StableCoinUSDT;
//     await stableCoin.deployed();

//     // Deploy ImpactoMoney with the stablecoin addresses (using the same for all currency choices for testing)
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

//     // Whitelist the beneficiary for donation eligibility
//     await impacto.whitelistBeneficiaries([beneficiary.address]);

//     // Simulate funding for donation: transfer tokens to admin and approve the ImpactoMoney contract
//     await stableCoin.transfer(admin.address, voucherPrice.mul(2));
//     await stableCoin.connect(admin).approve(impacto.address, voucherPrice.mul(2));
//   });

//   it("should process donation and mint an NFT voucher", async function () {
//     // Call donateAndMint from admin (or owner if that's the admin in your system)
//     await expect(
//       impacto.connect(owner).donateAndMint([beneficiary.address], voucherPrice, 0)
//     ).to.emit(impacto, "NFTMinted");

//     // Verify that the beneficiary's locked funds are set correctly
//     const locked = await impacto.lockedAmount(beneficiary.address);
//     expect(locked).to.equal(voucherPrice);

//     // Verify that the beneficiary received the NFT voucher (tokenId starts at 1)
//     const nftBalance = await impacto.balanceOf(beneficiary.address, 1);
//     expect(nftBalance).to.equal(1);
//   });
// });
