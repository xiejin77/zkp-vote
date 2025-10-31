require("@nomiclabs/hardhat-waffle");

// 网络配置
const networks = {
  hardhat: {
    chainId: 1337
  },
  // 本地测试网络
  localhost: {
    url: "http://127.0.0.1:8545"
  }
};

// 如果环境变量中配置了其他网络，添加到配置中
if (process.env.INFURA_PROJECT_ID) {
  networks.goerli = {
    url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  };
  
  networks.mainnet = {
    url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  };
}

if (process.env.BSC_RPC_URL) {
  networks.bsc = {
    url: process.env.BSC_RPC_URL,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  };
  
  networks.bscTestnet = {
    url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  };
}

if (process.env.POLYGON_RPC_URL) {
  networks.polygon = {
    url: process.env.POLYGON_RPC_URL,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
  };
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks
};