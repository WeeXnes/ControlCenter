<template>
  <div class="relative w-full h-full min-h-[500px] overflow-hidden select-none bg-[#090d16] rounded-xl border border-base-content/10 shadow-2xl">
    <!-- Starfield & Cosmic Grid Canvas Background -->
    <canvas 
      ref="canvasRef" 
      class="w-full h-full block cursor-grab active:cursor-grabbing"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @wheel.prevent="handleWheel"
      @click="handleClick"
    ></canvas>

    <!-- Floating Top Toolbar Controls -->
    <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
      <!-- Search & Filters -->
      <div class="flex items-center gap-2 pointer-events-auto">
        <div class="relative">
          <Icon name="material-symbols:search-rounded" size="16" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search topology..." 
            class="input input-xs pl-8 pr-3 py-1 rounded-lg bg-base-100/85 backdrop-blur-md border-base-content/15 focus:border-primary text-xs w-44 md:w-56 shadow-lg"
          />
        </div>

        <button 
          @click="togglePhysics" 
          class="btn btn-xs rounded-lg bg-base-100/85 backdrop-blur-md border-base-content/15 shadow-lg text-xs gap-1 font-semibold hover:border-primary"
          :class="isPhysicsRunning ? 'text-primary' : 'text-base-content/60'"
          title="Toggle Physics Simulation"
        >
          <Icon :name="isPhysicsRunning ? 'material-symbols:pause-rounded' : 'material-symbols:play-arrow-rounded'" size="14" />
          {{ isPhysicsRunning ? 'Freeze' : 'Simulate' }}
        </button>

        <button 
          @click="resetView" 
          class="btn btn-xs rounded-lg bg-base-100/85 backdrop-blur-md border-base-content/15 shadow-lg text-xs gap-1 font-semibold hover:border-primary text-base-content/80"
          title="Fit & Center View"
        >
          <Icon name="material-symbols:center-focus-strong-outline-rounded" size="14" />
          Fit View
        </button>
      </div>

      <!-- Right Action Bar: Add Device & Stats -->
      <div class="flex items-center gap-2 pointer-events-auto">
        <div class="px-2.5 py-1 rounded-lg bg-base-100/80 backdrop-blur-md border border-base-content/15 text-[11px] font-mono text-base-content/70 hidden sm:flex items-center gap-2 shadow-lg">
          <span><strong class="text-primary">{{ graphNodes.length }}</strong> Nodes</span>
          <span class="opacity-30">|</span>
          <span><strong class="text-secondary">{{ graphLinks.length }}</strong> Links</span>
        </div>

        <button 
          @click="$emit('open-add-device')" 
          class="btn btn-primary btn-xs rounded-lg shadow-lg font-semibold gap-1 text-xs"
        >
          <Icon name="material-symbols:add-rounded" size="16" />
          Add Device / Subnet
        </button>
      </div>
    </div>

    <!-- Floating Zoom Controls (Bottom Right) -->
    <div class="absolute bottom-4 right-4 flex flex-col gap-1 z-20">
      <button 
        @click="zoomIn" 
        class="btn btn-square btn-xs bg-base-100/85 backdrop-blur-md border-base-content/15 shadow-lg hover:border-primary"
        title="Zoom In"
      >
        <Icon name="material-symbols:add-rounded" size="15" />
      </button>
      <button 
        @click="zoomOut" 
        class="btn btn-square btn-xs bg-base-100/85 backdrop-blur-md border-base-content/15 shadow-lg hover:border-primary"
        title="Zoom Out"
      >
        <Icon name="material-symbols:remove-rounded" size="15" />
      </button>
    </div>

    <!-- Legend Overlay (Bottom Left) -->
    <div class="absolute bottom-4 left-4 p-2.5 rounded-lg bg-base-100/80 backdrop-blur-md border border-base-content/10 text-[10px] space-y-1.5 shadow-lg pointer-events-none hidden sm:block">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
          <span class="font-medium text-base-content/80">Machine</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
          <span class="font-medium text-base-content/80">Router / Subnet</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
          <span class="font-medium text-base-content/80">Service (@:port)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  machines: any[]
  devices: any[]
  nodeServices: Record<string, any[]>
  links: any[]
  selectedNodeId?: string | null
}>()

