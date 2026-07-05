<template>
  <div class="channels">
    <div v-for="(ch, i) in channels" :key="ch.id" class="channel" :class="{selected: i === currentIndex}">
      <button @click="$emit('select', i)" class="ch-select" :style="{ background: ch.active ? ch.color : '' }">{{ ch.name }}</button>
      <button @click.stop="$emit('toggle', i)" :class="{playing: ch.playing}">{{ ch.playing ? 'Stop' : 'Start' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ channels: any[], currentIndex: number }>()
</script>

<style scoped>
.channels { display:flex; gap:0.5rem; margin-bottom:1rem }
.channel { display:flex; gap:0.25rem }
.ch-select { min-width:56px }
.channel.selected .ch-select { font-weight:700 }
.channel button.playing { background: #8ef08e }
</style>
