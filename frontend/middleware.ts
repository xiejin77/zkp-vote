// 中间件：安全头设置
import { setSecurityHeaders } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 继续处理请求
  const response = NextResponse.next();
  
  // 设置安全头
  setSecurityHeaders(response);
  
  return response;
}

// 配置中间件匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下路径：
     * - API路由
     * - 静态文件
     * - 图片
     * - 字体
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};