const emit = defineEmits(['select-node', 'open-add-device'])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const searchQuery = ref('')
const isPhysicsRunning = ref(true)

// Graph Simulation State
interface GraphNode {
  id: string
  name: string
  type: 'machine' | 'router' | 'switch' | 'subnet' | 'service' | 'server' | 'custom'
  ip?: string
  cidr?: string
  parentId?: string
  serviceData?: any
  online?: boolean
  telemetry?: any
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

interface GraphLink {
  source: string
  target: string
  type: 'cidr' | 'service' | 'custom'
  label?: string
  sourceNode?: GraphNode
  targetNode?: GraphNode
}

const graphNodes = ref<GraphNode[]>([])
const graphLinks = ref<GraphLink[]>([])
let animFrameId: number | null = null

// View Transformation (Pan & Zoom)
let transform = {
  x: 0,
  y: 0,
  k: 1
}

let isDragging = false
let dragTarget: GraphNode | null = null
let dragStartPos = { x: 0, y: 0 }
let lastMousePos = { x: 0, y: 0 }
let hoveredNode: GraphNode | null = null

// Background particle stars
const bgStars: Array<{ x: number; y: number; r: number; alpha: number; pulseSpeed: number }> = []

const initBgStars = (width: number, height: number) => {
  bgStars.length = 0
  for (let i = 0; i < 90; i++) {
    bgStars.push({
      x: (Math.random() - 0.5) * width * 3,
      y: (Math.random() - 0.5) * height * 3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005
    })
  }
}

// Build Graph from Props
const buildGraphData = () => {
  const existingPosMap = new Map<string, { x: number; y: number }>()
  for (const n of graphNodes.value) {
    existingPosMap.set(n.id, { x: n.x, y: n.y })
  }

  const newNodes: GraphNode[] = []
  const newLinks: GraphLink[] = []

  // 1. Add Router / Infrastructure Devices
  for (const dev of props.devices || []) {
    const existing = existingPosMap.get(dev.id)
    const angle = Math.random() * Math.PI * 2
    const dist = 100 + Math.random() * 60

    newNodes.push({
      id: dev.id,
      name: dev.name,
      type: dev.type || 'router',
      ip: dev.ip,
      cidr: dev.cidr,
      x: existing ? existing.x : Math.cos(angle) * dist,
      y: existing ? existing.y : Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: dev.type === 'router' ? 22 : 18,
      color: '#f59e0b' // amber
    })
  }

  // 2. Add ControlCenter Machines
  for (const m of props.machines || []) {
    const existing = existingPosMap.get(m.id)
    const angle = Math.random() * Math.PI * 2
    const dist = 160 + Math.random() * 80

    newNodes.push({
      id: m.id,
      name: m.name,
      type: 'machine',
      ip: m.ip,
      online: m.online,
      telemetry: m.telemetry,
      x: existing ? existing.x : Math.cos(angle) * dist,
      y: existing ? existing.y : Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: 20,
      color: m.online ? '#3b82f6' : '#ef4444' // blue or red
    })
  }

  // 3. Add Satellite Services attached to Nodes
  for (const [nodeId, sList] of Object.entries(props.nodeServices || {})) {
    const parentNode = newNodes.find(n => n.id === nodeId)
    if (!parentNode) continue

    sList.forEach((s, idx) => {
      const sId = `service_${s.id}`
      const existing = existingPosMap.get(sId)
      const offsetAngle = (idx / Math.max(1, sList.length)) * Math.PI * 2
      const offsetDist = 65

      newNodes.push({
        id: sId,
        name: s.name,
        type: 'service',
        parentId: nodeId,
        serviceData: s,
        x: existing ? existing.x : parentNode.x + Math.cos(offsetAngle) * offsetDist,
        y: existing ? existing.y : parentNode.y + Math.sin(offsetAngle) * offsetDist,
        vx: 0,
        vy: 0,
        radius: 12,
        color: s.status === 'online' ? '#22c55e' : (s.status === 'offline' ? '#ef4444' : '#a855f7')
      })
    })
  }

  // Map nodes for fast lookup
  const nodeMap = new Map(newNodes.map(n => [n.id, n]))

  // 4. Resolve Links
  for (const link of props.links || []) {
    const sourceNode = nodeMap.get(link.source)
    const targetNode = nodeMap.get(link.target)
    if (sourceNode && targetNode) {
      newLinks.push({
        ...link,
        sourceNode,
        targetNode
      })
    }
  }

  graphNodes.value = newNodes
  graphLinks.value = newLinks
}

// Physics Simulation Step
const tickPhysics = () => {
  if (!isPhysicsRunning.value) return

  const repulsionForce = 4500
  const springLength = 110
  const springStrength = 0.04
  const centerGravity = 0.015
  const friction = 0.88

  const nodes = graphNodes.value
  const links = graphLinks.value

  // Repulsion between all node pairs
  for (let i = 0; i < nodes.length; i++) {
    const n1 = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const n2 = nodes[j]
      const dx = n2.x - n1.x
      const dy = n2.y - n1.y
      const distSq = dx * dx + dy * dy || 1
      const dist = Math.sqrt(distSq)

      if (dist < 500) {
        const force = repulsionForce / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        if (n1 !== dragTarget) {
          n1.vx -= fx
          n1.vy -= fy
        }
        if (n2 !== dragTarget) {
          n2.vx += fx
          n2.vy += fy
        }
      }
    }
  }

