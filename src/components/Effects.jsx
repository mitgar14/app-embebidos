import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

const CA_OFFSET = new Vector2(0.001, 0.001)

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
        resolutionX={256}
        resolutionY={256}
      />
      <Vignette offset={0.6} darkness={0.5} />
      <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
      <ChromaticAberration offset={CA_OFFSET} />
    </EffectComposer>
  )
}
