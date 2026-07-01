<template>
  <div class="keyboard">
    <div v-for="i in 12" :key="i-1" class="key" :class="{'active': activeNotes.includes( base + i - 1)}" @click="toggle(base + i - 1)">
      <div class="label">{{ noteName(base + i - 1) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DEFAULT_BASE, NOTE_NAMES, OCTAVE_OFFSET, KEYBOARD_OCTAVE_SIZE } from '../config'
const props = defineProps<{ notes: number[], base?: number }>()
const emit = defineEmits<{
  (e: 'toggle', note: number): void
}>()

const base = props.base ?? DEFAULT_BASE
const activeNotes = computed(() => props.notes ?? [])
function toggle(n:number){ emit('toggle', n) }

function noteName(n:number){
  const octave = Math.floor(n/12) + OCTAVE_OFFSET
  return `${NOTE_NAMES[n % 12]}${octave}`
}
</script>

<style scoped>
.keyboard { display:flex; gap:6px; flex-wrap:wrap }
.key { width:64px; height:64px; background:#fff; border:1px solid #ccc; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:4px }
.key.active { background: #ffd54f }
.label { font-weight:600 }
</style>
