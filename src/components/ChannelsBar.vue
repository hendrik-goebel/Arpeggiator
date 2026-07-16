<template>
  <div class="channels">
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
const props = defineProps<{ channels: any[], currentIndex: number }>()
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
  flex-direction: column;
  border: 1px solid #30424d;
  border-radius: 5px;
  overflow: hidden;
  transition: border-color .15s, box-shadow .15s, transform .15s;
}

.ch-select, .channel button { border: 0; padding: .6rem .7rem; background: #111b22; color: #91a3ae; font-size: .63rem; font-weight: 800; letter-spacing: .06em; cursor: pointer; }
.ch-select { min-width: 70px; }
.channel button:not(.ch-select) { border-top: 1px solid #30424d; }

.channel.selected .ch-select {
  background: #cfdee5 !important;
  color: #102028 !important;
  font-weight: 800;
}
.channel.selected {
  border-color: #6d9eaa;
  box-shadow: 0 0 10px rgba(99, 230, 207, .2);
}
.channel.selected button:not(.ch-select) { border-top-color: #466773; }

.channel button.playing {
  background: #1d544d;
  color: #dffff9;
}

</style>
