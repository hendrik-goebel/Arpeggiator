<template>
  <div class="container">
    <h1>Web Arpeggiator (Vue 3 + TS)</h1>

    <ChannelsBar :channels="channels" :currentIndex="currentIndex" @select="selectChannel" @toggle="toggleChannelPlay" />

    <ArpeggiatorPanel :channel="currentChannel" :outputs="outputs" :selectedOutputId="selectedOutputId" :log="log"
      @toggle-note="toggleNote" @cycle-step="cycleStep" @toggle-play="togglePlay" @enable-midi="enableMidi"
      @select-output="(id)=>{ selectedOutputId = id }" @update-bpm="updateBpm" @update-pattern="updatePattern" @update-noteLength="updateNoteLength" />
  </div>
</template>

<script setup lang="ts">
import ChannelsBar from './components/ChannelsBar.vue'
import ArpeggiatorPanel from './components/ArpeggiatorPanel.vue'
import { useChannels } from './useChannels'

const {
  channels,
  currentIndex,
  currentChannel,
  selectChannel,
  toggleChannelPlay,
  togglePlay,
  toggleNote,
  cycleStep,
  outputs,
  selectedOutputId,
  enableMidi,
  log,
  updateBpm,
  updatePattern,
  updateNoteLength
} = useChannels()
</script>

<style scoped>
.container { padding: 1rem; font-family: system-ui, sans-serif }
</style>
