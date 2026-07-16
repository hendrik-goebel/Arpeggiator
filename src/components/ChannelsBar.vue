<template>
  <div class="channels">
    <button class="sync-toggle" @click="$emit('toggle-sync')" :class="{active: syncActive}">Sync channel clocks</button>
    <div v-for="(ch, i) in channels" :key="ch.id" class="channel" :class="{selected: i === currentIndex}">
      <button @click="$emit('select', i)" class="ch-select" :style="{ background: ch.active ? ch.color : '' }">
        {{ ch.name }}
      </button>
      <button @click.stop="$emit('toggle', i)" :class="{playing: ch.playing}">{{
          ch.playing ? 'Stop' : 'Start'
        }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ channels: any[], currentIndex: number, syncActive?: boolean }>()
</script>

<style scoped>
.channels {
  display: flex;
  gap: .6rem;
  align-items: center;
  flex-wrap: wrap;
}

.channel {
  display: flex;
  gap: .25rem;
  border: 1px solid #30424d;
  border-radius: 5px;
  overflow: hidden;
}

.ch-select, .channel button, .sync-toggle { border: 0; padding: .6rem .7rem; background: #111b22; color: #91a3ae; font-size: .63rem; font-weight: 800; letter-spacing: .06em; cursor: pointer; }
.ch-select { min-width: 70px; }
.channel button:not(.ch-select) { border-left: 1px solid #30424d; }

.channel.selected .ch-select {
  color: #061010 !important;
  font-weight: 800;
}

.channel button.playing {
  background: #1d544d;
  color: #dffff9;
}

.sync-toggle {
  border: 1px solid #30424d;
  border-radius: 5px;
}

.sync-toggle.active {
  border-color: #63e6cf;
  color: #63e6cf;
}
</style>
