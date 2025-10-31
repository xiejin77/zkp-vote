// 中继器服务实现
import { ethers } from 'ethers';
import { BlockchainInterface, NetworkConfig, SUPPORTED_NETWORKS } from './blockchain-interface';
import { ZKPManager, VoteData } from './zkp-manager';

// 中继器配置
interface RelayerConfig {
  privateKey: string;
  network: string;
  contractAddress: string;
  batchSize: number;
  maxGasPrice: string;
  supportedChains: string[]; // 支持的链列表
}

// 待处理投票队列
interface PendingVote {
  voteData: VoteData;
  voterAddress: string;
  timestamp: number;
  chain: string; // 投票所在的链
}

// 链特定的中继器实例
interface ChainRelayer {
  blockchain: BlockchainInterface;
  signer: ethers.Wallet;
  pendingVotes: PendingVote[];
  isProcessing: boolean;
}

/**
 * 多链中继器服务类
 */
export class MultiChainRelayerService {
  private chainRelayers: Map<string, ChainRelayer> = new Map();
  private config: RelayerConfig;
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 构造函数
   * @param config 中继器配置
   */
  constructor(config: RelayerConfig) {
    this.config = config;
    
    // 为每个支持的链初始化中继器实例
    for (const chain of config.supportedChains) {
      this.initializeChainRelayer(chain);
    }
  }

  /**
   * 初始化特定链的中继器
   * @param chain 链名称
   */
  private initializeChainRelayer(chain: string): void {
    const networkConfig = SUPPORTED_NETWORKS[chain];
    if (!networkConfig) {
      console.warn(`Unsupported chain: ${chain}`);
      return;
    }

    try {
      // 初始化区块链接口
      const blockchain = new BlockchainInterface(chain, this.config.contractAddress);
      
      // 初始化签名者
      const provider = new ethers.providers.JsonRpcProvider(networkConfig.url);
      const signer = new ethers.Wallet(this.config.privateKey, provider);
      
      // 连接钱包
      blockchain.connectWallet(this.config.privateKey);
      
      // 创建链中继器实例
      const chainRelayer: ChainRelayer = {
        blockchain,
        signer,
        pendingVotes: [],
        isProcessing: false
      };
      
      this.chainRelayers.set(chain, chainRelayer);
      console.log(`Initialized relayer for chain: ${chain}`);
    } catch (error) {
      console.error(`Error initializing relayer for chain ${chain}:`, error);
    }
  }

  /**
   * 添加待处理投票
   * @param voteData 投票数据
   * @param voterAddress 投票者地址
   * @param chain 链名称
   */
  async addPendingVote(voteData: VoteData, voterAddress: string, chain: string): Promise<void> {
    const chainRelayer = this.chainRelayers.get(chain);
    if (!chainRelayer) {
      throw new Error(`Relayer not initialized for chain: ${chain}`);
    }

    const pendingVote: PendingVote = {
      voteData,
      voterAddress,
      timestamp: Date.now(),
      chain
    };
    
    chainRelayer.pendingVotes.push(pendingVote);
    
    console.log(`Added pending vote for option ${voteData.optionId} on chain ${chain}`);
    
    // 如果待处理投票数量达到批次大小，开始处理
    if (chainRelayer.pendingVotes.length >= this.config.batchSize) {
      await this.processChainBatch(chain);
    }
  }

  /**
   * 处理特定链的批量投票
   * @param chain 链名称
   */
  private async processChainBatch(chain: string): Promise<void> {
    const chainRelayer = this.chainRelayers.get(chain);
    if (!chainRelayer || chainRelayer.isProcessing || chainRelayer.pendingVotes.length === 0) {
      return;
    }
    
    chainRelayer.isProcessing = true;
    
    try {
      // 获取当前批次的投票
      const batch = chainRelayer.pendingVotes.splice(0, this.config.batchSize);
      
      // 构造批量投票数据
      const votes = batch.map(item => ({
        proof: item.voteData.proof,
        nullifier: item.voteData.nullifier,
        optionId: item.voteData.optionId,
        signature: '' // 简化处理，实际应用中需要用户签名
      }));
      
      const voters = batch.map(item => item.voterAddress);
      
      console.log(`Processing batch of ${votes.length} votes on chain ${chain}`);
      
      // 提交批量投票
      const txHash = await chainRelayer.blockchain.submitBatchVotes(votes, voters);
      
      console.log(`Batch submitted successfully on chain ${chain}. Transaction hash: ${txHash}`);
      
      // 记录处理日志
      await this.logBatchProcessing(chain, votes.length, txHash);
    } catch (error) {
      console.error(`Error processing batch on chain ${chain}:`, error);
      
      // 将失败的投票重新加入队列
      // 在实际应用中，需要更复杂的错误处理机制
    } finally {
      if (chainRelayer) {
        chainRelayer.isProcessing = false;
      }
    }
  }

