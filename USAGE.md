# 基于ZKP的匿名投票系统使用指南

## 1. 系统概述

基于ZKP的匿名投票系统是一个使用零知识证明技术确保投票匿名性和可验证性的系统。系统支持多链部署，通过混合网络增强隐私保护，并采用中继器模式降低用户Gas费用。

### 核心功能

- **匿名投票**：使用零知识证明确保投票内容不被泄露
- **防重机制**：使用nullifier防止重复投票
- **混合网络**：通过混合网络发送请求，增强隐私保护
- **多链支持**：支持在以太坊、BSC、Polygon等多条区块链上部署
- **Gas优化**：通过中继器和批量处理降低Gas费用
- **安全特性**：多层安全防护，包括紧急暂停和权限控制

## 2. 环境要求

### 前端环境

- Node.js 16+
- npm 7+
- Git

### 后端环境

- Rust 1.70+
- Cargo
- Git

### 区块链环境

- Hardhat
- 以太坊钱包（如MetaMask）
- 测试网ETH（用于部署和测试）

## 3. 安装步骤

### 3.1 克隆仓库

```bash
git clone https://github.com/your-username/zkp-vote.git
cd zkp-vote
```

### 3.2 安装前端依赖

```bash
cd frontend
npm install
```

### 3.3 安装后端依赖

```bash
cd ..
cargo build
```

### 3.4 安装区块链依赖

```bash
cd blockchain
npm install
```

## 4. 配置说明

### 4.1 环境变量配置

创建`.env`文件，配置以下环境变量：

```bash
# .env文件示例
INFURA_PROJECT_ID=your_infura_project_id
PRIVATE_KEY=your_private_key
BSC_RPC_URL=your_bsc_rpc_url
POLYGON_RPC_URL=your_polygon_rpc_url
```

### 4.2 链配置

在`blockchain/scripts/deploy.js`中配置链信息：

```javascript
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
  // 其他链配置...
];
```

### 4.3 前端配置

在`frontend/lib/anon-network.ts`中配置混合网络节点：

```typescript
// 混合网络节点配置
const MIX_NODES = [
  'https://mix1.example.com',
  'https://mix2.example.com',
  'https://mix3.example.com'
];
```

## 5. 使用方法

### 5.1 部署智能合约

#### 部署到本地网络

```bash
cd blockchain
npx hardhat node # 启动本地节点
# 在另一个终端中运行
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

#### 部署到测试网络

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network goerli
```

#### 部署到主网络

```bash
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.js --network mainnet
```

### 5.2 启动后端服务

```bash
cd ..
cargo run
```

后端服务将在`http://localhost:3030`启动。

### 5.3 启动前端服务

```bash
cd frontend
npm run dev
```

前端服务将在`http://localhost:3000`启动。

### 5.4 投票流程

1. **访问投票页面**：打开浏览器，访问`http://localhost:3000`

2. **输入用户ID**：输入您的用户ID，或使用系统生成的ID

3. **选择投票选项**：选择您要投票的选项

4. **选择区块链网络**：从下拉菜单中选择要使用的区块链网络

5. **选择Gas费用选项**：
   - 中继器支付：费用较低，推荐
   - 自己支付：费用较高，但更直接

6. **提交投票**：点击"提交投票"按钮

7. **确认交易**：如果选择"自己支付"，需要在钱包中确认交易

8. **查看结果**：投票成功后，可以点击"查看投票结果"查看实时结果

### 5.5 查看投票结果

1. **访问结果页面**：打开浏览器，访问`http://localhost:3000/results`

2. **选择区块链网络**：从下拉菜单中选择要查看结果的区块链网络

3. **查看结果**：系统将显示该网络上的投票结果

## 6. 管理操作

### 6.1 添加投票选项

1. **连接钱包**：使用部署合约的钱包连接到区块链

2. **调用合约**：调用`addOption`函数添加投票选项

   ```bash
   # 使用Hardhat控制台
   npx hardhat console --network localhost
   const AnonymousVote = await ethers.getContractFactory("AnonymousVote");
   const contract = await AnonymousVote.attach("your-contract-address");
   await contract.addOption("Option Name");
   ```

### 6.2 开始/结束投票

1. **开始投票**：调用`startVoting`函数，指定投票持续时间（秒）

   ```bash
   await contract.startVoting(86400); // 24小时
   ```

2. **结束投票**：调用`endVoting`函数

   ```bash
   await contract.endVoting();
   ```

### 6.3 紧急暂停/解除暂停

1. **紧急暂停**：调用`emergencyPause`函数，指定暂停原因

   ```bash
   await contract.emergencyPause("Security issue");
   ```

2. **解除暂停**：调用`emergencyUnpause`函数，指定解除暂停原因

   ```bash
   await contract.emergencyUnpause("Issue resolved");
   ```

### 6.4 添加中继器

调用`addRelayer`函数添加中继器地址：

```bash
await contract.addRelayer("relayer-address");
```

## 7. 常见问题解答

### 7.1 投票失败怎么办？

- **检查网络连接**：确保您的网络连接正常
- **检查钱包余额**：如果选择"自己支付"，确保钱包中有足够的Gas费用
- **检查链状态**：确保选择的区块链网络已激活
- **检查投票状态**：确保投票已开始且未结束

### 7.2 如何查看交易状态？

- **使用区块链浏览器**：在Etherscan、BSCScan或PolygonScan上搜索交易哈希
- **查看钱包**：在MetaMask等钱包中查看交易历史

### 7.3 如何切换到其他区块链网络？

