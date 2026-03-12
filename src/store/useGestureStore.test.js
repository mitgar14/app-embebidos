import { describe, it, expect } from 'vitest'
import { useGestureStore } from './useGestureStore'

describe('useGestureStore', () => {
  it('starts with no active section and silencio gesture', () => {
    const state = useGestureStore.getState()
    expect(state.activeSection).toBe(null)
    expect(state.currentGesture).toBe('silencio')
    expect(state.bleConnected).toBe(false)
  })

  it('sets active section on gesture', () => {
    useGestureStore.getState().setGesture('infinito')
    const state = useGestureStore.getState()
    expect(state.currentGesture).toBe('infinito')
    expect(state.activeSection).not.toBe(null)
  })

  it('clears active section on silencio', () => {
    useGestureStore.getState().setGesture('infinito')
    useGestureStore.getState().setGesture('silencio')
    expect(useGestureStore.getState().activeSection).toBe(null)
  })

  it('tracks BLE connection state', () => {
    useGestureStore.getState().setBleConnected(true)
    expect(useGestureStore.getState().bleConnected).toBe(true)
  })
})
