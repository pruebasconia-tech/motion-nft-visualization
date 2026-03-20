'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FrameState } from '@/lib/processor'
import { CellularState, getCellRGB } from '@/lib/automata'

interface VoxelData {
  position: THREE.Vector3
  mesh: THREE.Mesh
  targetScale: number
  targetColor: THREE.Color
}

interface SceneState {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  voxels: Map<string, VoxelData>
  voxelGeometry: THREE.BoxGeometry
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  controls: CameraControls
}

interface CameraControls {
  isRotating: boolean
  lastX: number
  lastY: number
  theta: number
  phi: number
  radius: number
}

// Procedural voxel colors based on energy
function getVoxelColor(energy: number): { color: THREE.Color; emissive: THREE.Color } {
  const hue = energy * 0.8 // Blue -> Red spectrum
  const saturation = 0.7 + energy * 0.3
  const lightness = 0.4 + energy * 0.4
  
  const color = new THREE.Color().setHSL(hue, saturation, lightness)
  const emissive = new THREE.Color().setHSL(hue, saturation * 0.6, lightness * 0.5)
  
  return { color, emissive }
}

// Create procedural voxel with outline effect
function createVoxel(position: THREE.Vector3, energy: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  
  // Rounded corners for better aesthetics
  geometry.computeVertexNormals()
  
  const { color, emissive } = getVoxelColor(energy)
  
  const material = new THREE.MeshPhongMaterial({
    color,
    emissive,
    shininess: 100,
    flatShading: false,
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  mesh.scale.set(0.98, 0.98, 0.98) // Slight gap between voxels
  
  return mesh
}

// Grid-based voxel positioning (snapping)
function snapToGrid(position: THREE.Vector3, gridSize: number = 1): THREE.Vector3 {
  return new THREE.Vector3(
    Math.round(position.x / gridSize) * gridSize,
    Math.round(position.y / gridSize) * gridSize,
    Math.round(position.z / gridSize) * gridSize
  )
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

      console.log(`[VOXEL] Starting procedural voxel setup with ${frameData.length} frames`)

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0a0a)
      scene.fog = new THREE.Fog(0x0a0a0a, 100, 200)

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
      camera.position.set(25, 20, 25)
      camera.lookAt(0, 5, 0)

      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: false, 
        powerPreference: 'high-performance'
      })

      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // Cap at 2x for perf
      renderer.setClearColor(0x0a0a0a, 1)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap

      containerRef.current.appendChild(renderer.domElement)
      console.log(`[VOXEL] Renderer initialized: ${width}x${height}`)

      // Layered lighting for voxel aesthetic
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(30, 40, 30)
      dirLight.castShadow = true
      dirLight.shadow.mapSize.width = 2048
      dirLight.shadow.mapSize.height = 2048
      dirLight.shadow.camera.left = -50
      dirLight.shadow.camera.right = 50
      dirLight.shadow.camera.top = 50
      dirLight.shadow.camera.bottom = -50
      scene.add(dirLight)

      const pointLight = new THREE.PointLight(0xff00ff, 0.3)
      pointLight.position.set(10, 15, -10)
      scene.add(pointLight)

      // Ground plane with grid
      const gridGeometry = new THREE.PlaneGeometry(50, 50)
      gridGeometry.rotateX(-Math.PI / 2)
      const gridMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.8
      })
      const groundMesh = new THREE.Mesh(gridGeometry, gridMaterial)
      groundMesh.receiveShadow = true
      scene.add(groundMesh)

      // Grid helper overlay
      const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222)
      gridHelper.position.y = 0.01
      scene.add(gridHelper)

      // Voxel geometry for reuse
      const voxelGeometry = new THREE.BoxGeometry(1, 1, 1)

      // Camera controls
      const controls: CameraControls = {
        isRotating: false,
        lastX: 0,
        lastY: 0,
        theta: Math.PI / 4,
        phi: Math.PI / 3,
        radius: 40
      }

      // Create initial voxel grid based on current frame
      const voxels = new Map<string, VoxelData>()
      
      if (automataData[currentFrame]) {
        const automata = automataData[currentFrame]
        automata.cells.forEach((energy, idx) => {
          if (energy > 0.1) {
            const gridSize = Math.ceil(Math.sqrt(33))
            const x = (idx % gridSize) - gridSize / 2
            const z = Math.floor(idx / gridSize) - gridSize / 2
            const y = energy * 5
            
            const position = new THREE.Vector3(x, y, z)
            const mesh = createVoxel(position, energy)
            mesh.castShadow = true
            mesh.receiveShadow = true
            scene.add(mesh)
            
            const key = `${x},${y.toFixed(1)},${z}`
            voxels.set(key, {
              position,
              mesh,
              targetScale: 0.98,
              targetColor: mesh.material instanceof THREE.MeshPhongMaterial ? mesh.material.color.clone() : new THREE.Color()
            })
          }
        })
      }

      console.log(`[VOXEL] Created ${voxels.size} voxels`)

      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()

      sceneStateRef.current = { 
        scene, 
        camera, 
        renderer, 
        voxels,
        voxelGeometry,
        raycaster,
        pointer,
        controls
      }
      initializedRef.current = true

      // Mouse controls
      const onMouseDown = (e: MouseEvent) => {
        controls.isRotating = true
        controls.lastX = e.clientX
        controls.lastY = e.clientY
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!controls.isRotating) return

        const deltaX = e.clientX - controls.lastX
        const deltaY = e.clientY - controls.lastY

        controls.theta -= deltaX * 0.01
        controls.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.phi + deltaY * 0.01))

        controls.lastX = e.clientX
        controls.lastY = e.clientY
      }

      const onMouseUp = () => {
        controls.isRotating = false
      }

      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        controls.radius = Math.max(10, Math.min(100, controls.radius + e.deltaY * 0.1))
      }

      renderer.domElement.addEventListener('mousedown', onMouseDown)
      renderer.domElement.addEventListener('mousemove', onMouseMove)
      renderer.domElement.addEventListener('mouseup', onMouseUp)
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

      // Animation loop
      let frameCount = 0
      const animate = () => {
        animIdRef.current = requestAnimationFrame(animate)

        if (!sceneStateRef.current) return

        const { renderer, scene, camera, voxels, controls } = sceneStateRef.current

        // Update camera with smooth orbit controls
        const x = controls.radius * Math.sin(controls.phi) * Math.cos(controls.theta)
        const y = controls.radius * Math.cos(controls.phi)
        const z = controls.radius * Math.sin(controls.phi) * Math.sin(controls.theta)
        camera.position.set(x, y + 5, z)
        camera.lookAt(0, 5, 0)

        // Update voxels smoothly
        if (automataData[currentFrame]) {
          const automata = automataData[currentFrame]
          const gridSize = Math.ceil(Math.sqrt(33))
          
          const newVoxelKeys = new Set<string>()

          automata.cells.forEach((energy, idx) => {
            if (energy > 0.1) {
              const x = (idx % gridSize) - gridSize / 2
              const z = Math.floor(idx / gridSize) - gridSize / 2
              const y = energy * 5
              
              const key = `${x},${y.toFixed(1)},${z}`
              newVoxelKeys.add(key)

              if (voxels.has(key)) {
                // Update existing voxel
                const voxelData = voxels.get(key)!
                const { color, emissive } = getVoxelColor(energy)
                
                voxelData.targetScale = 0.98
                voxelData.targetColor = color

                const mat = voxelData.mesh.material as THREE.MeshPhongMaterial
                mat.color.lerp(color, 0.15)
                mat.emissive.lerp(emissive, 0.15)
                voxelData.mesh.scale.lerp(new THREE.Vector3(0.98, 0.98, 0.98), 0.1)
              } else {
                // Create new voxel
                const position = new THREE.Vector3(x, y, z)
                const mesh = createVoxel(position, energy)
                mesh.castShadow = true
                mesh.receiveShadow = true
                scene.add(mesh)

                voxels.set(key, {
                  position,
                  mesh,
                  targetScale: 0.98,
                  targetColor: mesh.material instanceof THREE.MeshPhongMaterial ? mesh.material.color.clone() : new THREE.Color()
                })
              }
            }
          })

          // Remove voxels that are no longer active
          for (const [key, voxelData] of voxels.entries()) {
            if (!newVoxelKeys.has(key)) {
              scene.remove(voxelData.mesh)
              voxels.delete(key)
            }
          }
        }

        renderer.render(scene, camera)

        if (frameCount++ === 0) {
          console.log(`[VOXEL] First frame animated, ${voxels.size} voxels`)
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
        renderer.domElement.removeEventListener('mousedown', onMouseDown)
        renderer.domElement.removeEventListener('mousemove', onMouseMove)
        renderer.domElement.removeEventListener('mouseup', onMouseUp)
        renderer.domElement.removeEventListener('wheel', onWheel)
        
        if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
        if (sceneStateRef.current) {
          sceneStateRef.current.renderer.dispose()
          sceneStateRef.current.voxelGeometry.dispose()
          if (containerRef.current?.contains(sceneStateRef.current.renderer.domElement)) {
            containerRef.current.removeChild(sceneStateRef.current.renderer.domElement)
          }
        }
        sceneStateRef.current = null
        initializedRef.current = false
      }
    } catch (error) {
      console.error('[VOXEL ERROR]', error)
      return
    }
  }, [frameData.length, automataData.length])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        position: 'relative'
      }}
    >
      {frameData.length === 0 && (
        <div style={{ position: 'absolute', color: '#fff', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          Cargando datos...
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#0f0', fontSize: '12px', fontFamily: 'monospace', zIndex: 10 }}>
        Drag: Rotar | Scroll: Zoom | Frame: {currentFrame}
      </div>
    </div>
  )
}
