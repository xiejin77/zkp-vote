// 投票结果存储和查询模块
import { BlockchainInterface } from './blockchain-interface';

// 投票选项接口
export interface VoteOption {
  id: number;
  name: string;
  voteCount: number;
}

// 投票统计接口
export interface VoteStatistics {
  totalVotes: number;
  options: VoteOption[];
  timestamp: number;
}

/**
 * 投票结果管理类
 */
export class VoteResultManager {
  private blockchain: BlockchainInterface;

  /**
   * 构造函数
   * @param blockchain 区块链接口实例
   */
  constructor(blockchain: BlockchainInterface) {
    this.blockchain = blockchain;
  }

  /**
   * 获取指定选项的投票结果
   * @param optionId 选项ID
   * @returns 投票选项信息
   */
  async getOptionResult(optionId: number): Promise<VoteOption> {
    try {
      // 从区块链获取选项信息
      const option = await this.blockchain.getOption(optionId);
      return option;
    } catch (error) {
      console.error(`Error getting option ${optionId} result:`, error);
      throw error;
    }
  }

  /**
   * 获取所有选项的投票结果
   * @returns 投票选项数组
   */
  async getAllOptionsResult(): Promise<VoteOption[]> {
    try {
      // 获取总选项数
      // 注意：在实际实现中，我们需要在合约中添加获取选项总数的函数
      // 这里我们假设最多有10个选项
      const maxOptions = 10;
      const options: VoteOption[] = [];

      // 获取每个选项的结果
      for (let i = 1; i <= maxOptions; i++) {
        try {
          const option = await this.blockchain.getOption(i);
          // 如果选项ID为0，说明该选项不存在
          if (option.id > 0) {
            options.push(option);
          }
        } catch (error) {
          // 如果获取选项失败，可能是选项不存在，继续下一个
          console.warn(`Option ${i} not found or error occurred`);
        }
      }

      return options;
    } catch (error) {
      console.error('Error getting all options result:', error);
      throw error;
    }
  }

  /**
   * 获取总投票统计
   * @returns 总投票数
   */
  async getTotalVoteCount(): Promise<number> {
    try {
      const total = await this.blockchain.getTotalVotes();
      return total;
    } catch (error) {
      console.error('Error getting total vote count:', error);
      throw error;
    }
  }

  /**
   * 获取完整的投票统计信息
   * @returns 投票统计信息
   */
  async getVoteStatistics(): Promise<VoteStatistics> {
    try {
      // 并行获取所有需要的数据
      const [totalVotes, options] = await Promise.all([
        this.getTotalVoteCount(),
        this.getAllOptionsResult()
      ]);

      return {
        totalVotes,
        options,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting vote statistics:', error);
      throw error;
    }
  }

  /**
   * 实时监听投票结果更新
   * @param callback 回调函数
   */
  async watchVoteResults(callback: (statistics: VoteStatistics) => void): Promise<() => void> {
    try {
      // 设置定时器定期获取最新结果
      const intervalId = setInterval(async () => {
        try {
          const statistics = await this.getVoteStatistics();
          callback(statistics);
        } catch (error) {
          console.error('Error in vote results watcher:', error);
        }
      }, 5000); // 每5秒更新一次

      // 返回清理函数
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Error setting up vote results watcher:', error);
      throw error;
    }
  }

  /**
   * 格式化投票结果为可读格式
   * @param statistics 投票统计信息
   * @returns 格式化后的结果字符串
   */
  formatVoteResults(statistics: VoteStatistics): string {
    let result = `=== 投票结果 ===\n`;
    result += `总票数: ${statistics.totalVotes}\n`;
    result += `更新时间: ${new Date(statistics.timestamp).toLocaleString()}\n\n`;
    
    result += `选项详情:\n`;
    for (const option of statistics.options) {
      const percentage = statistics.totalVotes > 0 
        ? ((option.voteCount / statistics.totalVotes) * 100).toFixed(2) 
        : '0.00';
      
      result += `- ${option.name} (ID: ${option.id}): ${option.voteCount}票 (${percentage}%)\n`;
    }
    
    return result;
  }

  /**
   * 导出投票结果为JSON格式
   * @param statistics 投票统计信息
   * @returns JSON格式的结果
   */
  exportVoteResultsToJson(statistics: VoteStatistics): string {
    return JSON.stringify(statistics, null, 2);
  }

  /**
   * 获取获胜选项
   * @param statistics 投票统计信息
   * @returns 获胜选项
   */
  getWinningOption(statistics: VoteStatistics): VoteOption | null {
    if (statistics.options.length === 0) {
      return null;
    }

    return statistics.options.reduce((prev, current) => 
      (prev.voteCount > current.voteCount) ? prev : current
    );
  }
}

export default VoteResultManager;