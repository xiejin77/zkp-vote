// 智能合约测试
const { expect } = require("chai");
const { ethers } = require("hardhat");

// 链配置
const CHAIN_CONFIGS = [
  {
    name: "localhost",
    chainId: 1337,
    isActive: true,
    minGasPrice: "0"
  }
];

describe("AnonymousVote", function () {
  let anonymousVote;
  let deployer;
  let voter1;
  let voter2;
  let relayer;

  beforeEach(async function () {
    // 获取签名者
    [deployer, voter1, voter2, relayer] = await ethers.getSigners();

    // 部署合约
    const AnonymousVote = await ethers.getContractFactory("AnonymousVote");
    anonymousVote = await AnonymousVote.deploy(CHAIN_CONFIGS);
    await anonymousVote.deployed();

    // 添加投票选项
    await anonymousVote.addOption("Option 0");
    await anonymousVote.addOption("Option 1");

    // 添加中继器
    await anonymousVote.addRelayer(relayer.address);

    // 开始投票
    await anonymousVote.startVoting(86400); // 24小时
  });

  describe("部署测试", function () {
    it("应该正确部署合约", async function () {
      expect(anonymousVote.address).to.not.be.undefined;
    });

    it("应该正确初始化链配置", async function () {
      const chainConfig = await anonymousVote.getChainConfig(1337);
      expect(chainConfig.name).to.equal("localhost");
      expect(chainConfig.chainId).to.equal(1337);
      expect(chainConfig.isActive).to.equal(true);
    });

    it("应该正确添加投票选项", async function () {
      const option0 = await anonymousVote.getOption(1);
      const option1 = await anonymousVote.getOption(2);
      expect(option0.name).to.equal("Option 0");
      expect(option1.name).to.equal("Option 1");
    });
  });

  describe("投票测试", function () {
    it("应该允许用户提交投票", async function () {
      // 模拟投票证明
      const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
      };

      const nullifier = ethers.utils.formatBytes32String("test-nullifier-1");

      // 提交投票
      await expect(
        anonymousVote.submitVote(proof, nullifier, 1)
      ).to.emit(anonymousVote, "VoteSubmitted");

      // 检查投票计数
      const option = await anonymousVote.getOption(1);
      expect(option.voteCount).to.equal(1);

      const totalVotes = await anonymousVote.getTotalVotes();
      expect(totalVotes).to.equal(1);
    });

    it("应该防止重复投票", async function () {
      // 模拟投票证明
      const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
      };

      const nullifier = ethers.utils.formatBytes32String("test-nullifier-2");

      // 第一次提交投票
      await anonymousVote.submitVote(proof, nullifier, 1);

      // 第二次提交相同的防重标识
      await expect(
        anonymousVote.submitVote(proof, nullifier, 1)
      ).to.be.revertedWith("Nullifier already used");
    });

    it("应该验证投票选项有效性", async function () {
      // 模拟投票证明
      const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
      };

      const nullifier = ethers.utils.formatBytes32String("test-nullifier-3");

      // 提交无效的投票选项
      await expect(
        anonymousVote.submitVote(proof, nullifier, 999)
      ).to.be.revertedWith("Invalid option ID");
    });
  });

  describe("批量投票测试", function () {
    it("应该允许中继器提交批量投票", async function () {
      // 模拟批量投票数据
      const batchVotes = [
        {
          proof: {
            a: [1, 2],
            b: [[3, 4], [5, 6]],
            c: [7, 8]
          },
          nullifier: ethers.utils.formatBytes32String("batch-nullifier-1"),
          optionId: 1,
          signature: "0x"
        },
        {
          proof: {
            a: [9, 10],
            b: [[11, 12], [13, 14]],
            c: [15, 16]
          },
          nullifier: ethers.utils.formatBytes32String("batch-nullifier-2"),
          optionId: 2,
          signature: "0x"
        }
      ];

      const voters = [voter1.address, voter2.address];

      // 提交批量投票
      await expect(
        anonymousVote.connect(relayer).submitBatchVotes(batchVotes, voters)
      ).to.emit(anonymousVote, "BatchVotesSubmitted");

      // 检查投票计数
      const option0 = await anonymousVote.getOption(1);
      const option1 = await anonymousVote.getOption(2);
      expect(option0.voteCount).to.equal(1);
      expect(option1.voteCount).to.equal(1);

      const totalVotes = await anonymousVote.getTotalVotes();
      expect(totalVotes).to.equal(2);
    });

    it("应该只允许中继器提交批量投票", async function () {
      // 模拟批量投票数据
      const batchVotes = [
        {
          proof: {
            a: [1, 2],
            b: [[3, 4], [5, 6]],
            c: [7, 8]
          },
          nullifier: ethers.utils.formatBytes32String("batch-nullifier-3"),
          optionId: 1,
          signature: "0x"
        }
      ];

      const voters = [voter1.address];

      // 非中继器尝试提交批量投票
      await expect(
        anonymousVote.connect(voter1).submitBatchVotes(batchVotes, voters)
      ).to.be.revertedWith("Only approved relayer can call this function");
    });
  });

  describe("投票状态测试", function () {
    it("应该正确管理投票状态", async function () {
      // 检查投票是否激活
      const isVotingActive = await anonymousVote.isVotingActive();
      expect(isVotingActive).to.equal(true);

      // 结束投票
      await anonymousVote.endVoting();

      // 检查投票是否已结束
      const isVotingActiveAfter = await anonymousVote.isVotingActive();
      expect(isVotingActiveAfter).to.equal(false);

      // 尝试在投票结束后提交投票
      const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
      };

      const nullifier = ethers.utils.formatBytes32String("end-vote-nullifier");

      await expect(
        anonymousVote.submitVote(proof, nullifier, 1)
      ).to.be.revertedWith("Voting is not active");
    });
  });

  describe("紧急暂停测试", function () {
    it("应该允许紧急暂停", async function () {
      // 紧急暂停
      await expect(
        anonymousVote.emergencyPause("Security issue")
      ).to.emit(anonymousVote, "EmergencyPaused");

      // 检查是否已暂停
      const emergencyPaused = await anonymousVote.emergencyPaused();
      expect(emergencyPaused).to.equal(true);

      // 尝试在暂停后提交投票
      const proof = {
        a: [1, 2],
        b: [[3, 4], [5, 6]],
        c: [7, 8]
      };

      const nullifier = ethers.utils.formatBytes32String("paused-nullifier");

      await expect(
        anonymousVote.submitVote(proof, nullifier, 1)
      ).to.be.revertedWith("Contract is emergency paused");
    });

    it("应该允许解除紧急暂停", async function () {
      // 紧急暂停
      await anonymousVote.emergencyPause("Security issue");

      // 解除紧急暂停
      await expect(
        anonymousVote.emergencyUnpause("Issue resolved")
      ).to.emit(anonymousVote, "EmergencyUnpaused");

      // 检查是否已解除暂停
      const emergencyPaused = await anonymousVote.emergencyPaused();
      expect(emergencyPaused).to.equal(false);
    });
  });

  describe("权限测试", function () {
    it("应该只允许所有者添加投票选项", async function () {
      await expect(
        anonymousVote.connect(voter1).addOption("Option 2")
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("应该只允许所有者添加中继器", async function () {
      await expect(
        anonymousVote.connect(voter1).addRelayer(voter2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("应该只允许所有者开始和结束投票", async function () {
      await expect(
        anonymousVote.connect(voter1).startVoting(86400)
      ).to.be.revertedWith("Only owner can call this function");

      await expect(
        anonymousVote.connect(voter1).endVoting()
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("应该只允许所有者紧急暂停和解除暂停", async function () {
      await expect(
        anonymousVote.connect(voter1).emergencyPause("Security issue")
      ).to.be.revertedWith("Only owner can call this function");

      await expect(
        anonymousVote.connect(voter1).emergencyUnpause("Issue resolved")
      ).to.be.revertedWith("Only owner can call this function");
    });
  });
});
