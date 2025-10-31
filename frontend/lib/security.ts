// 安全防护措施配置
import { NextRequest, NextResponse } from 'next/server';

// 内容安全策略
export const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

// 安全头设置中间件
export function setSecurityHeaders(response: NextResponse) {
  // 内容安全策略
  response.headers.set('Content-Security-Policy', CSP_HEADER);
  
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS防护
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 内容类型嗅探保护
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // 严格传输安全（仅在生产环境中使用）
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 权限策略
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return response;
}

// XSS防护函数
export function sanitizeInput(input: string): string {
  // 移除潜在的恶意字符
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 验证和清理用户输入
export function validateAndSanitizeInput(input: string, maxLength: number = 1000): { valid: boolean; sanitized: string } {
  // 检查输入长度
  if (input.length > maxLength) {
    return { valid: false, sanitized: '' };
  }
  
  // 清理输入
  const sanitized = sanitizeInput(input);
  
  // 检查是否包含恶意模式
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, sanitized: '' };
    }
  }
  
  return { valid: true, sanitized };
}

export default {
  CSP_HEADER,
  setSecurityHeaders,
  sanitizeInput,
  validateAndSanitizeInput
};