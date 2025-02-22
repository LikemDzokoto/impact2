import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.20",

  networks:{
    hardhat:{
      chainId:1337,
    }
  },
  paths: {
    tests: "./test",
  },
};

export default config;
