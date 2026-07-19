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
.log { max-height: 130px; margin-top: 1rem; overflow: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--bg-control); color: var(--text-dim); padding: .7rem .9rem; font-size: .7rem; }
.log h3 { margin: 0 0 .5rem; color: var(--teal); font-size: .6rem; letter-spacing: .12em; }
.log pre { margin: 0; font: .68rem/1.5 ui-monospace, monospace; white-space: pre-wrap; }
</style>
