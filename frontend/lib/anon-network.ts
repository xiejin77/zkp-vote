// 混合网络通信模块
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 混合网络节点配置
const MIX_NODES = [
  'https://mix1.example.com',
  'https://mix2.example.com',
  'https://mix3.example.com'
];

// Tor代理配置
const TOR_PROXY = 'socks5://127.0.0.1:9050';

// 重试配置
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000
};

/**
 * 生成随机延迟
 * @param min 最小延迟（毫秒）
 * @param max 最大延迟（毫秒）
 * @returns 延迟时间（毫秒）
 */
function generateRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 带重试的请求发送
 * @param fn 请求函数
 * @param attempts 尝试次数
 * @returns 响应数据
 */
async function sendWithRetry<T>(fn: () => Promise<T>, attempts: number = RETRY_CONFIG.maxAttempts): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    
    // 指数退避重试
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, RETRY_CONFIG.maxAttempts - attempts),
      RETRY_CONFIG.maxDelay
    );
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return sendWithRetry(fn, attempts - 1);
  }
}

/**
 * 通过混合网络发送请求
 * @param data 要发送的数据
 * @returns 响应数据
 */
export async function sendThroughMixNetwork(data: any): Promise<any> {
  try {
    // 随机选择一个混合节点
    const randomNode = MIX_NODES[Math.floor(Math.random() * MIX_NODES.length)];
    
    // 添加随机延迟以增加混淆
    const delay = generateRandomDelay(500, 1500); // 500-1500ms延迟
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 发送请求到混合节点
    const response = await sendWithRetry(async () => {
      return await axios.post(`${randomNode}/submit`, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        timeout: 30000, // 30秒超时
        // 在实际应用中，这里会配置代理
        // proxy: false, // 禁用默认代理
        // httpAgent: new SocksProxyAgent(TOR_PROXY),
        // httpsAgent: new SocksProxyAgent(TOR_PROXY)
      });
    });
    
    return response.data;
  } catch (error) {
    console.error('混合网络发送失败:', error);
    throw new Error('无法通过匿名网络发送请求，请检查网络连接后重试');
  }
}

/**
 * 通过Tor网络发送请求（需要Tor代理运行）
 * @param url 目标URL
 * @param data 要发送的数据
 * @returns 响应数据
 */
export async function sendThroughTor(url: string, data: any): Promise<any> {
  try {
    // 添加随机延迟
    const delay = generateRandomDelay(1000, 3000); // 1-3秒延迟
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 模拟Tor网络请求
    const response = await sendWithRetry(async () => {
      return await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        },
        timeout: 60000, // 60秒超时
        // 在实际应用中，这里会配置Tor代理
        // proxy: false,
        // httpAgent: new SocksProxyAgent(TOR_PROXY),
        // httpsAgent: new SocksProxyAgent(TOR_PROXY)
      });
    });
    
    return response.data;
  } catch (error) {
    console.error('Tor网络发送失败:', error);
    throw new Error('无法通过Tor网络发送请求，请检查Tor服务是否运行');
  }
}

/**
 * 批量发送请求以增加匿名性
 * @param requests 请求列表
 * @returns 响应列表
 */
export async function sendBatchRequests(requests: any[]): Promise<any[]> {
  try {
    // 随机打乱请求顺序
    const shuffledRequests = [...requests].sort(() => Math.random() - 0.5);
    
    // 并行发送所有请求
    const promises = shuffledRequests.map(req => 
      sendThroughMixNetwork(req)
    );
    
    // 等待所有请求完成
    const results = await Promise.all(promises);
    
    return results;
  } catch (error) {
    console.error('批量发送请求失败:', error);
    throw new Error('批量发送请求失败，请检查网络连接后重试');
  }
}

/**
 * 检查网络连接
 * @returns 网络是否可用
 */
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // 尝试连接到一个可靠的服务器
    await axios.get('https://www.google.com', {
      timeout: 5000
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 检查Tor网络连接
 * @returns Tor网络是否可用
 */
export async function checkTorConnectivity(): Promise<boolean> {
  try {
    // 尝试通过Tor代理连接到一个检测Tor的服务
    await axios.get('https://check.torproject.org', {
      timeout: 10000,
      // 在实际应用中，这里会配置Tor代理
      // httpAgent: new SocksProxyAgent(TOR_PROXY),
      // httpsAgent: new SocksProxyAgent(TOR_PROXY)
    });
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  sendThroughMixNetwork,
  sendThroughTor,
  sendBatchRequests,
  checkNetworkConnectivity,
  checkTorConnectivity
};