  // Spring force along links
  for (const link of links) {
    const s = link.sourceNode
    const t = link.targetNode
    if (!s || !t) continue

    const dx = t.x - s.x
    const dy = t.y - s.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const targetDist = link.type === 'service' ? 60 : springLength
    const delta = dist - targetDist
    const force = delta * springStrength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force

    if (s !== dragTarget) {
      s.vx += fx
      s.vy += fy
    }
    if (t !== dragTarget) {
      t.vx -= fx
      t.vy -= fy
    }
  }

  // Center gravity pull & apply velocity
  for (const n of nodes) {
    if (n === dragTarget) continue

    n.vx -= n.x * centerGravity
    n.vy -= n.y * centerGravity

    n.vx *= friction
    n.vy *= friction

    n.x += n.vx
    n.y += n.vy
  }
}

// Particle flow animation timer
let particleTime = 0

// Main Canvas Render Loop
const render = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  // Save base transform
  ctx.save()

  // Translate to center + pan offset
  ctx.translate(width / 2 + transform.x, height / 2 + transform.y)
  ctx.scale(transform.k, transform.k)

  // 1. Draw Starfield Background
  particleTime += 0.02
  for (const star of bgStars) {
    const pulseAlpha = star.alpha + Math.sin(particleTime * star.pulseSpeed * 50) * 0.15
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0.1, pulseAlpha)})`
    ctx.fill()
  }

  const nodes = graphNodes.value
  const links = graphLinks.value

  // Empty State if no nodes present
  if (nodes.length === 0) {
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('No topology nodes yet. Click "Add Device / Subnet" above to begin.', 0, 0)
    ctx.restore()
    animFrameId = requestAnimationFrame(render)
    return
  }

  // 2. Draw Links & Flowing Particles
  for (const link of links) {
    const s = link.sourceNode
    const t = link.targetNode
    if (!s || !t) continue

    const isConnectedToHover = hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id)
    const isConnectedToSelected = props.selectedNodeId && (props.selectedNodeId === s.id || props.selectedNodeId === t.id)

    // Base Line
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(t.x, t.y)

    if (isConnectedToSelected) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)'
      ctx.lineWidth = 2.5
    } else if (isConnectedToHover) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)'
      ctx.lineWidth = 2
    } else if (link.type === 'service') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
      ctx.lineWidth = 1.2
    } else {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'
      ctx.lineWidth = 1.5
    }
    ctx.stroke()

    // Flowing Energy Particles along link
    const particleOffset = (particleTime % 1)
    const px = s.x + (t.x - s.x) * particleOffset
    const py = s.y + (t.y - s.y) * particleOffset

    ctx.beginPath()
    ctx.arc(px, py, 2, 0, Math.PI * 2)
    ctx.fillStyle = link.type === 'service' ? '#a855f7' : '#38bdf8'
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0

    // Optional link label (CIDR or Port)
    if (link.label && transform.k > 0.7) {
      const midX = (s.x + t.x) / 2
      const midY = (s.y + t.y) / 2
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
      ctx.textAlign = 'center'
      ctx.fillText(link.label, midX, midY - 4)
    }
  }

  // 3. Draw Nodes
  const query = searchQuery.value.toLowerCase().trim()

  for (const n of nodes) {
    const isSelected = props.selectedNodeId === n.id
    const isHovered = hoveredNode === n
    const isMatch = query ? (n.name.toLowerCase().includes(query) || (n.ip && n.ip.includes(query)) || (n.cidr && n.cidr.includes(query))) : true

    // Dim if searching and not matching
    const nodeAlpha = query && !isMatch ? 0.2 : 1.0

    ctx.save()
    ctx.globalAlpha = nodeAlpha

    // Outer Glow / Pulse Ring
    if (isSelected || isHovered || n.online) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius + (isSelected ? 8 : (isHovered ? 6 : 4)), 0, Math.PI * 2)
      ctx.fillStyle = isSelected 
        ? 'rgba(59, 130, 246, 0.25)' 
        : (isHovered ? 'rgba(168, 85, 247, 0.2)' : 'rgba(34, 197, 94, 0.15)')
      ctx.fill()
    }

    // Node Body
    ctx.beginPath()
    if (n.type === 'router' || n.type === 'subnet' || n.type === 'switch') {
      // Rounded Rect / Hex shape for infrastructure hubs
      const size = n.radius * 1.8
      ctx.roundRect(n.x - size / 2, n.y - size / 2, size, size, 6)
    } else {
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
    }

    ctx.fillStyle = isSelected ? '#3b82f6' : (isHovered ? '#8b5cf6' : n.color)
    ctx.shadowColor = isSelected ? '#3b82f6' : (isHovered ? '#8b5cf6' : n.color)
    ctx.shadowBlur = isSelected ? 16 : 8
    ctx.fill()
    ctx.shadowBlur = 0

    // Node Border
    ctx.lineWidth = isSelected ? 2.5 : 1.5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    // Labels
    ctx.textAlign = 'center'

    if (n.type === 'service') {
      // Service Satellite Node: Name & @:port badge
      ctx.font = 'bold 10px sans-serif'
      ctx.fillStyle = '#f8fafc'
      ctx.fillText(n.name, n.x, n.y + n.radius + 12)

      ctx.font = '9px monospace'
      ctx.fillStyle = '#a855f7'
      const portText = n.serviceData?.port ? `@:${n.serviceData.port}` : ''
      ctx.fillText(portText, n.x, n.y + n.radius + 22)
    } else {
      // Machine or Router Node
      ctx.font = 'bold 11px sans-serif'
      ctx.fillStyle = '#f8fafc'
      ctx.fillText(n.name, n.x, n.y + n.radius + 14)

      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
      const sub = n.ip || n.cidr || ''
      if (sub) {
        ctx.fillText(sub, n.x, n.y + n.radius + 25)
      }
    }

    ctx.restore()
  }

  ctx.restore()

  // Physics update & next frame
  tickPhysics()
  animFrameId = requestAnimationFrame(render)
}

// Coordinate transforms (Screen -> World)
const screenToWorld = (screenX: number, screenY: number) => {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const mouseX = screenX - rect.left - canvas.width / 2 - transform.x
  const mouseY = screenY - rect.top - canvas.height / 2 - transform.y
  return {
    x: mouseX / transform.k,
    y: mouseY / transform.k
  }
}

// Hit testing
const getNodeAtPosition = (worldX: number, worldY: number): GraphNode | null => {
  const nodes = graphNodes.value
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const dx = worldX - n.x
    const dy = worldY - n.y
    if (dx * dx + dy * dy <= (n.radius + 8) * (n.radius + 8)) {
      return n
    }
  }
  return null
}

// Mouse Event Handlers
const handleMouseDown = (e: MouseEvent) => {
  const pos = screenToWorld(e.clientX, e.clientY)
  const hit = getNodeAtPosition(pos.x, pos.y)

  dragStartPos = { x: e.clientX, y: e.clientY }
  lastMousePos = { x: e.clientX, y: e.clientY }

  if (hit) {
    dragTarget = hit
    dragTarget.vx = 0
    dragTarget.vy = 0
  } else {
    isDragging = true
  }
}

const handleMouseMove = (e: MouseEvent) => {
  const pos = screenToWorld(e.clientX, e.clientY)

  if (dragTarget) {
    dragTarget.x = pos.x
    dragTarget.y = pos.y
    dragTarget.vx = 0
    dragTarget.vy = 0
  } else if (isDragging) {
    const dx = e.clientX - lastMousePos.x
    const dy = e.clientY - lastMousePos.y
    transform.x += dx
    transform.y += dy
  } else {
    hoveredNode = getNodeAtPosition(pos.x, pos.y)
  }

  lastMousePos = { x: e.clientX, y: e.clientY }
}

const handleMouseUp = () => {
  isDragging = false
  dragTarget = null
}

const handleClick = (e: MouseEvent) => {
  const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y)
  if (dist > 5) return // was a drag, not click

  const pos = screenToWorld(e.clientX, e.clientY)
  const hit = getNodeAtPosition(pos.x, pos.y)

  if (hit) {
    // If service node, select the parent node or service
    if (hit.type === 'service' && hit.parentId) {
      const parent = graphNodes.value.find(n => n.id === hit.parentId)
      emit('select-node', parent || hit)
    } else {
      emit('select-node', hit)
    }
  } else {
    emit('select-node', null)
  }
}

const handleWheel = (e: WheelEvent) => {
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
  const newK = Math.min(Math.max(0.3, transform.k * zoomFactor), 3.0)

  // Zoom towards cursor
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left - canvas.width / 2 - transform.x
  const mouseY = e.clientY - rect.top - canvas.height / 2 - transform.y

  transform.x -= mouseX * (newK / transform.k - 1)
  transform.y -= mouseY * (newK / transform.k - 1)
  transform.k = newK
}

const zoomIn = () => {
  transform.k = Math.min(3.0, transform.k * 1.25)
}

const zoomOut = () => {
  transform.k = Math.max(0.3, transform.k / 1.25)
}

const resetView = () => {
  transform = { x: 0, y: 0, k: 1 }
}

const togglePhysics = () => {
  isPhysicsRunning.value = !isPhysicsRunning.value
}

// Canvas Resize Handler with ResizeObserver
let resizeObserver: ResizeObserver | null = null

const handleResize = () => {
  const canvas = canvasRef.value
  if (!canvas || !canvas.parentElement) return
  const w = canvas.parentElement.clientWidth || canvas.clientWidth || window.innerWidth
  const h = canvas.parentElement.clientHeight || canvas.clientHeight || 600
  if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w
    canvas.height = h
    initBgStars(canvas.width, canvas.height)
  }
}

watch([() => props.machines, () => props.devices, () => props.nodeServices, () => props.links], () => {
  buildGraphData()
}, { deep: true })

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)

  const canvas = canvasRef.value
  if (canvas?.parentElement && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(canvas.parentElement)
  }

  buildGraphData()
  animFrameId = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (animFrameId) {
    cancelAnimationFrame(animFrameId)
  }
})
</script>