- **在前端**：从下拉菜单中选择其他网络
- **在MetaMask**：切换到相应的网络
- **确保合约已部署**：确保目标网络上已部署合约

### 7.4 Gas费用太高怎么办？

- **选择中继器支付**：费用较低
- **等待网络拥堵缓解**：网络拥堵时Gas费用较高
- **使用其他网络**：如BSC或Polygon，Gas费用通常较低

### 7.5 如何确保投票匿名性？

- **使用混合网络**：系统默认使用混合网络发送请求
- **使用Tor网络**：如果需要更高的隐私保护，可以配置Tor代理
- **不要重复使用用户ID**：为不同的投票使用不同的用户ID

## 8. 故障排除

### 8.1 前端问题

- **依赖安装失败**：尝试删除`node_modules`和`package-lock.json`，重新运行`npm install`
- **编译错误**：确保Node.js版本符合要求
- **网络连接错误**：检查网络连接和后端服务是否运行

### 8.2 后端问题

- **编译错误**：确保Rust版本符合要求
- **运行错误**：检查端口是否被占用
- **区块链连接错误**：检查RPC URL是否正确

### 8.3 区块链问题

- **部署失败**：确保私钥正确，且钱包中有足够的Gas费用
- **交易失败**：检查交易参数是否正确，Gas费用是否足够
- **合约交互失败**：确保调用者有正确的权限

## 9. 最佳实践

### 9.1 安全最佳实践

- **使用硬件钱包**：存储部署私钥
- **限制权限**：只授予必要的权限
- **定期更新**：及时更新依赖和安全补丁
- **安全审计**：部署前进行安全审计

### 9.2 性能最佳实践

- **使用中继器**：降低Gas费用
- **批量处理**：减少交易次数
- **优化参数**：合理设置投票持续时间和Gas价格

### 9.3 隐私最佳实践

- **使用混合网络**：增强隐私保护
- **使用Tor网络**：更高的隐私保护
- **随机用户ID**：为不同投票使用不同的用户ID
- **避免关联**：不要在多个场合使用相同的用户标识

## 10. 高级配置

### 10.1 自定义混合网络节点

在`frontend/lib/anon-network.ts`中配置自定义混合网络节点：

```typescript
// 混合网络节点配置
const MIX_NODES = [
  'https://your-mix-node-1.com',
  'https://your-mix-node-2.com',
  'https://your-mix-node-3.com'
];
```

### 10.2 自定义ZKP电路

在`src/lib.rs`中修改投票电路的约束条件：

```rust
impl<F: PrimeField> ConstraintSynthesizer<F> for VoteCircuit<F> {
    fn generate_constraints(self, cs: ConstraintSystemRef<F>) -> Result<(), SynthesisError> {
        // 添加自定义约束条件
        // ...
    }
}
```

### 10.3 自定义链配置

在`blockchain/scripts/deploy.js`中添加自定义链配置：

```javascript
const CHAIN_CONFIGS = [
  // 现有配置...
  {
    name: "customChain",
    chainId: 123456,
    isActive: true,
    minGasPrice: "1000000000" // 1 Gwei
  }
];
```

## 11. 故障恢复

### 11.1 智能合约故障

- **紧急暂停**：如果发现安全漏洞，立即调用`emergencyPause`
- **部署新合约**：修复漏洞后部署新合约
- **数据迁移**：将旧合约的数据迁移到新合约

### 11.2 后端服务故障

- **备份数据**：定期备份后端数据
- **快速部署**：准备快速部署脚本
- **监控系统**：设置监控系统，及时发现故障

### 11.3 前端服务故障

- **CDN缓存**：使用CDN缓存静态资源
- **多区域部署**：在多个区域部署前端服务
- **监控系统**：设置监控系统，及时发现故障

## 12. 常见错误码

### 前端错误

- **NETWORK_ERROR**：网络连接错误
- **INVALID_INPUT**：无效的用户输入
- **VOTE_FAILED**：投票提交失败
- **RESULT_FETCH_FAILED**：获取结果失败

### 后端错误

- **PROOF_GENERATION_FAILED**：ZKP证明生成失败
- **PROOF_VERIFICATION_FAILED**：ZKP证明验证失败
- **BLOCKCHAIN_ERROR**：区块链交互错误
- **NULLIFIER_ALREADY_USED**：防重标识已使用

### 智能合约错误

- **Only owner can call this function**：只有所有者可以调用此函数
- **Only approved relayer can call this function**：只有授权的中继器可以调用此函数
- **Nullifier already used**：防重标识已使用
- **Invalid option ID**：无效的选项ID
- **Voting is not active**：投票未激活
- **Contract is emergency paused**：合约已紧急暂停

## 13. 联系支持

如果您在使用过程中遇到问题，可以通过以下方式联系支持：

- **GitHub Issues**：在GitHub仓库中提交Issue
- **Email**：support@zkp-vote.com
- **Discord**：加入我们的Discord社区

## 14. 版本历史

### v1.0.0

- 初始版本
- 支持以太坊、BSC、Polygon
- 实现基本投票功能
- 支持混合网络
- 支持中继器模式

### v1.1.0

- 增加紧急暂停功能
- 优化Gas费用
- 改进用户界面
- 增加多语言支持

### v2.0.0

- 支持更多区块链网络
- 实现更复杂的投票规则
- 优化ZKP证明生成性能
- 增加移动应用支持

## 15. 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。

---

感谢您使用基于ZKP的匿名投票系统！我们致力于提供安全、隐私、高效的投票解决方案。如有任何问题或建议，欢迎联系我们。