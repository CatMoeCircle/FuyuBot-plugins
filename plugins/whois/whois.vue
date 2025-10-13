<template>
  <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: #f3f4f6;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
          Roboto, 'Helvetica Neue', Arial;
      ">
    <div style="
          max-width: 768px;
          width: 100%;
          box-sizing: border-box;
          padding: 24px;
          background: #ffffff;
          border-radius: 16px;
          /* Satori: 避免复杂阴影 */
          border: 1px solid #f3f4f6;
          display: flex;  /* 添加以兼容 Satori */
          flex-direction: column;
        ">
      <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
          ">
        <div style="display: flex; align-items: center; gap: 16px">
          <div style="
                width: 64px;
                height: 64px;
                border-radius: 16px;
                /* Satori: 避免渐变，使用纯色 */
                background: #6366f1;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
              ">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div style="display: flex; flex-direction: column;"> <!-- 添加 display 和 flex-direction -->
            <a :href="'https://' + domain" style="
                  font-size: 24px;
                  font-weight: 800;
                  color: #1f2937;
                  text-decoration: none;
                ">{{ domain }}</a>
            <div style="display: flex"> <!-- 为兼容 Satori 添加 display -->
              <span v-if="is_expire === 0" style="
                    display: flex;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 8px;
                    background: #dcfce7;
                    color: #166534;
                  ">{{ is_available === 0 ? '已注册' : '未注册' }}</span>
              <span v-else style="
                    display: flex;
                    padding: 4px 10px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 8px;
                    background: #fee2e2;
                    color: #991b1b;
                  ">{{ is_expire === 1 ? '已过期' : '未过期' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-show="is_available === 0" style="display: flex; flex-direction: column; gap: 16px">
        <!-- 域名信息 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
              ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <h3 style="
                  margin: 0;
                  font-size: 16px;
                  font-weight: 700;
                  color: #1f2937;
                ">
              域名信息
            </h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">注册商:</span>
              <span style="font-weight: 600; color: #1f2937">{{ registrar_name }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">注册日期:</span>
              <span style="font-weight: 600; color: #1f2937">{{ creation_time }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">到期日期:</span>
              <span style="font-weight: 600; color: #c2410c">{{ expiration_time }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">注册天数:</span>
              <span :title="Math.floor(creation_days / 365) + '年'" style="font-weight: 600; color: #1f2937">{{
                creation_days }}天</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">距离到期:</span>
              <span :title="'剩余' + valid_days + '天'" style="font-weight: 600; color: #1f2937">{{ valid_days }}天</span>
            </div>
          </div>
        </div>

        <!-- 服务器信息 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
              ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
              <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
              <line x1="6" x2="6.01" y1="6" y2="6" />
              <line x1="6" x2="6.01" y1="18" y2="18" />
            </svg>
            <h3 style="
                  margin: 0;
                  font-size: 16px;
                  font-weight: 700;
                  color: #1f2937;
                ">
              服务器信息
            </h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">域名:</span>
              <span style="font-weight: 600; color: #1f2937">{{ domain }}</span>
            </div>
            <div style="display: flex; justify-content: space-between"> <!-- 新增：服务器IP -->
              <span style="color: #6b7280">服务器IP:</span>
              <span style="font-weight: 600; color: #1f2937">{{ ip || 'N/A' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between"> <!-- 新增：IP归属地 -->
              <span style="color: #6b7280">IP归属地:</span>
              <span style="font-weight: 600; color: #1f2937">{{ (country || '') + (city ? ' ' + city : '') || 'N/A'
              }}</span>
            </div>
            <div style="display: flex; justify-content: space-between"> <!-- 新增：网络运营商 -->
              <span style="color: #6b7280">网络运营商:</span>
              <span style="font-weight: 600; color: #1f2937">{{ isp || 'N/A' }}</span>
            </div>
            <!-- 移除IP相关字段，因为API中没有 -->
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">查询时间:</span>
              <span style="font-weight: 600; color: #1f2937">{{ query_time }}</span>
            </div>
          </div>
        </div>

        <!-- 其它信息 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
              ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h3 style="
                  margin: 0;
                  font-size: 16px;
                  font-weight: 700;
                  color: #1f2937;
                ">
              其它信息
            </h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">Whois服务器:</span>
              <span style="font-weight: 600; color: #1f2937">{{ whois_server }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">域名后缀:</span>
              <span style="font-weight: 600; color: #1f2937">{{ domain_suffix }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分组二 -->
      <div style="
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
          ">
        <!-- 注册人信息 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
              ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3 style="
                  margin: 0;
                  font-size: 16px;
                  font-weight: 700;
                  color: #1f2937;
                ">
              注册人信息
            </h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">注册人:</span>
              <span style="font-weight: 600; color: #1f2937">{{ registrant_name || '未公开' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between">
              <span style="color: #6b7280">注册邮箱:</span>
              <span style="font-weight: 600; color: #1f2937">{{ registrant_email || '未公开' }}</span>
            </div>
          </div>
        </div>

        <!-- 域名状态 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <h3 style="
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 700;
                color: #1f2937;
              ">
            域名状态
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div v-for="status in domain_status" style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 10px;
                  background: #ffffff;
                  border-radius: 8px;
                ">
              <span style="
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco,
                      Consolas, 'Liberation Mono', 'Courier New', monospace;
                    font-size: 12px;
                    color: #1f2937;
                  ">{{ status }}</span>
            </div>
          </div>
        </div>

        <!-- DNS服务器 -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
          <!-- 添加 display 和 flex-direction -->
          <h3 style="
                margin: 0 0 12px 0;
                font-size: 16px;
                font-weight: 700;
                color: #1f2937;
              ">
            DNS服务器
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px">

            <div v-for="dns in name_server" :key="dns" style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 10px;
                  background: #ffffff;
                  border-radius: 8px;
                ">
              <span style="
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco,
                      Consolas, 'Liberation Mono', 'Courier New', monospace;
                    font-size: 12px;
                    color: #1f2937;
                  ">{{ dns }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  is_available: number
  domain: string
  domain_suffix: string
  query_time: string
  registrant_name: string
  registrant_email: string
  registrar_name: string
  creation_time: string
  expiration_time: string
  creation_days: number
  valid_days: number
  is_expire: number
  domain_status: string[]
  name_server: string[]
  whois_server: string
  raw: string
  ip?: string
  country?: string
  city?: string
  area?: string
  isp?: string
}>()

</script>