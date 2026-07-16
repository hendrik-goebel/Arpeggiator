<template>
  <div class="steps-grid">
    <div class="row header">
      <div class="note-col header-cell"></div>
    <div v-for="i in stepCountArray" :key="i-1" class="step-col header-cell" :class="{playing: props.playStep === (i-1)}">{{ i }}</div>
    </div>

    <div v-for="(note, noteIndex) in notes" :key="note" class="row">
      <div class="note-col" @click="$emit('toggle-note', note)">{{ noteName(note) }}</div>
      <div v-for="stepIndex in stepCountArray" :key="stepIndex-1" class="step-col"
           :class="{active: steps && steps[stepIndex-1] === note, playing: props.playStep === (stepIndex-1)}"
           @click="$emit('toggle-step', { step: stepIndex-1, note })"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { STEP_COUNT, NOTE_NAMES, OCTAVE_OFFSET, DEFAULT_BASE } from '../config'

const props = defineProps<{ notes: number[], steps: number[] | undefined, base?: number, playStep?: number, stepCount?: number }>()

const base = props.base ?? DEFAULT_BASE

const stepCountArray = computed(() => {
  const cnt = (props.stepCount && props.stepCount > 0) ? props.stepCount : STEP_COUNT
  return Array.from({ length: cnt }, (_, i) => i + 1)
})

function noteName(n:number){
  const octave = Math.floor(n / 12) + OCTAVE_OFFSET
  return `${NOTE_NAMES[n % 12]}${octave}`
}
</script>

<style scoped>
.steps-grid { display: inline-block; min-width: 100%; border: 1px solid #2b3a45; padding: 7px; border-radius: 6px; background: #0c141a; }
.row { display: flex; align-items: center }
.note-col { width: 72px; padding: 8px; border-right: 1px solid #2b3a45; color: #a9bac4; cursor: pointer; font: 700 .68rem ui-monospace, monospace; }
.header-cell { color: #62737e; font-size: .65rem; font-weight: 700; }
.step-col { width: 34px; height: 30px; margin: 4px; border: 1px solid #2a3a45; border-radius: 3px; background: #142028; cursor: pointer; transition: background .12s, box-shadow .12s; }
.step-col:hover { border-color: #63e6cf; }
.step-col.active { border-color: #57cdb9; background: linear-gradient(145deg, #52cdb8, #287f77); box-shadow: inset 0 1px rgba(255,255,255,.3), 0 0 8px rgba(99,230,207,.18); }
.step-col.playing { box-shadow: 0 0 0 2px #ffbc6d; border-color: #ffbc6d; }
.header-cell.playing { color: #ffbc6d; }
</style>