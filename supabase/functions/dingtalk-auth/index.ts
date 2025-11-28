import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * 钉钉免登认证 Edge Function
 * 
 * 功能：
 * 1. 使用 authCode 换取钉钉 userid
 * 2. 获取用户详细信息
 * 3. 查找或创建系统用户
 * 4. 返回登录凭证
 */

const DINGTALK_API_BASE = 'https://oapi.dingtalk.com';

interface AuthCodeResponse {
  errcode: number;
  errmsg: string;
  userid?: string;
}

interface UserInfoResponse {
  errcode: number;
  errmsg: string;
  userid?: string;
  name?: string;
  mobile?: string;
  avatar?: string;
  unionid?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: '只支持 POST 请求' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 解析请求体
    const { auth_code } = await req.json();

    if (!auth_code) {
      throw new Error('缺少 auth_code 参数');
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 步骤 1: 获取 access_token
    console.log('正在获取 access_token...');
    const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/dingtalk-get-access-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('获取 access_token 失败');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 步骤 2: 使用 authCode 换取 userid
    console.log('正在使用 authCode 换取 userid...');
    const authUrl = `${DINGTALK_API_BASE}/topapi/v2/user/getuserinfo?access_token=${accessToken}`;
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: auth_code }),
    });

    if (!authResponse.ok) {
      throw new Error('换取 userid 失败');
    }

    const authData: AuthCodeResponse = await authResponse.json();

    if (authData.errcode !== 0) {
      throw new Error(`钉钉 API 错误: ${authData.errcode} - ${authData.errmsg}`);
    }

    if (!authData.userid) {
      throw new Error('未获取到 userid');
    }

    const userid = authData.userid;
    console.log(`获取到 userid: ${userid}`);

    // 步骤 3: 获取用户详细信息
    console.log('正在获取用户详细信息...');
    const userInfoUrl = `${DINGTALK_API_BASE}/topapi/v2/user/get?access_token=${accessToken}`;
    const userInfoResponse = await fetch(userInfoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid }),
    });

    if (!userInfoResponse.ok) {
      throw new Error('获取用户信息失败');
    }

    const userInfoData: UserInfoResponse = await userInfoResponse.json();

    if (userInfoData.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${userInfoData.errcode} - ${userInfoData.errmsg}`);
    }

    const userInfo = {
      userid: userInfoData.userid || userid,
      name: userInfoData.name || '钉钉用户',
      mobile: userInfoData.mobile,
      avatar: userInfoData.avatar,
      unionid: userInfoData.unionid,
    };

    console.log('用户信息:', userInfo);

    // 步骤 4: 查找或创建钉钉用户映射
    const { data: existingDTUser } = await supabase
      .from('dingtalk_users')
      .select('*, profile:profiles(*)')
      .eq('dingtalk_userid', userInfo.userid)
      .maybeSingle();

    let profile;

    if (existingDTUser && existingDTUser.profile) {
      // 已存在映射，直接使用
      profile = existingDTUser.profile;
      console.log(`找到已存在的用户映射: ${profile.username}`);

      // 更新最后同步时间
      await supabase
        .from('dingtalk_users')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', existingDTUser.id);

    } else {
      // 不存在映射，创建新用户
      console.log('创建新用户...');

      // 生成用户名（使用钉钉 userid）
      const username = `dt_${userInfo.userid}`;
      
      // 创建 auth 用户（使用模拟邮箱）
      const email = `${username}@dingtalk.miaoda.com`;
      const password = `dt_${Math.random().toString(36).slice(2)}${Date.now()}`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: userInfo.name,
          dingtalk_userid: userInfo.userid,
        },
      });

      if (authError || !authData.user) {
        throw new Error(`创建用户失败: ${authError?.message}`);
      }

      // 更新 profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: userInfo.name,
          dingtalk_userid: userInfo.userid,
          role: 'sales', // 默认角色为销售
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError || !profileData) {
        throw new Error(`更新 profile 失败: ${profileError?.message}`);
      }

      profile = profileData;

      // 创建钉钉用户映射
      await supabase.from('dingtalk_users').insert({
        profile_id: profile.id,
        dingtalk_userid: userInfo.userid,
        dingtalk_unionid: userInfo.unionid,
        name: userInfo.name,
        mobile: userInfo.mobile,
        avatar: userInfo.avatar,
      });

      console.log(`新用户创建成功: ${username}`);
    }

    // 步骤 5: 生成登录 Session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email || `${profile.username}@dingtalk.miaoda.com`,
    });

    if (sessionError || !sessionData) {
      throw new Error(`生成登录凭证失败: ${sessionError?.message}`);
    }

    console.log('钉钉登录成功');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: profile.id,
          username: profile.username,
          full_name: profile.full_name,
          role: profile.role,
          dingtalk_userid: userInfo.userid,
        },
        session: sessionData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('钉钉登录失败:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '钉钉登录失败',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
