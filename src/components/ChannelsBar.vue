<template>
  <div class="channels">
    <button class="sync-toggle" @click="$emit('toggle-sync')" :class="{active: props.syncActive}">Sync channel clocks</button>
    <div v-for="(ch, i) in channels" :key="ch.id" class="channel" :class="{selected: i === currentIndex}">
      <button @click="$emit('select', i)" class="ch-select" :style="{ background: ch.active ? ch.color : '' }">{{ ch.name }}</button>
      <button @click.stop="$emit('toggle', i)" :class="{playing: ch.playing}">{{ ch.playing ? 'Stop' : 'Start' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ channels: any[], currentIndex: number, syncActive?: boolean }>()
</script>

<style scoped>
.channels { display:flex; gap:0.5rem; margin-bottom:1rem; align-items:center }
.channel { display:flex; gap:0.25rem }
.ch-select { min-width:56px }
.channel.selected .ch-select { font-weight:700 }
.channel button.playing { background: #8ef08e }
.sync-toggle { padding:0.25rem 0.5rem; border:1px solid #ccc; border-radius:4px }
.sync-toggle.active { background:#8ef08e }
</style>
