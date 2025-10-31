// 部署脚本 - 支持多链部署
const { ethers } = require("hardhat");

// 链配置
const CHAIN_CONFIGS = [
  {
    name: "localhost",
    chainId: 1337,
    isActive: true,
    minGasPrice: "0"
  },
  {
    name: "ethereum",
    chainId: 1,
    isActive: true,
    minGasPrice: "20000000000" // 20 Gwei
  },
  {
    name: "goerli",
    chainId: 5,
    isActive: true,
    minGasPrice: "5000000000" // 5 Gwei
  },
  {
    name: "bsc",
    chainId: 56,
    isActive: true,
    minGasPrice: "5000000000" // 5 Gwei
  },
  {
    name: "bscTestnet",
    chainId: 97,
    isActive: true,
    minGasPrice: "5000000000" // 5 Gwei
  },
  {
    name: "polygon",
    chainId: 137,
    isActive: true,
    minGasPrice: "50000000000" // 50 Gwei
  }
];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 获取合约工厂
  const AnonymousVote = await ethers.getContractFactory("AnonymousVote");

  // 部署合约，传入初始链配置
  console.log("Deploying AnonymousVote contract...");
  const contract = await AnonymousVote.deploy(CHAIN_CONFIGS);

  await contract.deployed();

  console.log("AnonymousVote contract deployed to:", contract.address);
  
  // 验证部署的链配置
  console.log("Verifying chain configurations...");
  const chainConfigs = await contract.getAllChainConfigs();
  console.log("Deployed chain configurations:", chainConfigs);
  
  // 保存部署信息
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress: contract.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    chainConfigs: CHAIN_CONFIGS
  };
  
  fs.writeFileSync(
    `deployments/deployment-${network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployments folder");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });