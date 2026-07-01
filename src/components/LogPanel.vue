<template>
  <div class="log">
    <h3>Log</h3>
    <pre>{{ lines.join('\n') }}</pre>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ lines: string[] }>()
</script>

<style scoped>
.log { margin-top: 1rem; max-height: 200px; overflow: auto; background: #f7f7f7; padding: 0.5rem }
</style>
