import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * 钉钉获取 Access Token Edge Function
 * 
 * 功能：获取钉钉企业内部应用的 access_token
 * 缓存策略：缓存 2 小时（钉钉 token 有效期为 2 小时）
 */

const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';

interface AccessTokenResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
}

// 简单的内存缓存
let cachedToken: string | null = null;
let tokenExpireTime: number = 0;

Deno.serve(async (req: Request) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: '只支持 POST 请求' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // 检查缓存
    const now = Date.now();
    if (cachedToken && tokenExpireTime > now) {
      console.log('使用缓存的 access_token');
      return new Response(
        JSON.stringify({
          success: true,
          access_token: cachedToken,
          from_cache: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 从环境变量获取配置
    const appKey = Deno.env.get('DINGTALK_APP_KEY');
    const appSecret = Deno.env.get('DINGTALK_APP_SECRET');

    if (!appKey || !appSecret) {
      throw new Error('未配置钉钉 AppKey 或 AppSecret');
    }

    // 调用钉钉 API 获取 access_token
    const url = `${DINGTALK_API_BASE}/gettoken?appkey=${appKey}&appsecret=${appSecret}`;
    
    console.log('正在获取新的 access_token...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`钉钉 API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data: AccessTokenResponse = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`钉钉 API 返回错误: ${data.errcode} - ${data.errmsg}`);
    }

    if (!data.access_token) {
      throw new Error('未获取到 access_token');
    }

    // 缓存 token（提前 5 分钟过期）
    cachedToken = data.access_token;
    const expiresIn = (data.expires_in || 7200) - 300; // 默认 2 小时，提前 5 分钟
    tokenExpireTime = now + expiresIn * 1000;

    console.log(`access_token 获取成功，将在 ${expiresIn} 秒后过期`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: data.access_token,
        expires_in: expiresIn,
        from_cache: false,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('获取 access_token 失败:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '获取 access_token 失败',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
