<template>
  <div class="steps-grid">
    <div class="row header">
      <div class="note-col header-cell"></div>
    <div v-for="i in STEP_COUNT" :key="i-1" class="step-col header-cell" :class="{playing: props.playStep === i-1}">{{ i }}</div>
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

const props = defineProps<{ notes: number[], steps: number[] | undefined, base?: number, playStep?: number }>()

const base = props.base ?? DEFAULT_BASE

const stepCountArray = computed(() => Array.from({ length: STEP_COUNT }, (_, i) => i + 1))

function noteName(n:number){
  const octave = Math.floor(n / 12) + OCTAVE_OFFSET
  return `${NOTE_NAMES[n % 12]}${octave}`
}
</script>

<style scoped>
.steps-grid { display: inline-block; border: 1px solid #ddd; padding: 6px; border-radius: 6px }
.row { display: flex; align-items: center }
.note-col { width: 96px; padding: 8px; border-right: 1px solid #eee; cursor: pointer; font-weight:600 }
.header-cell { background: #f7f7f7; font-weight:700 }
.step-col { width: 36px; height: 36px; margin: 6px; background: #fff; border:1px solid #ccc; border-radius:4px; cursor:pointer }
.step-col.active { background: #4caf50; border-color: #388e3c }
.step-col.playing { box-shadow: 0 0 0 3px rgba(25,118,210,0.08); border-color: #1976d2 }
.header-cell.playing { background: #e3f2fd }
</style>