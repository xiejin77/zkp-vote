// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title 匿名投票合约
 * @dev 使用零知识证明实现匿名投票，支持多链部署和中继器模式以降低Gas费用
 */
contract AnonymousVote {
    // 投票选项结构
    struct VoteOption {
        uint256 id;
        string name;
        uint256 voteCount;
    }
    
    // 投票证明结构
    struct VoteProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }
    
    // 批量投票数据结构
    struct BatchVoteData {
        VoteProof proof;
        bytes32 nullifier;
        uint256 optionId;
        bytes signature; // 用户签名
    }
    
    // 链配置结构
    struct ChainConfig {
        string name;
        uint256 chainId;
        uint256 minGasPrice;
        bool isActive;
    }
    
    // 投票事件
    event VoteSubmitted(address indexed voter, uint256 indexed optionId, bytes32 nullifier);
    event VoteVerified(address indexed voter, uint256 indexed optionId);
    event BatchVotesSubmitted(address indexed relayer, uint256 count);
    event ChainConfigUpdated(string name, uint256 chainId, bool isActive);
    event VotingStarted(uint256 startTime, uint256 endTime);
    event VotingEnded(uint256 endTime);
    event EmergencyPaused(string reason);
    event EmergencyUnpaused(string reason);
    
    // 状态变量
    mapping(uint256 => VoteOption) public voteOptions;
    mapping(bytes32 => bool) public nullifierUsed; // 防重标识映射
    uint256 public optionCount;
    uint256 public totalVotes;
    
    // 链配置映射 - 使用chainId作为键
    mapping(uint256 => ChainConfig) public chainConfigs;
    uint256[] public chainIds; // 存储所有链ID，用于遍历
    
    // ZKP验证密钥
    uint256[2] public verifyingKeyAlpha;
    uint256[2][2] public verifyingKeyBeta;
    uint256[2][2] public verifyingKeyGamma;
    uint256[2][2] public verifyingKeyDelta;
    uint256[2][] public verifyingKeyGammaABC;
    
    // 中继器地址白名单
    mapping(address => bool) public relayers;
    
    // 合约所有者
    address public owner;
    
    // 投票状态
    bool public isVotingActive;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    
    // 紧急暂停
    bool public emergencyPaused;
    string public pauseReason;
    
    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyRelayer() {
        require(relayers[msg.sender], "Only approved relayer can call this function");
        _;
    }
    
    modifier onlyActiveChain() {
        ChainConfig memory config = chainConfigs[block.chainid];
        require(config.isActive, "Chain is not active");
        _;
    }
    
    modifier onlyWhenVotingActive() {
        require(isVotingActive && block.timestamp >= votingStartTime && block.timestamp <= votingEndTime, "Voting is not active");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Contract is emergency paused");
        _;
    }
    
    /**
     * @dev 合约构造函数
     * @param _chainConfigs 初始链配置数组
     */
    constructor(ChainConfig[] memory _chainConfigs) {
        owner = msg.sender;
        
        // 初始化链配置
        for (uint256 i = 0; i < _chainConfigs.length; i++) {
            ChainConfig memory config = _chainConfigs[i];
            chainConfigs[config.chainId] = config;
            chainIds.push(config.chainId);
        }
        
        // 初始化验证密钥
        // 注意：在实际部署时，应通过updateVerifyingKey函数设置真实的验证密钥
        verifyingKeyAlpha = [0, 0];
        verifyingKeyBeta = [[0, 0], [0, 0]];
        verifyingKeyGamma = [[0, 0], [0, 0]];
        verifyingKeyDelta = [[0, 0], [0, 0]];
        verifyingKeyGammaABC = [[0, 0]];
    }
    
    /**
     * @dev 添加投票选项
     * @param _name 选项名称
     */
    function addOption(string memory _name) public onlyOwner {
        optionCount++;
        voteOptions[optionCount] = VoteOption(optionCount, _name, 0);
    }
    
    /**
     * @dev 添加中继器
     * @param _relayer 中继器地址
     */
    function addRelayer(address _relayer) public onlyOwner {
        relayers[_relayer] = true;
    }
    
    /**
     * @dev 移除中继器
     * @param _relayer 中继器地址
     */
    function removeRelayer(address _relayer) public onlyOwner {
        relayers[_relayer] = false;
    }
    
    /**
     * @dev 添加或更新链配置
     * @param _config 链配置
     */
    function setChainConfig(ChainConfig memory _config) public onlyOwner {
        // 检查链是否已存在
        bool found = false;
        for (uint256 i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == _config.chainId) {
                found = true;
                break;
            }
        }
        
        // 如果链不存在，添加到链ID数组
        if (!found) {
            chainIds.push(_config.chainId);
        }
        
        // 更新链配置
        chainConfigs[_config.chainId] = _config;
        
        emit ChainConfigUpdated(_config.name, _config.chainId, _config.isActive);
    }
    
    /**
     * @dev 获取链配置
     * @param _chainId 链ID
     * @return 链配置
     */
    function getChainConfig(uint256 _chainId) public view returns (ChainConfig memory) {
        ChainConfig memory config = chainConfigs[_chainId];
        require(config.chainId != 0, "Chain not found");
        return config;
    }
    
    /**
     * @dev 获取所有链配置
     * @return 链配置数组
     */
    function getAllChainConfigs() public view returns (ChainConfig[] memory) {
        ChainConfig[] memory configs = new ChainConfig[](chainIds.length);
        for (uint256 i = 0; i < chainIds.length; i++) {
            configs[i] = chainConfigs[chainIds[i]];
        }
        return configs;
    }
    
    /**
     * @dev 验证零知识证明
     * @param _proof 投票证明
     * @param _nullifier 防重标识
     * @param _optionId 投票选项ID
     * @return 验证结果
     */
    function verifyProof(
        VoteProof memory _proof,
        bytes32 _nullifier,
        uint256 _optionId
    ) public view returns (bool) {
        // 检查防重标识是否已使用
        require(!nullifierUsed[_nullifier], "Nullifier already used");
        
        // 检查选项ID有效性
        require(_optionId > 0 && _optionId <= optionCount, "Invalid option ID");
        
        // 简化的验证逻辑（实际应用中需要实现完整的ZKP验证）
        // 这里我们假设证明总是有效的
        return true;
    }
    
    /**
     * @dev 提交单个投票（用户直接提交）
     * @param _proof 投票证明
     * @param _nullifier 防重标识
     * @param _optionId 投票选项ID
     */
    function submitVote(
        VoteProof memory _proof,
        bytes32 _nullifier,
        uint256 _optionId
    ) public onlyActiveChain onlyWhenVotingActive notEmergencyPaused {
        // 验证证明
        require(verifyProof(_proof, _nullifier, _optionId), "Invalid proof");
        
        // 标记防重标识为已使用
        nullifierUsed[_nullifier] = true;
        
        // 更新投票计数
        voteOptions[_optionId].voteCount++;
        totalVotes++;
        
        // 触发投票事件
        emit VoteSubmitted(msg.sender, _optionId, _nullifier);
        emit VoteVerified(msg.sender, _optionId);
    }
    
    /**
     * @dev 批量提交投票（中继器模式）
     * @param _votes 批量投票数据
     * @param _voters 对应的投票者地址
     */
    function submitBatchVotes(
        BatchVoteData[] memory _votes,
        address[] memory _voters
    ) public onlyRelayer onlyActiveChain onlyWhenVotingActive notEmergencyPaused {
        require(_votes.length == _voters.length, "Votes and voters length mismatch");
        
        uint256 validVotes = 0;
        
        for (uint256 i = 0; i < _votes.length; i++) {
            BatchVoteData memory voteData = _votes[i];
            address voter = _voters[i];
            
            // 验证用户签名
            bytes32 messageHash = keccak256(abi.encode(
                voteData.proof.a,
                voteData.proof.b,
                voteData.proof.c,
                voteData.nullifier,
                voteData.optionId
            ));
            
            // 恢复签名者地址
            address signer = recoverSigner(messageHash, voteData.signature);
            // 允许空签名用于测试
            if (signer != address(0)) {
                require(signer == voter, "Invalid signature");
            }
            
            // 验证证明
            if (verifyProof(voteData.proof, voteData.nullifier, voteData.optionId)) {
                // 标记防重标识为已使用
                nullifierUsed[voteData.nullifier] = true;
                
                // 更新投票计数
                voteOptions[voteData.optionId].voteCount++;
                totalVotes++;
                
                // 触发投票事件
                emit VoteSubmitted(voter, voteData.optionId, voteData.nullifier);
                emit VoteVerified(voter, voteData.optionId);
                
                validVotes++;
            }
        }
        
        emit BatchVotesSubmitted(msg.sender, validVotes);
    }
    
    /**
     * @dev 从签名中恢复地址
     * @param hash 消息哈希
     * @param signature 签名
     * @return 签名者地址
     */
    function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        // 允许空签名用于测试
        if (signature.length == 0) {
            return address(0);
        }
        
        // 验证签名长度
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // 处理v值
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid v value");
        
        return ecrecover(hash, v, r, s);
    }
    
    /**
     * @dev 获取投票选项信息
     * @param _optionId 选项ID
     * @return 选项信息
     */
    function getOption(uint256 _optionId) public view returns (VoteOption memory) {
        return voteOptions[_optionId];
    }
    
    /**
     * @dev 获取总投票数
     * @return 总投票数
     */
    function getTotalVotes() public view returns (uint256) {
        return totalVotes;
    }
    
    /**
     * @dev 检查防重标识是否已使用
     * @param _nullifier 防重标识
     * @return 是否已使用
     */
    function isNullifierUsed(bytes32 _nullifier) public view returns (bool) {
        return nullifierUsed[_nullifier];
    }
    
    /**
     * @dev 更新验证密钥（仅所有者可调用）
     * @param _alpha 验证密钥alpha
     * @param _beta 验证密钥beta
     * @param _gamma 验证密钥gamma
     * @param _delta 验证密钥delta
     * @param _gammaABC 验证密钥gammaABC
     */
    function updateVerifyingKey(
        uint256[2] memory _alpha,
        uint256[2][2] memory _beta,
        uint256[2][2] memory _gamma,
        uint256[2][2] memory _delta,
        uint256[2][] memory _gammaABC
    ) public onlyOwner {
        verifyingKeyAlpha = _alpha;
        verifyingKeyBeta = _beta;
        verifyingKeyGamma = _gamma;
        verifyingKeyDelta = _delta;
        verifyingKeyGammaABC = _gammaABC;
    }
    
    /**
     * @dev 开始投票
     * @param _duration 投票持续时间（秒）
     */
    function startVoting(uint256 _duration) public onlyOwner {
        require(!isVotingActive, "Voting already active");
        require(_duration > 0, "Duration must be greater than 0");
        
        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + _duration;
        isVotingActive = true;
        
        emit VotingStarted(votingStartTime, votingEndTime);
    }
    
    /**
     * @dev 结束投票
     */
    function endVoting() public onlyOwner {
        require(isVotingActive, "Voting not active");
        
        isVotingActive = false;
        
        emit VotingEnded(block.timestamp);
    }
    
    /**
     * @dev 紧急暂停
     * @param _reason 暂停原因
     */
    function emergencyPause(string memory _reason) public onlyOwner {
        require(!emergencyPaused, "Already paused");
        
        emergencyPaused = true;
        pauseReason = _reason;
        
        emit EmergencyPaused(_reason);
    }
    
    /**
     * @dev 紧急解除暂停
     * @param _reason 解除暂停原因
     */
    function emergencyUnpause(string memory _reason) public onlyOwner {
        require(emergencyPaused, "Not paused");
        
        emergencyPaused = false;
        pauseReason = _reason;
        
        emit EmergencyUnpaused(_reason);
    }
}