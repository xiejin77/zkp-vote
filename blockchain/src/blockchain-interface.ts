// 区块链连接和交互模块
import { ethers } from 'ethers';
import { AnonymousVote } from '../typechain-types'; // TypeScript类型定义

// 区块链网络配置接口
export interface NetworkConfig {
  name: string;
  url: string;
  chainId: number;
  contractAddress?: string;
  explorerUrl?: string;
  gasPrice?: string;
}

// 支持的区块链网络配置
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  // 以太坊主网
  ethereum: {
    name: 'Ethereum Mainnet',
    url: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    chainId: 1,
    explorerUrl: 'https://etherscan.io'
  },
  // 以太坊测试网
  goerli: {
    name: 'Goerli Testnet',
    url: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
    chainId: 5,
    explorerUrl: 'https://goerli.etherscan.io'
  },
  // BSC主网
  bsc: {
    name: 'Binance Smart Chain',
    url: 'https://bsc-dataseed.binance.org',
    chainId: 56,
    explorerUrl: 'https://bscscan.com'
  },
  // BSC测试网
  bscTestnet: {
    name: 'BSC Testnet',
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    explorerUrl: 'https://testnet.bscscan.com'
  },
  // Polygon主网
  polygon: {
    name: 'Polygon Mainnet',
    url: 'https://polygon-rpc.com',
    chainId: 137,
    explorerUrl: 'https://polygonscan.com'
  },
  // 本地测试网络
  localhost: {
    name: 'Localhost',
    url: 'http://127.0.0.1:8545',
    chainId: 1337
  }
};

// 合约ABI（包含批量提交功能和链配置）
const CONTRACT_ABI = [
  "function submitVote(tuple(uint256[2], uint256[2][2], uint256[2]) proof, bytes32 nullifier, uint256 optionId)",
  "function submitBatchVotes(tuple(tuple(uint256[2], uint256[2][2], uint256[2]) proof, bytes32 nullifier, uint256 optionId, bytes signature)[], address[] voters)",
  "function verifyProof(tuple(uint256[2], uint256[2][2], uint256[2]) proof, bytes32 nullifier, uint256 optionId) view returns (bool)",
  "function getOption(uint256 optionId) view returns (tuple(uint256 id, string name, uint256 voteCount))",
  "function getTotalVotes() view returns (uint256)",
  "function isNullifierUsed(bytes32 nullifier) view returns (bool)",
  "function addRelayer(address relayer)",
  "function setChainConfig(tuple(string name, uint256 chainId, uint256 minGasPrice, bool isActive))",
  "function getChainConfig(uint256 chainId) view returns (tuple(string name, uint256 chainId, uint256 minGasPrice, bool isActive))",
  "function getAllChainConfigs() view returns (tuple(string name, uint256 chainId, uint256 minGasPrice, bool isActive)[])",
  "event VoteSubmitted(address indexed voter, uint256 indexed optionId, bytes32 nullifier)",
  "event VoteVerified(address indexed voter, uint256 indexed optionId)",
  "event BatchVotesSubmitted(address indexed relayer, uint256 count)",
  "event ChainConfigUpdated(string name, uint256 chainId, bool isActive)"
];

// 批量投票数据结构
interface BatchVoteData {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  nullifier: string;
  optionId: number;
  signature: string;
}

// 链配置结构
export interface ChainConfig {
  name: string;
  chainId: number;
  minGasPrice: string;
  isActive: boolean;
}

// 区块链接口类
export class BlockchainInterface {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: AnonymousVote;
  private signer: ethers.Signer | null = null;
  private networkConfig: NetworkConfig;

