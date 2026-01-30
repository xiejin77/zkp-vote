// 用户身份验证和防重机制
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

// 模拟本地存储用户标识
let userIdentifier: string | null = null;

/**
 * 生成或获取用户标识
 * @returns 用户标识
 */
export function getUserIdentifier(): string {
  if (!userIdentifier) {
    // 检查本地存储中是否已有用户标识
    const storedId = localStorage.getItem('zkp_vote_user_id');
    if (storedId) {
      userIdentifier = storedId;
    } else {
      // 生成新的用户标识
      userIdentifier = uuidv4();
      // 存储到本地存储
      localStorage.setItem('zkp_vote_user_id', userIdentifier);
    }
  }
  
  return userIdentifier;
}

/**
 * 生成防重标识
 * @param userId 用户ID
 * @returns 防重标识
 */
export function generateNullifier(userId: string): string {
  // 使用更安全的方式生成防重标识
  const hash = ethers.keccak256(ethers.toUtf8Bytes(userId + Date.now().toString()));
  return hash;
}

/**
 * 验证用户是否已投票
 * @returns 是否已投票
 */
export function hasUserVoted(): boolean {
  const userId = getUserIdentifier();
  // 检查本地存储中是否有投票记录
  const voteRecord = localStorage.getItem(`zkp_vote_record_${userId}`);
  return voteRecord !== null;
}

/**
 * 记录用户投票
 * @param vote 投票选择
 */
export function recordUserVote(vote: number): void {
  const userId = getUserIdentifier();
  // 记录投票信息到本地存储
  localStorage.setItem(`zkp_vote_record_${userId}`, vote.toString());
}

/**
 * 验证投票输入
 * @param vote 投票选择
 * @returns 验证结果
 */
export function validateVote(vote: number | null): { valid: boolean; message: string } {
  if (vote === null) {
    return { valid: false, message: '请选择一个投票选项' };
  }
  
  if (vote < 0) {
    return { valid: false, message: '投票选项必须是非负整数' };
  }
  
  return { valid: true, message: '' };
}

/**
 * 验证用户ID
 * @param userId 用户ID
 * @returns 验证结果
 */
export function validateUserId(userId: string): { valid: boolean; message: string } {
  if (!userId) {
    return { valid: false, message: '用户ID不能为空' };
  }
  
  if (userId.length < 3) {
    return { valid: false, message: '用户ID长度至少为3个字符' };
  }
  
  return { valid: true, message: '' };
}

/**
 * 生成投票签名
 * @param voteData 投票数据
 * @param signer 签名者
 * @returns 签名
 */
export async function signVote(voteData: any, signer: ethers.Signer): Promise<string> {
  const message = JSON.stringify(voteData);
  const signature = await signer.signMessage(message);
  return signature;
}

/**
 * 验证投票签名
 * @param voteData 投票数据
 * @param signature 签名
 * @param address 签名者地址
 * @returns 验证结果
 */
export function verifyVoteSignature(voteData: any, signature: string, address: string): boolean {
  try {
    const message = JSON.stringify(voteData);
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}

export default {
  getUserIdentifier,
  generateNullifier,
  hasUserVoted,
  recordUserVote,
  validateVote,
  validateUserId,
  signVote,
  verifyVoteSignature
};