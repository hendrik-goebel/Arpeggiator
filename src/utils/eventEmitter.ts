export type EventHandler<Payload> = (payload: Payload) => void

export function createEventEmitter<Events extends Record<string, any>>() {
  const listeners = new Map<keyof Events, Set<EventHandler<any>>>()

  function on<EventName extends keyof Events>(
    eventName: EventName,
    handler: EventHandler<Events[EventName]>
  ) {
    const existingListeners = listeners.get(eventName)
    if (existingListeners) {
      existingListeners.add(handler)
    } else {
      listeners.set(eventName, new Set([handler]))
    }

    return () => off(eventName, handler)
  }

  function off<EventName extends keyof Events>(
    eventName: EventName,
    handler: EventHandler<Events[EventName]>
  ) {
    const existingListeners = listeners.get(eventName)
    if (!existingListeners) return
    existingListeners.delete(handler)
    if (!existingListeners.size) listeners.delete(eventName)
  }

  function emit<EventName extends keyof Events>(
    eventName: EventName,
    payload: Events[EventName]
  ) {
    const existingListeners = listeners.get(eventName)
    if (!existingListeners) return
    existingListeners.forEach((handler) => handler(payload))
  }

  return { on, off, emit }
}
