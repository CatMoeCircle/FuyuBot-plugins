<template>
    <div class="flex relative w-350 h-200 overflow-hidden"
        style="background: linear-gradient(132.5deg, rgba(255, 255, 255, 1) 0%, rgba(206, 237, 219, 1) 100%);">

        <img src="https://img.js.design/assets/img/68f3403b3f22157da640de5d.png#64579f44beb316f0170ddb751b8110d8"
            alt="img" class="flex absolute  w-full h-full" />
        <div class="absolute flex h-full w-full"
            style="background: linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.09) 70%);">
        </div>
        <div class="flex absolute items-center justify-center w-full h-full">
            <div class="flex flex-col justify-center items-start">
                <!-- 用户信息 -->
                <div class="flex flex-row  items-center ">
                    <div class="flex w-45 h-45 shrink-0">
                        <img :src="bot.photo ? bot.photo : 'https://i.pximg.net/img-original/img/2025/03/31/18/46/28/128807177_p7.gif'"
                            alt="img" class="flex rounded-full w-full h-full"
                            style="border: 5px solid rgba( 255, 255, 255, 1);">
                    </div>
                    <div class="flex flex-col justify-center p-5">
                        <p class="font-bold text-4xl m-0 p-0">{{ bot.name }}</p>
                        <p class="text-gray-500 text-2xl m-0 p-0">@{{ bot.username }}</p>
                        <p class="text-gray-500 text-2xl m-0 p-0">ID:{{ bot.id }}</p>
                    </div>
                </div>

                <div class="flex flex-row w-340 h-120  rounded-xl mt-10">
                    <!-- 左侧卡片区域 -->
                    <div class="flex flex-col flex-1 p-4">
                        <!-- Admin信息卡片 -->
                        <div class="flex flex-col mt-2">
                            <p class="text-lg font-semibold m-0 p-0">admin</p>
                            <div class="flex flex-col bg-white/70 rounded-xl p-2 mt-1 "
                                style="border: 1px solid rgba(0, 0, 0, 0.1);">
                                <div class="flex flex-row  items-center">
                                    <div class="flex w-25 h-25 shrink-0">
                                        <img :src="admin.photo ? admin.photo : 'https://img.js.design/assets/img/6901ff9acbf9ed22716834b3.png'"
                                            alt="img" class="flex rounded-full w-full h-full"
                                            style="border: 5px solid rgba( 255, 255, 255, 1);">
                                    </div>
                                    <div class="flex flex-col p-5">
                                        <p class="text-2xl font-semibold m-0 p-0">{{ admin.name }}</p>
                                        <p class="text-lg text-gray-600 m-0 p-0">@{{ admin.username }}</p>
                                        <p class="text-lg text-gray-600 m-0 p-0">ID:{{ admin.id }}</p>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-600 mt-1 m-0 p-0">留言：如果遇到bug前往 @{{ admin.username }} 反馈</p>
                            </div>
                        </div>

                        <!-- TDLib信息 -->
                        <div class="flex flex-col mt-2">
                            <p class="text-lg font-semibold m-0 p-0">TDLib</p>
                            <div class="flex flex-col bg-white/70 rounded-xl p-2 mt-1"
                                style="border: 1px solid rgba(0, 0, 0, 0.1);">
                                <p class="text-lg m-0 p-0">version:{{ tblib.version }}</p>
                                <p class="text-lg text-gray-600 m-0 p-0">commit hash:{{ tblib.commitHash }}</p>
                            </div>
                        </div>

                        <!-- CPU使用率 -->
                        <div class="flex flex-col mt-2">
                            <p class="text-lg font-semibold m-0 p-0">使用情况</p>
                            <div class="flex flex-col bg-white/70 rounded-xl p-2 mt-1"
                                style="border: 1px solid rgba(0, 0, 0, 0.1);">
                                <!-- 遍历 system.system -->
                                <div v-for="(value, key) in system.system" :key="key"
                                    class="flex flex-row items-center ">
                                    <p class="text-lg shrink-0 m-0 p-0">{{ key }}</p>
                                    <div
                                        class="flex flex-grow relative h-3 bg-gray-300 rounded-full overflow-hidden mx-2">
                                        <div class="flex absolute h-full bg-blue-500 rounded-full"
                                            :style="'width: ' + (value?.usage ?? 0) + '%'">
                                        </div>
                                    </div>
                                    <p class="text-lg shrink-0 m-0 p-0">{{ value?.usage ?? 0 }}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧卡片区域 -->
                    <div class="flex flex-col flex-1 p-4 border-l border-white/30">
                        <!-- 磁盘空间 -->
                        <div class="flex flex-col">
                            <p class="text-lg font-semibold">磁盘空间</p>
                            <div class="flex flex-col bg-white/70 rounded-xl p-2 mt-1"
                                style="border: 1px solid rgba(0, 0, 0, 0.1);">
                                <!-- 遍历 system.source -->
                                <div v-for="(value, key) in system.source" :key="key"
                                    class="flex flex-row items-center ">
                                    <p class="text-lg shrink-0 m-0 p-0">磁盘{{ key }}</p>
                                    <div
                                        class="flex flex-grow relative h-3 bg-gray-300 rounded-full overflow-hidden mx-2">
                                        <div class="flex absolute h-full bg-blue-500 rounded-full m-0 p-0"
                                            :style="'width: ' + (value?.usagePercent ?? 0) + '%'">
                                        </div>
                                    </div>
                                    <p class="text-lg shrink-0 m-0 p-0"> {{ value.used }}/{{ value.total }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- 已加载插件 -->
                        <div class="flex flex-col mt-3 flex-grow">
                            <p class="text-lg font-semibold">已加载插件</p>
                            <div class="flex flex-col bg-white/70 rounded-xl p-2 mt-1 w-full justify-start"
                                style="border: 1px solid rgba(0, 0, 0, 0.1); gap: 1rem;">
                                <div class="flex flex-col w-full">

                                    <div class="flex flex-row flex-wrap w-full items-center" style="gap: 5px;">
                                        <div v-for="(manager, key) in plugins" :key="key"
                                            class="flex items-center bg-white/80 rounded px-2 py-1"
                                            style="border: 1px solid rgba(0, 0, 0, 0.1)">
                                            <p class="m-0 p-0 text-sm" v-html="manager.name"></p>
                                            <p class="m-0 p-0 text-blue-500 text-sm ml-2" v-html="manager.version"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    bot: {
        name: string
        username: string,
        id: number,
        photo?: string,
    },
    admin: {
        name: string,
        username: string,
        id: number,
        photo?: string,
    },
    tblib: {
        version: string,
        commitHash: string,
    },
    system: {
        system: {
            [key: string]: {
                usage: number,
            },
        },
        source: {
            [key: string]: {
                used: string,
                total: string,
                usagePercent: number,
            },
        },
    },

    plugins: {
        [key: string]: {
            version: string,
            name: string,
        },
    },
}>()

</script>
