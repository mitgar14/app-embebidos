import { SECTIONS, SECTION_KEYS } from '../config/sections'

export class AudioManager {
  constructor() {
    this.ctx = null
    this.gains = {}
    this.analysers = {}
    this.elements = {}
    this.stems = []
  }

  async init(stemPaths) {
    this.ctx = new AudioContext()

    for (const key of SECTION_KEYS) {
      const audio = new Audio()
      audio.src = stemPaths[key]
      audio.loop = true
      audio.crossOrigin = 'anonymous'

      const source = this.ctx.createMediaElementSource(audio)
      const gain = this.ctx.createGain()
      const analyser = this.ctx.createAnalyser()

      gain.gain.value = 0.3 // Start attenuated
      analyser.fftSize = 512

      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(this.ctx.destination)

      this.gains[key] = gain
      this.analysers[key] = analyser
      this.elements[key] = audio
      this.stems.push(key)
    }
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  playAll() {
    const startOffset = 0
    for (const key of SECTION_KEYS) {
      const el = this.elements[key]
      if (el) {
        el.currentTime = startOffset
        el.play().catch(() => {})
      }
    }
  }

  highlightSection(sectionKey) {
    const now = this.ctx?.currentTime ?? 0
    for (const key of SECTION_KEYS) {
      const gain = this.gains[key]
      if (!gain) continue

      if (sectionKey === 'tutti') {
        // Tutti: all at full volume
        gain.gain.setTargetAtTime(1.0, now, 0.15)
      } else if (key === sectionKey) {
        gain.gain.setTargetAtTime(1.0, now, 0.15)
      } else {
        gain.gain.setTargetAtTime(0.15, now, 0.15)
      }
    }
  }

  silence() {
    const now = this.ctx?.currentTime ?? 0
    for (const key of SECTION_KEYS) {
      const gain = this.gains[key]
      if (gain) {
        gain.gain.setTargetAtTime(0.0, now, 0.3)
      }
    }
  }

  getFrequencyData(sectionKey) {
    const analyser = this.analysers[sectionKey]
    if (!analyser) return null
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    return data
  }

  getAmplitude(sectionKey) {
    const data = this.getFrequencyData(sectionKey)
    if (!data) return 0
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    return sum / (data.length * 255)
  }
}