  /**
   * 构造函数
   * @param network 网络名称
   * @param contractAddress 合约地址
   */
  constructor(network: string = 'localhost', contractAddress?: string) {
    // 获取网络配置
    const config = SUPPORTED_NETWORKS[network];
    if (!config) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    this.networkConfig = config;

    // 创建提供者
    this.provider = new ethers.providers.JsonRpcProvider(config.url);

    // 如果提供了合约地址，则创建合约实例
    if (contractAddress) {
      this.networkConfig.contractAddress = contractAddress;
      this.contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        this.provider
      ) as unknown as AnonymousVote;
    }
  }

  /**
   * 连接钱包
   * @param privateKey 私钥
   */
  async connectWallet(privateKey: string): Promise<void> {
    this.signer = new ethers.Wallet(privateKey, this.provider);
    // 使用签名者连接合约
    if (this.contract && this.signer) {
      this.contract = this.contract.connect(this.signer) as unknown as AnonymousVote;
    }
  }

  /**
   * 部署合约
   * @param initialChainConfigs 初始链配置
   * @returns 合约地址
   */
  async deployContract(initialChainConfigs: ChainConfig[]): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    // 获取合约工厂
    const factory = new ethers.ContractFactory(
      CONTRACT_ABI,
      this.getContractBytecode(),
      this.signer
    );

    // 部署合约
    const contract = await factory.deploy(initialChainConfigs);
    await contract.deployed();

    // 更新合约实例和地址
    this.contract = contract as unknown as AnonymousVote;
    this.networkConfig.contractAddress = contract.address;

    return contract.address;
  }

  /**
   * 获取合约字节码（简化版）
   * @returns 合约字节码
   */
  private getContractBytecode(): string {
    // 在实际应用中，这里应该返回编译后的合约字节码
    // 为简化起见，我们返回一个占位符
    return '0x608060405234801561001057600080fd5b50600080546001600160a01b031916331790556101b1806100326000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80630900f01014610046578063445df0ac146100645780638da5cb5b14610082575b600080fd5b61004e6100a0565b60408051918252519081900360200190f35b61006c6100a6565b604080519115158252519081900360200190f35b61008a6100b8565b604080516001600160a01b039092168252519081900360200190f35b60005481565b600080546001600160a01b0319169055565b6000546001600160a01b03168156fea2646970667358221220b7b3d5a5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f564736f6c63430008040033';
  }

  /**
   * 设置链配置
   * @param config 链配置
   * @returns 交易哈希
   */
  async setChainConfig(config: ChainConfig): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    const tx = await this.contract.setChainConfig(config);
    await tx.wait();
    return tx.hash;
  }

  /**
   * 获取链配置
   * @param chainId 链ID
   * @returns 链配置
   */
  async getChainConfig(chainId: number): Promise<ChainConfig> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const config = await this.contract.getChainConfig(chainId);
    return {
      name: config.name,
      chainId: config.chainId.toNumber(),
      minGasPrice: config.minGasPrice.toString(),
      isActive: config.isActive
    };
  }

  /**
   * 获取所有链配置
   * @returns 链配置数组
   */
  async getAllChainConfigs(): Promise<ChainConfig[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const configs = await this.contract.getAllChainConfigs();
    return configs.map(config => ({
      name: config.name,
      chainId: config.chainId.toNumber(),
      minGasPrice: config.minGasPrice.toString(),
      isActive: config.isActive
    }));
  }

  /**
   * 提交单个投票
   * @param proof 零知识证明
   * @param nullifier 防重标识
   * @param optionId 选项ID
   * @returns 交易哈希
   */
  async submitVote(
    proof: { a: [string, string]; b: [[string, string], [string, string]]; c: [string, string] },
    nullifier: string,
    optionId: number
  ): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    // 构造证明参数
    const proofParams = [
      proof.a,
      proof.b,
      proof.c
    ];

    // 调用合约的submitVote方法
    const tx = await this.contract.submitVote(
      proofParams,
      nullifier,
      optionId
    );

    // 等待交易确认
    await tx.wait();

    return tx.hash;
  }

  /**
   * 批量提交投票（中继器模式）
   * @param votes 批量投票数据
   * @param voters 对应的投票者地址
   * @returns 交易哈希
   */
  async submitBatchVotes(
    votes: BatchVoteData[],
    voters: string[]
  ): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    // 调用合约的submitBatchVotes方法
    const tx = await this.contract.submitBatchVotes(
      votes,
      voters
    );

    // 等待交易确认
    await tx.wait();

    return tx.hash;
  }

  /**
   * 添加中继器
   * @param relayerAddress 中继器地址
   * @returns 交易哈希
   */
  async addRelayer(relayerAddress: string): Promise<string> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    const tx = await this.contract.addRelayer(relayerAddress);
    await tx.wait();
    return tx.hash;
  }

  /**
   * 验证证明
   * @param proof 零知识证明
   * @param nullifier 防重标识
   * @param optionId 选项ID
   * @returns 验证结果
   */
  async verifyProof(
    proof: { a: [string, string]; b: [[string, string], [string, string]]; c: [string, string] },
    nullifier: string,
    optionId: number
  ): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // 构造证明参数
    const proofParams = [
      proof.a,
      proof.b,
      proof.c
    ];

    // 调用合约的verifyProof方法
    return await this.contract.verifyProof(
      proofParams,
      nullifier,
      optionId
    );
  }

  /**
   * 获取投票选项信息
   * @param optionId 选项ID
   * @returns 选项信息
   */
  async getOption(optionId: number): Promise<{ id: number; name: string; voteCount: number }> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const option = await this.contract.getOption(optionId);
    return {
      id: option.id.toNumber(),
      name: option.name,
      voteCount: option.voteCount.toNumber()
    };
  }

  /**
   * 获取总投票数
   * @returns 总投票数
   */
  async getTotalVotes(): Promise<number> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const total = await this.contract.getTotalVotes();
    return total.toNumber();
  }

  /**
   * 检查防重标识是否已使用
   * @param nullifier 防重标识
   * @returns 是否已使用
   */
  async isNullifierUsed(nullifier: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.isNullifierUsed(nullifier);
  }

  /**
   * 获取网络配置
   * @returns 网络配置
   */
  getNetworkConfig(): NetworkConfig {
    return this.networkConfig;
  }

  /**
   * 监听投票事件
   * @param callback 回调函数
   */
  async onVoteSubmitted(callback: (voter: string, optionId: number, nullifier: string) => void): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('VoteSubmitted', (voter, optionId, nullifier) => {
      callback(voter, optionId.toNumber(), nullifier);
    });
  }

  /**
   * 监听批量投票事件
   * @param callback 回调函数
   */
  async onBatchVotesSubmitted(callback: (relayer: string, count: number) => void): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('BatchVotesSubmitted', (relayer, count) => {
      callback(relayer, count.toNumber());
    });
  }

  /**
   * 监听链配置更新事件
   * @param callback 回调函数
   */
  async onChainConfigUpdated(callback: (name: string, chainId: number, isActive: boolean) => void): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('ChainConfigUpdated', (name, chainId, isActive) => {
      callback(name, chainId.toNumber(), isActive);
    });
  }
}

export default BlockchainInterface;