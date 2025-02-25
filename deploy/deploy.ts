import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as dotenv from "dotenv";

dotenv.config();

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    console.log("Deployer:", deployer);
    console.log("Block number:", await ethers.provider.getBlockNumber());

  
    const stableCoinUAUSD = await deploy("StableCoinUAUSD", {
        from: deployer,
        args: [deployer], // deployer is the  initialOwner
        log: true,
        autoMine: true,
      
    });
    console.log("StableCoinUAUSD deployed to:", stableCoinUAUSD.address, "Newly deployed:", stableCoinUAUSD.newlyDeployed);

    const stableCoinPaypalUSDT = await deploy("StableCoinPaypalUSDT", {
        from: deployer,
        args: [deployer],
        log: true,
        autoMine: true,
     
    });
    console.log("StableCoinPaypalUSDT deployed to:", stableCoinPaypalUSDT.address, "Newly deployed:", stableCoinPaypalUSDT.newlyDeployed);

    const stableCoinUSDT = await deploy("StableCoinUSDT", {
        from: deployer,
        args: [deployer],
        log: true,
        autoMine: true,
      
    });
    console.log("StableCoinUSDT deployed to:", stableCoinUSDT.address, "Newly deployed:", stableCoinUSDT.newlyDeployed);

    const stableCoinUSDC = await deploy("StableCoinUSDC", {
        from: deployer,
        args: [deployer],
        log: true,
        autoMine: true,
      
    });
    console.log("StableCoinUSDC deployed to:", stableCoinUSDC.address, "Newly deployed:", stableCoinUSDC.newlyDeployed);

    // ImpactoMoney with constructor arguments
    const initialMetadataURI = "https://salmon-genuine-swordtail-78.mypinata.cloud/ipfs/bafkreifoi7zezae53pbxbzyifjrscdrdczphxbxmhdztjr5e5jszasiimi"; 
    const impactoMoney = await deploy("ImpactoMoney", {
        from: deployer,
        args: [
            stableCoinUAUSD.address,
            stableCoinPaypalUSDT.address,
            stableCoinUSDT.address,
            stableCoinUSDC.address,
            initialMetadataURI,
            deployer,
        ],
        log: true,  
        autoMine: true,
       
    });

    console.log("ImpactoMoney deployed to:", impactoMoney.address, "Newly deployed:", impactoMoney.newlyDeployed);
};

export default deployFunction;
deployFunction.tags = ["ImpactoMoney"];