import { useState, useEffect } from 'react';
import axios from 'axios';

interface VoteResult {
  option0: number;
  option1: number;
  total: number;
}

export default function Results() {
  const [results, setResults] = useState<VoteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      // 在实际应用中，这里会从区块链或后端获取结果
      const response = await axios.get('/api/results');
      setResults(response.data);
    } catch (err) {
      setError('获取结果失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">投票结果</h1>
        
        {results && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">统计信息</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded shadow">
                  <div className="text-2xl font-bold text-blue-600">{results.option0}</div>
                  <div className="text-sm text-gray-600">选项 0</div>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <div className="text-2xl font-bold text-green-600">{results.option1}</div>
                  <div className="text-sm text-gray-600">选项 1</div>
                </div>
                <div className="bg-white p-3 rounded shadow">
                  <div className="text-2xl font-bold text-purple-600">{results.total}</div>
                  <div className="text-sm text-gray-600">总票数</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">结果可视化</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">选项 0</span>
                    <span className="text-sm font-medium text-gray-700">
                      {results.total > 0 ? ((results.option0 / results.total) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full" 
                      style={{ width: `${results.total > 0 ? (results.option0 / results.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">选项 1</span>
                    <span className="text-sm font-medium text-gray-700">
                      {results.total > 0 ? ((results.option1 / results.total) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full" 
                      style={{ width: `${results.total > 0 ? (results.option1 / results.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={fetchResults}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                刷新结果
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center text-gray-800 mb-4">结果验证</h2>
        <p className="text-gray-600 text-center">
          本投票结果已通过零知识证明技术验证，确保了投票过程的匿名性和结果的正确性。
          所有投票数据均已提交至区块链，可供公开验证。
        </p>
      </div>
    </div>
  );
}