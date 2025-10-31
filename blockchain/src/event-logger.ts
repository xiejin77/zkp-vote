// 事件日志和监听机制模块
import { BlockchainInterface } from './blockchain-interface';

// 投票事件接口
export interface VoteEvent {
  voter: string;
  optionId: number;
  nullifier: string;
  timestamp: number;
  transactionHash: string;
}

// 事件监听器接口
export interface EventListener {
  (event: VoteEvent): void;
}

/**
 * 事件日志管理类
 */
export class EventLogger {
  private blockchain: BlockchainInterface;
  private eventListeners: EventListener[] = [];
  private isListening: boolean = false;

  /**
   * 构造函数
   * @param blockchain 区块链接口实例
   */
  constructor(blockchain: BlockchainInterface) {
    this.blockchain = blockchain;
  }

  /**
   * 添加事件监听器
   * @param listener 事件监听器
   */
  addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   * @param listener 事件监听器
   */
  removeEventListener(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 开始监听投票事件
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('Already listening for events');
      return;
    }

    try {
      this.isListening = true;
      
      // 监听VoteSubmitted事件
      await this.blockchain.onVoteSubmitted((voter, optionId, nullifier) => {
        const event: VoteEvent = {
          voter,
          optionId,
          nullifier,
          timestamp: Date.now(),
          transactionHash: '' // 在实际应用中，这里应该是实际的交易哈希
        };
        
        // 通知所有监听器
        this.notifyListeners(event);
      });
      
      console.log('Started listening for vote events');
    } catch (error) {
      console.error('Error starting event listener:', error);
      this.isListening = false;
      throw error;
    }
  }

  /**
   * 停止监听投票事件
   */
  stopListening(): void {
    this.isListening = false;
    console.log('Stopped listening for vote events');
  }

  /**
   * 通知所有监听器
   * @param event 投票事件
   */
  private notifyListeners(event: VoteEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  /**
   * 记录事件到日志文件（简化版）
   * @param event 投票事件
   */
  logEvent(event: VoteEvent): void {
    // 在实际应用中，这里会将事件记录到日志文件或数据库
    console.log(`[Vote Event] Voter: ${event.voter}, Option: ${event.optionId}, Timestamp: ${new Date(event.timestamp).toISOString()}`);
  }

  /**
   * 获取历史事件（简化版）
   * @param limit 限制数量
   * @returns 历史事件数组
   */
  async getHistoricalEvents(limit: number = 100): Promise<VoteEvent[]> {
    // 在实际应用中，这里会从日志文件或数据库中获取历史事件
    // 为简化起见，我们返回空数组
    console.warn('Historical events not implemented in this simplified version');
    return [];
  }

  /**
   * 过滤事件
   * @param events 事件数组
   * @param filter 过滤条件
   * @returns 过滤后的事件数组
   */
  filterEvents(events: VoteEvent[], filter: Partial<VoteEvent>): VoteEvent[] {
    return events.filter(event => {
      for (const key in filter) {
        if (filter[key as keyof VoteEvent] !== event[key as keyof VoteEvent]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 统计事件
   * @param events 事件数组
   * @returns 统计结果
   */
  static统计Events(events: VoteEvent[]): { total: number; byOption: Record<number, number> } {
    const stats = {
      total: events.length,
      byOption: {} as Record<number, number>
    };

    for (const event of events) {
      if (!stats.byOption[event.optionId]) {
        stats.byOption[event.optionId] = 0;
      }
      stats.byOption[event.optionId]++;
    }

    return stats;
  }
}

export default EventLogger;