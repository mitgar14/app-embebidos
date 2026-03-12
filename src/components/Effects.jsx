import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'

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
      <Vignette offset={0.9} darkness={1.2} />
      <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
      <ChromaticAberration offset={new Vector2(0.001, 0.001)} />
    </EffectComposer>
  )
}
