import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioManager } from './AudioManager'

// Mock Web Audio API
const mockAudioContext = {
  state: 'suspended',
  resume: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    gain: { value: 1, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  destination: {},
}

globalThis.AudioContext = vi.fn(() => mockAudioContext)

describe('AudioManager', () => {
  let manager

  beforeEach(() => {
    manager = new AudioManager()
  })

  it('initializes with 0 stems', () => {
    expect(manager.stems).toHaveLength(0)
  })

  it('highlights a section by setting gain values', () => {
    manager.ctx = mockAudioContext
    manager.gains = {
      violines: mockAudioContext.createGain(),
      cuerdas: mockAudioContext.createGain(),
      madera: mockAudioContext.createGain(),
      metal: mockAudioContext.createGain(),
      tutti: mockAudioContext.createGain(),
    }
    manager.highlightSection('violines')
    expect(manager.gains.violines.gain.setTargetAtTime).toHaveBeenCalled()
  })
})
