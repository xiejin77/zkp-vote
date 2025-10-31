// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// 模拟API响应
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // 模拟投票请求
    const { vote, user_id } = req.body;

    try {
      // 在实际应用中，这里会通过混合网络将请求发送到后端
      // 模拟异步处理和ZKP证明生成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟投票提交成功
      res.status(200).json({ 
        success: true, 
        message: '投票提交成功！' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: '投票提交失败' 
      });
    }
  } else if (req.method === 'GET') {
    // 模拟获取投票结果
    res.status(200).json({ 
      option0: 42,
      option1: 58,
      total: 100
    });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}