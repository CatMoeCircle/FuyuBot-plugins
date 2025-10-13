<template>
  <div
    style="
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    "
  >
    <div
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        max-width: 600px;
      "
    >
      <p
        style="
          font-size: 26px;
          line-height: 1.6;
          margin-bottom: 30px;
          font-weight: 400;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        "
      >
        「{{ hitokoto }}」
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hitokoto: string
}>()
</script>
