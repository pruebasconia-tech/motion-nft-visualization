export interface FrameState {
  frameId: number
  joints: number[] // 0-1 energy per joint
  totalEnergy: number
}

export function processPoseData(rawData: any): FrameState[] {
  // Handle both array and object with { metadata, frames } structure
  const frames = Array.isArray(rawData) ? rawData : rawData.frames || []
  
  return frames.map((frame: any, idx: number) => {
    const pose = frame.pose || []
    const joints: number[] = []
    let totalEnergy = 0

    for (let i = 0; i < 33; i++) {
      const kp = pose[i]
      if (!kp) {
        joints[i] = 0
        continue
      }

      // Simple energy = visibility
      const energy = Math.min(1, (kp.visibility || 0.5) * 1.5)
      joints[i] = energy
      totalEnergy += energy
    }

    return {
      frameId: idx,
      joints,
      totalEnergy: totalEnergy / 33,
    }
  })
}
