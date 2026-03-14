import { SECTION_KEYS } from '../config/sections'

const SOLO_KEYS = SECTION_KEYS.filter((k) => k !== 'tutti')

export class AudioManager {
  constructor() {
    this.ctx = null
    this.gains = {}
    this.analysers = {}
    this.elements = {}
    this.stems = []
    this.freqDataBuffers = {}
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

      // Start with only tutti at low volume; individual stems silent
      gain.gain.value = key === 'tutti' ? 0.15 : 0.0
      analyser.fftSize = 512

      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(this.ctx.destination)

      this.gains[key] = gain
      this.analysers[key] = analyser
      this.elements[key] = audio
      this.freqDataBuffers[key] = new Uint8Array(analyser.frequencyBinCount)
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
    const tuttiGain = this.gains.tutti

    if (sectionKey === 'tutti') {
      // Tutti: only the pre-mixed track plays; mute individual stems
      if (tuttiGain) tuttiGain.gain.setTargetAtTime(1.0, now, 0.15)
      for (const key of SOLO_KEYS) {
        const gain = this.gains[key]
        if (gain) gain.gain.setTargetAtTime(0.0, now, 0.15)
      }
    } else {
      // Individual section: mute the tutti track, mix individual stems
      if (tuttiGain) tuttiGain.gain.setTargetAtTime(0.0, now, 0.15)
      for (const key of SOLO_KEYS) {
        const gain = this.gains[key]
        if (!gain) continue
        gain.gain.setTargetAtTime(key === sectionKey ? 1.0 : 0.15, now, 0.15)
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

  dispose() {
    for (const key of SECTION_KEYS) {
      const el = this.elements[key]
      if (el) {
        el.pause()
        el.src = ''
      }
    }
    this.ctx?.close()
  }

  getFrequencyData(sectionKey) {
    const analyser = this.analysers[sectionKey]
    if (!analyser) return null
    const data = this.freqDataBuffers[sectionKey]
    if (!data) return null
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
