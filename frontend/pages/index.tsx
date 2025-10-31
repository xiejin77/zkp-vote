import { useState, useEffect } from 'react';
import { sendThroughMixNetwork } from '@/lib/anon-network';
import { getUserIdentifier, hasUserVoted, recordUserVote, validateVote, validateUserId } from '@/lib/auth';

// 支持的区块链网络
const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum Mainnet', icon: 'eth' },
  { id: 'goerli', name: 'Goerli Testnet', icon: 'eth' },
  { id: 'bsc', name: 'Binance Smart Chain', icon: 'bsc' },
  { id: 'bscTestnet', name: 'BSC Testnet', icon: 'bsc' },
  { id: 'polygon', name: 'Polygon Mainnet', icon: 'matic' },
  { id: 'localhost', name: 'Localhost', icon: 'local' }
];

export default function Home() {
  const [vote, setVote] = useState<number | null>(null);
  const [userId, setUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; gasCost?: string } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [gasOption, setGasOption] = useState<'direct' | 'relayer'>('relayer');
  const [selectedChain, setSelectedChain] = useState('localhost'); // 默认选择本地网络

  useEffect(() => {
    // 页面加载时检查用户是否已投票
    const voted = hasUserVoted();
    setHasVoted(voted);
    
    // 获取或生成用户标识
    const identifier = getUserIdentifier();
    setUserId(identifier);
  }, []);

  const handleSubmit = async () => {
    // 验证投票选择
    const voteValidation = validateVote(vote);
    if (!voteValidation.valid) {
      setResult({ success: false, message: voteValidation.message });
      return;
    }

    // 验证用户ID
    const idValidation = validateUserId(userId);
    if (!idValidation.valid) {
      setResult({ success: false, message: idValidation.message });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // 构造投票数据
      const voteData = {
        vote,
        user_id: userId,
        timestamp: Date.now(),
        gas_option: gasOption,
        chain: selectedChain // 添加链选项
      };

      // 通过混合网络发送投票请求
      const response = await sendThroughMixNetwork(voteData);

      // 记录用户投票
      recordUserVote(vote!);

      setResult({
        success: response.success,
        message: response.message,
        gasCost: response.gas_cost // 如果有Gas费用信息
      });
      
      // 更新投票状态
      setHasVoted(true);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || '提交失败，请稍后重试'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">匿名投票系统</h1>
          
          <div className="bg-green-100 text-green-800 p-4 rounded-md mb-6">
            <p className="text-center font-medium">您已经成功提交了投票！</p>
            <p className="text-center mt-2">感谢您的参与。</p>
          </div>
          
          <div className="text-center">
            <a 
              href="/results" 
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              查看投票结果
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">匿名投票系统</h1>
        
        <div className="mb-6">
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
            用户ID
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入您的用户ID"
          />
          <p className="mt-1 text-xs text-gray-500">
            您的用户ID将用于防止重复投票，不会与投票选择关联
          </p>
        </div>
        
        <div className="mb-6">
          <p className="block text-sm font-medium text-gray-700 mb-2">
            请选择您的投票选项
          </p>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="vote"
                checked={vote === 0}
                onChange={() => setVote(0)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700">选项 0</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="vote"
                checked={vote === 1}
                onChange={() => setVote(1)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700">选项 1</span>
            </label>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="block text-sm font-medium text-gray-700 mb-2">
            选择区块链网络
          </p>
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SUPPORTED_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            选择部署智能合约的区块链网络
          </p>
        </div>
        
        <div className="mb-6">
          <p className="block text-sm font-medium text-gray-700 mb-2">
            Gas费用选项
          </p>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="gasOption"
                checked={gasOption === 'relayer'}
                onChange={() => setGasOption('relayer')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700">中继器支付（推荐，费用较低）</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gasOption"
                checked={gasOption === 'direct'}
                onChange={() => setGasOption('direct')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700">自己支付（费用较高，但更直接）</span>
            </label>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isSubmitting ? '提交中...' : '提交投票'}
        </button>
        
        {result && (
          <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.message}
            {result.gasCost && (
              <p className="mt-2 text-sm">预计Gas费用: {result.gasCost}</p>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-4">投票说明</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>本系统采用零知识证明技术确保您的投票匿名性</li>
          <li>您的投票选择不会被任何人知晓</li>
          <li>每个用户ID只能投票一次</li>
          <li>投票请求将通过混合网络发送，进一步保护您的隐私</li>
          <li>投票结果将通过区块链进行验证和公示</li>
          <li>您可以选择由中继器支付Gas费用以降低个人成本</li>
          <li>支持多条区块链网络部署</li>
        </ul>
      </div>
    </div>
  );
}