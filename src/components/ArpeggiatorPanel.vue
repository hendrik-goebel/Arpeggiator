<template>
  <div class="arpeggiator-panel">
    <h2>{{ channel.name }} Arpeggiator</h2>
    <div class="controls">
      <label>Tempo (BPM): <input type="number" :value="channel.bpm" @input="$emit('update-bpm', +$event.target.value)" min="20" max="300" /></label>
      <label>Pattern:
        <select :value="channel.pattern" @change="$emit('update-pattern', $event.target.value)">
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="updown">UpDown</option>
          <option value="random">Random</option>
        </select>
      </label>
      <label>Note length (ms): <input type="number" :value="channel.noteLength" @input="$emit('update-noteLength', +$event.target.value)" min="50" max="2000" /></label>
      <button @click="$emit('toggle-play')">{{ channel.playing ? 'Stop' : 'Play' }}</button>
      <button @click="$emit('enable-midi')">Enable MIDI</button>
      <label>Output:
        <select :value="selectedOutputId" @change="$emit('select-output', $event.target.value)">
          <option v-for="o in outputs" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
      </label>
    </div>

    <StepsGrid :notes="channel.notes" :steps="channel.steps" :base="channel.base" :play-step="playStep" @toggle-note="$emit('toggle-note', $event)" @toggle-step="$emit('cycle-step', $event)" />

    <LogPanel :lines="log" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import StepsGrid from './StepsGrid.vue'
import LogPanel from './LogPanel.vue'
const props = defineProps<{ channel: any, outputs: any[], selectedOutputId: string | null, log: string[] }>()
const playStep = ref<number | null>(null)
let pollTimer: any = null

function pollOnce(){
  try {
    const ar = props.channel?.arpeggiator
    if (ar && typeof ar.getState === 'function') {
      const s = ar.getState()
      playStep.value = (s && typeof s.stepIndex === 'number') ? s.stepIndex : null
    } else {
      playStep.value = null
    }
  } catch (e) { playStep.value = null }
}

function startPolling(){ stopPolling(); pollOnce(); pollTimer = setInterval(pollOnce, 40) }
function stopPolling(){ if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }

onMounted(() => startPolling())
onUnmounted(() => stopPolling())
watch(() => props.channel, () => startPolling())
</script>

<style scoped>
.arpeggiator-panel { border-top:1px solid #eee; padding-top:1rem }
.controls { display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap }
</style>
