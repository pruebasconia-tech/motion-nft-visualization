'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FrameState } from '@/lib/processor'
import { CellularState, getCellRGB } from '@/lib/automata'

interface SceneState {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  meshes: THREE.Mesh[]
}

export function Visualization({
  frameData,
  automataData,
  currentFrame,
}: {
  frameData: FrameState[]
  automataData: CellularState[]
  currentFrame: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneStateRef = useRef<SceneState | null>(null)
  const animIdRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  // Initialize scene - only once when we have data
  useEffect(() => {
    if (!containerRef.current || sceneStateRef.current) return
    if (frameData.length === 0 || automataData.length === 0) return

    try {
      const width = containerRef.current.clientWidth || 800
      const height = containerRef.current.clientHeight || 600

      console.log(`[INIT] Starting Three.js setup with ${frameData.length} frames`)

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0f0f0f)

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
      camera.position.set(0, 8, 18)
      camera.lookAt(0, 8, 0)

      let renderer: THREE.WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
      } catch (e) {
        console.error('[ERROR] Failed to create WebGL renderer:', e)
        renderer = new THREE.WebGLRenderer({ alpha: false })
      }

      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio || 1)
      renderer.setClearColor(0x0f0f0f, 1)
      
      // Verify canvas was created
      if (!renderer.domElement) {
        console.error('[ERROR] Renderer has no domElement!')
        return
      }

      containerRef.current.appendChild(renderer.domElement)
      console.log(`[INIT] Renderer created and appended, canvas: ${renderer.domElement.width}x${renderer.domElement.height}`)

      // Strong lighting
      const light1 = new THREE.DirectionalLight(0xffffff, 1.2)
      light1.position.set(15, 20, 15)
      scene.add(light1)

      const light2 = new THREE.AmbientLight(0xffffff, 0.8)
      scene.add(light2)

      // TEST: Add a massive red sphere
      const testGeom = new THREE.SphereGeometry(5, 16, 16)
      const testMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x440000 })
      const testMesh = new THREE.Mesh(testGeom, testMat)
      testMesh.position.set(0, 8, 0)
      scene.add(testMesh)
      console.log(`[INIT] Added test red sphere`)

      // Create 33 small spheres
      const meshes: THREE.Mesh[] = []
      const sphereGeom = new THREE.SphereGeometry(0.5, 8, 8)
      
      for (let i = 0; i < 33; i++) {
        const hue = (i / 33) * 360
        const mat = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color().setHSL(hue / 360, 0.8, 0.5),
          emissive: new THREE.Color().setHSL(hue / 360, 0.4, 0.2),
          shininess: 50
        })
        const mesh = new THREE.Mesh(sphereGeom, mat)

        const col = i % 6
        const row = Math.floor(i / 6)
        mesh.position.set((col - 2.5) * 2.8, 12 - row * 2.2, 0)
        
        scene.add(mesh)
        meshes.push(mesh)
      }

      console.log(`[INIT] Created ${meshes.length} colored spheres`)

      sceneStateRef.current = { scene, camera, renderer, meshes }
      initializedRef.current = true

      // Animation loop with explicit render call
      let frameCount = 0
      const animate = () => {
        animIdRef.current = requestAnimationFrame(animate)

        if (!sceneStateRef.current) return

        const { renderer, scene, camera, meshes } = sceneStateRef.current

        // Update mesh colors based on data
        if (automataData[currentFrame]) {
          const automata = automataData[currentFrame]
          meshes.forEach((mesh, idx) => {
            const energy = automata.cells[idx] ?? 0
            const [r, g, b] = getCellRGB(energy)
            const scale = 0.6 + energy * 1.8
            mesh.scale.set(scale, scale, scale)
            const mat = mesh.material as THREE.MeshPhongMaterial
            mat.color.setRGB(r / 255, g / 255, b / 255)
            mat.emissive.setRGB((r / 255) * 0.3, (g / 255) * 0.3, (b / 255) * 0.3)
          })
        }

        // EXPLICIT RENDER
        renderer.render(scene, camera)

        if (frameCount++ === 0) {
          console.log(`[ANIM] First frame rendered`)
        }
      }

      animate()

      const handleResize = () => {
        if (!sceneStateRef.current || !containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        sceneStateRef.current.camera.aspect = w / h
        sceneStateRef.current.camera.updateProjectionMatrix()
        sceneStateRef.current.renderer.setSize(w, h)
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
        if (sceneStateRef.current) {
          sceneStateRef.current.renderer.dispose()
          if (containerRef.current?.contains(sceneStateRef.current.renderer.domElement)) {
            containerRef.current.removeChild(sceneStateRef.current.renderer.domElement)
          }
        }
        sceneStateRef.current = null
        initializedRef.current = false
      }
    } catch (error) {
      console.error('[ERROR] Failed to initialize Three.js:', error)
      return
    }
  }, [frameData.length, automataData.length])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f0f0f',
        position: 'relative'
      }}
    >
      {frameData.length === 0 && (
        <div style={{ position: 'absolute', color: '#fff', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          Cargando datos...
        </div>
      )}
    </div>
  )
}
