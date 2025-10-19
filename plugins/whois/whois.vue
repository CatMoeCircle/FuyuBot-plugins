<template>
  <div class="flex flex-col items-center justify-center w-full h-full bg-white">
    <div class="flex flex-col w-full p-6 bg-white rounded-2xl" style="gap: 1rem;">
      <div class="flex w-full items-center justify-between">
        <div class="flex items-center" style="gap: 1rem;">
          <div class="flex items-center justify-center w-16 h-16 rounded-2xl text-white"
            style="background-image: linear-gradient(to bottom right, #3b82f6, #9333ea);">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div class="flex flex-col">
            <p class="text-2xl font-extrabold text-gray-900 m-0 p-0">{{ domain }}</p>
            <div class="flex flex-col " style="gap: 0.5rem;">
              <span class="flex items-center justify-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800"
                v-if="is_expire === 0">{{ is_available === 0 ? '已注册' : '未注册' }}</span>
              <span v-else class="flex px-2.5 py-1 rounded-full text-xs font-semibold mt-2 bg-red-100 text-red-800">{{
                is_expire === 1 ? '已过期' :
                  '未过期' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex w-full" style="gap: 1rem;">
        <!-- 分组一 -->
        <div v-show="is_available === 0" class="flex flex-col flex-1" style="gap: 1rem; ">
          <!-- 域名信息 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <div class="flex items-center mb-3" style="gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <h3 class="m-0 text-base font-bold text-gray-800">
                域名信息
              </h3>
            </div>
            <div class="flex flex-col" style="gap: 1rem;">
              <div class="flex justify-between">
                <span class="text-gray-500">注册商:</span>
                <span class="font-semibold text-gray-800">{{ registrar_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">注册日期:</span>
                <span class="font-semibold text-gray-800">{{ creation_time }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">到期日期:</span>
                <span class="font-semibold text-orange-600">{{ expiration_time }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">注册天数:</span>
                <span :title="Math.floor(creation_days / 365) + '年'" class="font-semibold text-gray-800">{{
                  creation_days }}天</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">距离到期:</span>
                <span :title="'剩余' + valid_days + '天'" class="font-semibold text-gray-800">{{ valid_days
                }}天</span>
              </div>
            </div>
          </div>

          <!-- 服务器信息 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <div class="flex items-center mb-3" style="gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
                <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
                <line x1="6" x2="6.01" y1="6" y2="6" />
                <line x1="6" x2="6.01" y1="18" y2="18" />
              </svg>
              <h3 class="m-0 text-base font-bold text-gray-800">
                服务器信息
              </h3>
            </div>
            <div class="flex flex-col" style="gap: 0.5rem;">
              <div class="flex justify-between">
                <span class="text-gray-500">域名:</span>
                <span class="font-semibold text-gray-800">{{ domain }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">服务器IP:</span>
                <span class="font-semibold text-gray-800">{{ ip || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">IP归属地:</span>
                <span class="font-semibold text-orange-600">{{ (country || '') + (city ? ' ' + city
                  : '') ||
                  'N/A'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">网络运营商:</span>
                <span class="font-semibold text-gray-800">{{ isp || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">查询时间:</span>
                <span class="font-semibold text-gray-800">{{ query_time }}</span>
              </div>
            </div>
          </div>

          <!-- 其它信息 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <div class="flex items-center mb-3" style="gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <h3 class="m-0 text-base font-bold text-gray-800">
                其它信息
              </h3>
            </div>
            <div class="flex flex-col" style="gap: 0.5rem;">
              <div class="flex justify-between">
                <span class="text-gray-500">Whois服务器:</span>
                <span class="font-semibold text-gray-800">{{ whois_server }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">域名后缀:</span>
                <span class="font-semibold text-gray-800">{{ domain_suffix }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 分组二 -->
        <div class="flex flex-col flex-1" style="gap: 1rem;">
          <!-- 注册人信息 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <div class="flex items-center mb-3" style="gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <h3 class="m-0 text-base font-bold text-gray-800">
                注册人信息
              </h3>
            </div>
            <div class="flex flex-col" style="gap: 0.5rem;">
              <div class="flex justify-between">
                <span class="text-gray-500">注册人:</span>
                <span class="font-semibold text-gray-800">{{ registrant_name || '已开启隐私保护' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">注册邮箱:</span>
                <span class="font-semibold text-gray-800">{{ registrant_email || '已开启隐私保护' }}</span>
              </div>
            </div>
          </div>

          <!-- 域名状态 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <h3 class="m-0 mb-3 text-base font-bold text-gray-800">
              域名状态
            </h3>
            <div class="flex flex-col" style="gap: 1rem;">
              <div v-for="status in domain_status" class="flex items-center justify-between p-2.5 bg-white rounded-lg">
                <span class="font-mono text-xs text-gray-800">{{ status }}</span>
              </div>
            </div>
          </div>

          <!-- DNS服务器 -->
          <div class="bg-gray-50 rounded-xl p-4 flex flex-col">
            <h3 class="m-0 mb-3 text-base font-bold text-gray-800">
              DNS服务器
            </h3>
            <div class="flex flex-col" style="gap: 1rem;">
              <div v-for="dns in name_server" :key="dns"
                class="flex items-center justify-between p-2.5 bg-white rounded-lg">
                <span class="font-mono text-xs text-gray-800">{{ dns }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex w-full items-center justify-center">
        <p class="text-neutral-400 text-xs m-0 p-1">查询api来自 whoiscx.com 的公益接口</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
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