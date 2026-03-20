'use client'

import { useState, useEffect } from 'react'
import { Visualization } from '@/components/Visualization'
import { FrameState, processPoseData } from '@/lib/processor'
import { CellularState, initializeAutomata, stepAutomata } from '@/lib/automata'
import { mintNFT } from '@/lib/mint'

export default function Home() {
  const [frameData, setFrameData] = useState<FrameState[]>([])
  const [automataData, setAutomataData] = useState<CellularState[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/pose_data_20260306_145233.json')
      .then(r => r.json())
      .then(raw => {
        const frames = processPoseData(raw)
        console.log(`[DATA] Loaded ${frames.length} frames`)
        console.log(`[DATA] First frame joints:`, frames[0]?.joints)
        setFrameData(frames)

        // Generate automata
        const automata: CellularState[] = []
        let state = initializeAutomata(frames[0])
        automata.push(state)
        console.log(`[AUTOMATA] Frame 0 cells:`, state.cells)

        for (let i = 1; i < frames.length; i++) {
          state = stepAutomata(state, frames[i])
          automata.push(state)
        }

        console.log(`[AUTOMATA] Generated ${automata.length} automata states`)
        console.log(`[AUTOMATA] Last frame cells:`, automata[automata.length - 1].cells)
        setAutomataData(automata)
        setLoading(false)
      })
      .catch(e => {
        console.error('[ERROR] Failed to load data:', e)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!isPlaying || frameData.length === 0) return

    const interval = setInterval(() => {
      setCurrentFrame(f => (f + 1) % frameData.length)
    }, 50)

    return () => clearInterval(interval)
  }, [isPlaying, frameData.length])

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading...</div>
      </div>
    )
  }

  return (
    <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="bg-gradient-to-br from-gray-900 to-black">
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {frameData.length > 0 && automataData.length > 0 && (
          <Visualization
            frameData={frameData}
            automataData={automataData}
            currentFrame={currentFrame}
          />
        )}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(34,211,238,1)', padding: '1rem' }}>
        <div className="max-w-4xl mx-auto">
          <input
            type="range"
            min="0"
            max={frameData.length - 1}
            value={currentFrame}
            onChange={(e) => {
              setCurrentFrame(parseInt(e.target.value))
              setIsPlaying(false)
            }}
            className="w-full h-2 bg-gray-700 rounded accent-cyan-400 mb-2"
          />

          <div className="flex gap-4 items-center justify-center">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-bold"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            <button
              onClick={() => setCurrentFrame(0)}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold"
            >
              ↻ Reset
            </button>

            <span className="text-gray-300">
              Frame {currentFrame + 1} / {frameData.length}
            </span>

            <button
              onClick={async () => {
                if (!frameData[currentFrame]) return
                setMinting(true)
                try {
                  const data = JSON.stringify(frameData[currentFrame])
                  const hash = await mintNFT(data)
                  setTxHash(hash)
                  alert(`✓ NFT Minted!\nTx: ${hash}`)
                } catch (error) {
                  alert(`✗ Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                } finally {
                  setMinting(false)
                }
              }}
              disabled={minting}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-bold ml-auto disabled:opacity-50"
            >
              {minting ? '⏳ Minting...' : '🎨 Mint NFT'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
