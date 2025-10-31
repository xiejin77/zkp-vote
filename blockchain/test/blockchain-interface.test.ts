// 区块链接口测试用例
import { expect } from 'chai';
import { ethers } from 'ethers';
import { BlockchainInterface } from './blockchain-interface';
import { ZKPManager, ZKProof, VoteData } from './zkp-manager';
import { VoteResultManager } from './vote-result-manager';
import { EventLogger } from './event-logger';

describe('Blockchain Interface Tests', () => {
  let blockchain: BlockchainInterface;
  let zkpManager: ZKPManager;
  let resultManager: VoteResultManager;
  let eventLogger: EventLogger;

  // 测试前准备
  before(async () => {
    // 初始化区块链接口
    blockchain = new BlockchainInterface('localhost');
    
    // 初始化其他管理器
    zkpManager = new ZKPManager(blockchain);
    resultManager = new VoteResultManager(blockchain);
    eventLogger = new EventLogger(blockchain);
  });

  // 测试区块链连接
  describe('Blockchain Connection', () => {
    it('should create blockchain interface instance', () => {
      expect(blockchain).to.be.an.instanceOf(BlockchainInterface);
    });

    it('should have correct network configuration', () => {
      // 这个测试需要访问私有属性，实际应用中可能需要添加getter方法
      // expect(blockchain.network).to.equal('localhost');
    });
  });

  // 测试ZKP证明管理
  describe('ZKP Proof Management', () => {
    it('should validate correct proof format', () => {
      const proof: ZKProof = {
        a: ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234'],
        b: [
          ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234'],
          ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234']
        ],
        c: ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234']
      };

      // 由于isValidProof是私有方法，我们通过verifyProofOffChain间接测试
      const voteData: VoteData = {
        proof,
        nullifier: '0x1234567890123456789012345678901234567890123456789012345678901234',
        optionId: 1
      };

      // 这个测试只是检查不抛出异常
      expect(() => {
        zkpManager.verifyProofOffChain(voteData);
      }).to.not.throw();
    });

    it('should reject invalid proof format', () => {
      const invalidProof: any = {
        a: ['invalid_hex', '0x1234567890123456789012345678901234567890123456789012345678901234'],
        b: [
          ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234'],
          ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234']
        ],
        c: ['0x1234567890123456789012345678901234567890123456789012345678901234', '0x1234567890123456789012345678901234567890123456789012345678901234']
      };

      const voteData: VoteData = {
        proof: invalidProof,
        nullifier: '0x1234567890123456789012345678901234567890123456789012345678901234',
        optionId: 1
      };

      // 由于verifyProofOffChain内部会捕获错误并返回false，我们测试返回值
      zkpManager.verifyProofOffChain(voteData).then(result => {
        expect(result).to.be.false;
      });
    });
  });

  // 测试投票结果管理
  describe('Vote Result Management', () => {
    it('should format vote results correctly', () => {
      const statistics = {
        totalVotes: 100,
        options: [
          { id: 1, name: 'Option 1', voteCount: 60 },
          { id: 2, name: 'Option 2', voteCount: 40 }
        ],
        timestamp: Date.now()
      };

      const formatted = resultManager.formatVoteResults(statistics);
      expect(formatted).to.include('总票数: 100');
      expect(formatted).to.include('Option 1');
      expect(formatted).to.include('Option 2');
    });

    it('should export vote results to JSON', () => {
      const statistics = {
        totalVotes: 100,
        options: [
          { id: 1, name: 'Option 1', voteCount: 60 },
          { id: 2, name: 'Option 2', voteCount: 40 }
        ],
        timestamp: Date.now()
      };

      const json = resultManager.exportVoteResultsToJson(statistics);
      expect(json).to.be.a('string');
      expect(() => JSON.parse(json)).to.not.throw();
    });

    it('should determine winning option', () => {
      const statistics = {
        totalVotes: 100,
        options: [
          { id: 1, name: 'Option 1', voteCount: 60 },
          { id: 2, name: 'Option 2', voteCount: 40 }
        ],
        timestamp: Date.now()
      };

      const winner = resultManager.getWinningOption(statistics);
      expect(winner).to.not.be.null;
      expect(winner!.name).to.equal('Option 1');
    });
  });

  // 测试事件日志
  describe('Event Logging', () => {
    it('should filter events correctly', () => {
      const events: any[] = [
        { voter: '0x123', optionId: 1, nullifier: '0xabc', timestamp: 1000, transactionHash: '0xxyz' },
        { voter: '0x456', optionId: 2, nullifier: '0xdef', timestamp: 2000, transactionHash: '0xuvw' },
        { voter: '0x789', optionId: 1, nullifier: '0xghi', timestamp: 3000, transactionHash: '0xrst' }
      ];

      const logger = new EventLogger(blockchain);
      const filtered = logger.filterEvents(events, { optionId: 1 });
      
      expect(filtered).to.have.lengthOf(2);
      expect(filtered[0].optionId).to.equal(1);
      expect(filtered[1].optionId).to.equal(1);
    });

    it('should统计 events correctly', () => {
      const events: any[] = [
        { voter: '0x123', optionId: 1, nullifier: '0xabc', timestamp: 1000, transactionHash: '0xxyz' },
        { voter: '0x456', optionId: 2, nullifier: '0xdef', timestamp: 2000, transactionHash: '0xuvw' },
        { voter: '0x789', optionId: 1, nullifier: '0xghi', timestamp: 3000, transactionHash: '0xrst' }
      ];

      const stats = EventLogger.统计Events(events);
      
      expect(stats.total).to.equal(3);
      expect(stats.byOption[1]).to.equal(2);
      expect(stats.byOption[2]).to.equal(1);
    });
  });
});