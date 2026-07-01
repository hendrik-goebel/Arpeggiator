<template>
  <div class="step-editor">
    <h3>Arpeggio Steps</h3>
    <div class="steps">
      <button v-for="(s,i) in steps" :key="i" @click="$emit('cycle', i)" :class="{'active': s >= 0}">{{ label(s) }}</button>
    </div>
    <small>Click a step to cycle Off → note choices.</small>
  </div>
</template>

<script setup lang="ts">
import { NOTE_NAMES, OCTAVE_OFFSET } from '../config'
const props = defineProps<{ steps: number[], notes: number[] }>()
function label(s:number){
  if (s == null || s < 0) return '—'
  const n = props.notes[s]
  if (n == null) return '—'
  const octave = Math.floor(n/12) + OCTAVE_OFFSET
  return `${NOTE_NAMES[n % 12]}${octave}`
}
</script>

<style scoped>
.step-editor { margin-top: 1rem }
.steps { display:flex; gap:0.5rem; flex-wrap:wrap }
.steps button { min-width:44px; padding:0.4rem }
.steps button.active { background:#ffd54f }
</style>
