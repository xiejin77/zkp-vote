// 前端测试用例
import { validateAndSanitizeInput, sanitizeInput } from '@/lib/security';
import { validateVote, validateUserId } from '@/lib/auth';

describe('安全防护测试', () => {
  test('输入清理功能', () => {
    // 测试基本的XSS清理
    expect(sanitizeInput('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    
    // 测试引号清理
    expect(sanitizeInput('\'"'))
      .toBe('&#x27;&quot;');
  });

  test('输入验证和清理', () => {
    // 测试有效输入
    const validInput = 'This is a valid input';
    const result = validateAndSanitizeInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(validInput);
    
    // 测试包含XSS的输入
    const xssInput = '<script>alert("xss")</script>';
    const xssResult = validateAndSanitizeInput(xssInput);
    expect(xssResult.valid).toBe(false);
    
    // 测试过长输入
    const longInput = 'a'.repeat(1001);
    const longResult = validateAndSanitizeInput(longInput);
    expect(longResult.valid).toBe(false);
  });
});

describe('用户验证测试', () => {
  test('投票验证', () => {
    // 测试有效投票
    expect(validateVote(0)).toEqual({ valid: true, message: '' });
    expect(validateVote(1)).toEqual({ valid: true, message: '' });
    
    // 测试无效投票
    expect(validateVote(null)).toEqual({ valid: false, message: '请选择一个投票选项' });
    expect(validateVote(2)).toEqual({ valid: false, message: '投票选项必须是0或1' });
  });

  test('用户ID验证', () => {
    // 测试有效用户ID
    expect(validateUserId('validUser123')).toEqual({ valid: true, message: '' });
    
    // 测试无效用户ID
    expect(validateUserId('')).toEqual({ valid: false, message: '用户ID不能为空' });
    expect(validateUserId('ab')).toEqual({ valid: false, message: '用户ID长度至少为3个字符' });
  });
});