  /**
   * 启动所有链的定时处理
   */
  async startAllPeriodicProcessing(): Promise<void> {
    for (const chain of this.config.supportedChains) {
      const interval = setInterval(async () => {
        const chainRelayer = this.chainRelayers.get(chain);
        if (chainRelayer && chainRelayer.pendingVotes.length > 0 && !chainRelayer.isProcessing) {
          await this.processChainBatch(chain);
        }
      }, 60000); // 每分钟检查一次
      
      this.processingIntervals.set(chain, interval);
    }
    
    console.log('Started periodic processing for all supported chains');
  }

  /**
   * 停止所有链的定时处理
   */
  stopAllPeriodicProcessing(): void {
    for (const [chain, interval] of this.processingIntervals.entries()) {
      clearInterval(interval);
      console.log(`Stopped periodic processing for chain: ${chain}`);
    }
    
    this.processingIntervals.clear();
  }

  /**
   * 获取特定链的待处理投票数量
   * @param chain 链名称
   */
  getPendingVoteCount(chain: string): number {
    const chainRelayer = this.chainRelayers.get(chain);
    return chainRelayer ? chainRelayer.pendingVotes.length : 0;
  }

  /**
   * 获取所有链的待处理投票总数
   */
  getTotalPendingVoteCount(): number {
    let total = 0;
    for (const chainRelayer of this.chainRelayers.values()) {
      total += chainRelayer.pendingVotes.length;
    }
    return total;
  }

  /**
   * 获取特定链中继器的余额
   * @param chain 链名称
   */
  async getBalance(chain: string): Promise<string> {
    const chainRelayer = this.chainRelayers.get(chain);
    if (!chainRelayer) {
      throw new Error(`Relayer not initialized for chain: ${chain}`);
    }
    
    const balance = await chainRelayer.signer.getBalance();
    return ethers.utils.formatEther(balance);
  }

  /**
   * 获取所有链中继器的余额
   */
  async getAllBalances(): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    
    for (const [chain, chainRelayer] of this.chainRelayers.entries()) {
      try {
        const balance = await chainRelayer.signer.getBalance();
        balances[chain] = ethers.utils.formatEther(balance);
      } catch (error) {
        console.error(`Error getting balance for chain ${chain}:`, error);
        balances[chain] = '0';
      }
    }
    
    return balances;
  }

  /**
   * 记录批量处理日志
   * @param chain 链名称
   * @param voteCount 投票数量
   * @param txHash 交易哈希
   */
  private async logBatchProcessing(chain: string, voteCount: number, txHash: string): Promise<void> {
    console.log(`Processed ${voteCount} votes on chain ${chain} in transaction ${txHash}`);
    
    // 在实际应用中，这里会将日志记录到数据库或文件
    // 可以用于后续的统计和分析
  }

  /**
   * 估算特定链的Gas费用
   * @param chain 链名称
   * @param voteCount 投票数量
   */
  async estimateGasCost(chain: string, voteCount: number): Promise<string> {
    const chainRelayer = this.chainRelayers.get(chain);
    if (!chainRelayer) {
      throw new Error(`Relayer not initialized for chain: ${chain}`);
    }
    
    try {
      // 在实际应用中，这里会调用区块链接口估算Gas费用
      // 简化处理，返回预估费用
      const estimatedGas = voteCount * 100000; // 假设每个投票消耗100,000 gas
      const gasPrice = await chainRelayer.signer.getGasPrice();
      const cost = gasPrice.mul(estimatedGas);
      return ethers.utils.formatEther(cost);
    } catch (error) {
      console.error(`Error estimating gas cost for chain ${chain}:`, error);
      return '0';
    }
  }

  /**
   * 获取支持的链列表
   */
  getSupportedChains(): string[] {
    return this.config.supportedChains;
  }

  /**
   * 添加新的支持链
   * @param chain 链名称
   */
  addSupportedChain(chain: string): void {
    if (!this.config.supportedChains.includes(chain)) {
      this.config.supportedChains.push(chain);
      this.initializeChainRelayer(chain);
      console.log(`Added support for chain: ${chain}`);
    }
  }

  /**
   * 移除支持的链
   * @param chain 链名称
   */
  removeSupportedChain(chain: string): void {
    const index = this.config.supportedChains.indexOf(chain);
    if (index > -1) {
      this.config.supportedChains.splice(index, 1);
      
      // 停止该链的定时处理
      const interval = this.processingIntervals.get(chain);
      if (interval) {
        clearInterval(interval);
        this.processingIntervals.delete(chain);
      }
      
      // 移除链中继器实例
      this.chainRelayers.delete(chain);
      
      console.log(`Removed support for chain: ${chain}`);
    }
  }
}

export default MultiChainRelayerService;