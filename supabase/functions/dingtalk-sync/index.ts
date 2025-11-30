import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  sync_type: 'manual' | 'auto' | 'incremental';
  selected_departments?: string[];
  conflict_strategy?: 'dingtalk_first' | 'local_first' | 'manual';
}

interface DingTalkAccessTokenResponse {
  errcode: number;
  errmsg: string;
  access_token?: string;
  expires_in?: number;
}

interface DingTalkDepartmentResponse {
  errcode: number;
  errmsg: string;
  result?: Array<{
    dept_id: number;
    name: string;
    parent_id: number;
    order: number;
  }>;
}

interface DingTalkUserListResponse {
  errcode: number;
  errmsg: string;
  result?: {
    list: Array<{
      userid: string;
      name: string;
      mobile?: string;
      avatar?: string;
      unionid?: string;
      dept_id_list: number[];
      email?: string;
      job_number?: string;
    }>;
    has_more: boolean;
    next_cursor?: number;
  };
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 验证用户身份
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("未提供认证信息");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("认证失败");
    }

    // 验证用户是否为超级管理员
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "super_admin") {
      throw new Error("权限不足：仅超级管理员可以执行同步操作");
    }

    const requestData: SyncRequest = await req.json();
    const { sync_type, selected_departments, conflict_strategy } = requestData;

    console.log("开始钉钉同步:", { sync_type, selected_departments, conflict_strategy });

    // 获取钉钉配置
    const { data: config, error: configError } = await supabase
      .from("dingtalk_sync_config")
      .select("*")
      .single();

    if (configError || !config) {
      throw new Error("未找到钉钉配置，请先配置钉钉应用信息");
    }

    if (!config.sync_enabled) {
      throw new Error("钉钉同步功能未启用");
    }

    // 创建同步日志
    const { data: syncLog, error: logError } = await supabase
      .from("dingtalk_sync_logs")
      .insert({
        sync_type,
        status: "running",
        created_by: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error("创建同步日志失败");
    }

    try {
      // 1. 获取钉钉 access_token
      console.log("获取钉钉 access_token...");
      const tokenResponse = await fetch(
        `https://oapi.dingtalk.com/gettoken?appkey=${config.app_key}&appsecret=${config.app_secret}`
      );
      const tokenData: DingTalkAccessTokenResponse = await tokenResponse.json();

      if (tokenData.errcode !== 0 || !tokenData.access_token) {
        throw new Error(`获取钉钉 access_token 失败: ${tokenData.errmsg}`);
      }

      const accessToken = tokenData.access_token;
      console.log("获取 access_token 成功");

      // 2. 获取部门列表
      console.log("获取钉钉部门列表...");
      const deptResponse = await fetch(
        `https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dept_id: 1 }), // 从根部门开始
        }
      );
      const deptData: DingTalkDepartmentResponse = await deptResponse.json();

      if (deptData.errcode !== 0 || !deptData.result) {
        throw new Error(`获取部门列表失败: ${deptData.errmsg}`);
      }

      console.log(`获取到 ${deptData.result.length} 个部门`);

      // 3. 同步部门信息到部门映射表
      for (const dept of deptData.result) {
        await supabase
          .from("dingtalk_department_mapping")
          .upsert({
            dingtalk_dept_id: dept.dept_id.toString(),
            dingtalk_dept_name: dept.name,
            parent_id: dept.parent_id.toString(),
            order_num: dept.order,
            enabled: true,
          }, {
            onConflict: 'dingtalk_dept_id'
          });
      }

      // 4. 获取需要同步的部门列表
      const deptIdsToSync = selected_departments && selected_departments.length > 0
        ? selected_departments
        : deptData.result.map(d => d.dept_id.toString());

      console.log(`准备同步 ${deptIdsToSync.length} 个部门的用户`);

      // 5. 同步用户信息
      let totalUsers = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const failedDetails: Array<{ userid: string; name: string; error: string }> = [];

      for (const deptId of deptIdsToSync) {
        console.log(`同步部门 ${deptId} 的用户...`);
        
        let cursor = 0;
        let hasMore = true;

        while (hasMore) {
          const userResponse = await fetch(
            `https://oapi.dingtalk.com/topapi/v2/user/list?access_token=${accessToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dept_id: parseInt(deptId),
                cursor,
                size: 100,
              }),
            }
          );

          const userData: DingTalkUserListResponse = await userResponse.json();

          if (userData.errcode !== 0 || !userData.result) {
            console.error(`获取部门 ${deptId} 用户失败:`, userData.errmsg);
            break;
          }

          const users = userData.result.list;
          totalUsers += users.length;

          for (const user of users) {
            try {
              // 检查用户是否已存在
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id, username, full_name, department")
                .eq("username", user.userid)
                .maybeSingle();

              const strategy = conflict_strategy || config.conflict_strategy;

              if (existingProfile) {
                // 用户已存在，根据冲突策略处理
                if (strategy === "dingtalk_first") {
                  // 以钉钉数据为准，更新本地数据
                  await supabase
                    .from("profiles")
                    .update({
                      full_name: user.name,
                      department: deptData.result?.find(d => d.dept_id === user.dept_id_list[0])?.name,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingProfile.id);
                  
                  successCount++;
                } else if (strategy === "local_first") {
                  // 保留本地数据，跳过更新
                  skippedCount++;
                } else {
                  // manual 策略：记录冲突，需要手动处理
                  skippedCount++;
                }
              } else {
                // 用户不存在，创建新用户
                // 注意：这里需要先在 auth.users 中创建用户
                const email = user.email || `${user.userid}@miaoda.com`;
                const password = user.mobile || "123456"; // 默认密码

                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                  email,
                  password,
                  email_confirm: true,
                  user_metadata: {
                    username: user.userid,
                    full_name: user.name,
                  },
                });

                if (authError) {
                  console.error(`创建用户 ${user.name} 失败:`, authError);
                  failedCount++;
                  failedDetails.push({
                    userid: user.userid,
                    name: user.name,
                    error: authError.message,
                  });
                  continue;
                }

                // 创建 profile
                await supabase
                  .from("profiles")
                  .insert({
                    id: authUser.user.id,
                    username: user.userid,
                    email,
                    full_name: user.name,
                    role: "sales", // 默认角色
                    department: deptData.result?.find(d => d.dept_id === user.dept_id_list[0])?.name,
                    status: "active",
                  });

                successCount++;
              }
            } catch (error: any) {
              console.error(`处理用户 ${user.name} 失败:`, error);
              failedCount++;
              failedDetails.push({
                userid: user.userid,
                name: user.name,
                error: error.message,
              });
            }
          }

          hasMore = userData.result.has_more;
          cursor = userData.result.next_cursor || 0;
        }
      }

      // 6. 更新同步日志
      const status = failedCount === 0 ? "success" : (successCount > 0 ? "partial" : "failed");
      
      await supabase
        .from("dingtalk_sync_logs")
        .update({
          status,
          total_users: totalUsers,
          success_count: successCount,
          failed_count: failedCount,
          skipped_count: skippedCount,
          details: {
            departments_synced: deptIdsToSync.length,
            failed_details: failedDetails,
          },
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);

      // 7. 更新配置的最后同步时间
      await supabase
        .from("dingtalk_sync_config")
        .update({
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      console.log("同步完成:", { totalUsers, successCount, failedCount, skippedCount });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sync_log_id: syncLog.id,
            status,
            total_users: totalUsers,
            success_count: successCount,
            failed_count: failedCount,
            skipped_count: skippedCount,
            failed_details: failedDetails,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (syncError: any) {
      console.error("同步过程出错:", syncError);

      // 更新同步日志为失败状态
      await supabase
        .from("dingtalk_sync_logs")
        .update({
          status: "failed",
          error_message: syncError.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);

      throw syncError;
    }
  } catch (error: any) {
    console.error("Edge Function 错误:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "同步失败",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
