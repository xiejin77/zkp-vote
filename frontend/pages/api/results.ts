// Next.js API route for results
import type { NextApiRequest, NextApiResponse } from 'next';

// 模拟API响应
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // 模拟获取投票结果
    // 在实际应用中，这里会从区块链或后端获取结果
    res.status(200).json({ 
      option0: 42,
      option1: 58,
      total: 100
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}