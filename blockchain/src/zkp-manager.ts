// 零知识证明提交和验证模块
import { BlockchainInterface } from './blockchain-interface';
import { ethers } from 'ethers';

// ZKP证明结构
export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

// 投票数据结构
export interface VoteData {
  proof: ZKProof;
  nullifier: string;
  optionId: number;
}

/**
 * ZKP证明管理类
 */
export class ZKPManager {
  private blockchain: BlockchainInterface;

  /**
   * 构造函数
   * @param blockchain 区块链接口实例
   */
  constructor(blockchain: BlockchainInterface) {
    this.blockchain = blockchain;
  }

  /**
   * 提交投票证明
   * @param voteData 投票数据
   * @returns 交易哈希
   */
  async submitVoteProof(voteData: VoteData): Promise<string> {
    try {
      // 验证证明格式
      if (!this.isValidProof(voteData.proof)) {
        throw new Error('Invalid proof format');
      }

      // 验证防重标识格式
      if (!this.isValidNullifier(voteData.nullifier)) {
        throw new Error('Invalid nullifier format');
      }

      // 验证选项ID
      if (voteData.optionId <= 0) {
        throw new Error('Invalid option ID');
      }

      // 提交投票到区块链
      const txHash = await this.blockchain.submitVote(
        voteData.proof,
        voteData.nullifier,
        voteData.optionId
      );

      console.log(`Vote submitted successfully. Transaction hash: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('Error submitting vote proof:', error);
      throw error;
    }
  }

  /**
   * 验证ZKP证明（链下验证）
   * @param voteData 投票数据
   * @returns 验证结果
   */
  async verifyProofOffChain(voteData: VoteData): Promise<boolean> {
    try {
      // 验证证明格式
      if (!this.isValidProof(voteData.proof)) {
        throw new Error('Invalid proof format');
      }

      // 验证防重标识格式
      if (!this.isValidNullifier(voteData.nullifier)) {
        throw new Error('Invalid nullifier format');
      }

      // 验证选项ID
      if (voteData.optionId <= 0) {
        throw new Error('Invalid option ID');
      }

      // 检查防重标识是否已使用
      const isUsed = await this.blockchain.isNullifierUsed(voteData.nullifier);
      if (isUsed) {
        throw new Error('Nullifier already used');
      }

      // 调用区块链上的验证函数进行链下验证
      const isValid = await this.blockchain.verifyProof(
        voteData.proof,
        voteData.nullifier,
        voteData.optionId
      );

      return isValid;
    } catch (error) {
      console.error('Error verifying proof off-chain:', error);
      return false;
    }
  }

  /**
   * 验证证明格式
   * @param proof ZKP证明
   * @returns 是否有效
   */
  private isValidProof(proof: ZKProof): boolean {
    // 检查证明是否存在
    if (!proof || !proof.a || !proof.b || !proof.c) {
      return false;
    }

    // 检查数组长度
    if (proof.a.length !== 2 || proof.b.length !== 2 || proof.b[0].length !== 2 || 
        proof.b[1].length !== 2 || proof.c.length !== 2) {
      return false;
    }

    // 检查所有元素是否为有效的十六进制字符串
    const elements = [
      ...proof.a,
      ...proof.b[0],
      ...proof.b[1],
      ...proof.c
    ];

    for (const element of elements) {
      if (!ethers.utils.isHexString(element)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证防重标识格式
   * @param nullifier 防重标识
   * @returns 是否有效
   */
  private isValidNullifier(nullifier: string): boolean {
    // 检查是否为有效的十六进制字符串
    return ethers.utils.isHexString(nullifier) && nullifier.length === 66; // 0x前缀+32字节
  }

  /**
   * 批量提交投票证明
   * @param votes 投票数据数组
   * @returns 交易哈希数组
   */
  async submitBatchVotes(votes: VoteData[]): Promise<string[]> {
    const txHashes: string[] = [];

    for (const vote of votes) {
      try {
        const txHash = await this.submitVoteProof(vote);
        txHashes.push(txHash);
      } catch (error) {
        console.error(`Error submitting vote for option ${vote.optionId}:`, error);
        // 可以选择继续处理其他投票或抛出错误
      }
    }

    return txHashes;
  }

  /**
   * 获取验证密钥哈希（用于验证证明的一致性）
   * @returns 验证密钥哈希
   */
  async getVerifyingKeyHash(): Promise<string> {
    // 在实际应用中，这里会计算验证密钥的哈希值
    // 用于确保链上和链下使用相同的验证密钥
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes('verifying_key'));
  }
}

export default ZKPManager;