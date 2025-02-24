import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-deploy";

import * as dotenv from "dotenv";


const config: HardhatUserConfig = {
  solidity: "0.8.20",

  networks:{
    hardhat:{
      chainId:1337,
      allowUnlimitedContractSize:true,
    },

   Sepolia: {
      url: "https://sepolia.gateway.tenderly.co",
      chainId:11155111,
      accounts: [process.env.PRIVATE_KEY as string],
    },

  },


  namedAccounts: {
    deployer: {
      default: 0,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    deploy: "./deploy",
    artifacts: "./artifacts",
  },
};

export default config;
