import { onBeforeUnmount, onMounted, type Ref } from 'vue'

interface KeyboardHandlers {
  currentIndex: Ref<number>
  channelCount: number
  selectChannel: (index: number) => void
  toggleMute: (index: number) => void
  toggleMuteAll: () => void
  togglePlay: () => void
  createVariation: (index: number) => void
  createGlobalVariation: () => void
  shiftCurrentChannelNotes: (direction: 1 | -1) => void
  playKeyboardNote: (key: string) => boolean
}

export function useKeyboard(handlers: KeyboardHandlers) {
  function handleKeydown(event: KeyboardEvent) {
    if (event.repeat) return

    const target = event.target
    if (target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName))) {
      return
    }

    const key = event.key.toLowerCase()
    if (event.metaKey && key === 'm') {
      handlers.toggleMuteAll()
      event.preventDefault()
      return
    }
    if (event.metaKey && key === 'v') {
      handlers.createGlobalVariation()
      event.preventDefault()
      return
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (/^[1-8]$/.test(event.key)) {
        handlers.selectChannel(Number(event.key) - 1)
        event.preventDefault()
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1
        handlers.selectChannel((handlers.currentIndex.value + direction + handlers.channelCount) % handlers.channelCount)
        event.preventDefault()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        handlers.shiftCurrentChannelNotes(event.key === 'ArrowUp' ? 1 : -1)
        event.preventDefault()
        return
      }
      if (key === 'm') {
        handlers.toggleMute(handlers.currentIndex.value)
        event.preventDefault()
        return
      }
      if (event.key === ' ') {
        handlers.togglePlay()
        event.preventDefault()
        return
      }
      if (key === 'v') {
        handlers.createVariation(handlers.currentIndex.value)
        event.preventDefault()
        return
      }
    }

    if (!event.getModifierState('CapsLock')) return
    if (handlers.playKeyboardNote(event.key)) event.preventDefault()
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
}
