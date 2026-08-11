<template>
  <div class="card bg-base-200/80 border border-base-content/10 shadow-lg rounded-xl overflow-hidden flex flex-col h-[550px] w-full">
    <!-- Terminal Header / Control Bar -->
    <div class="bg-base-300/80 px-4 py-2.5 border-b border-base-content/5 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-3">
        <!-- Window Controls -->
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded-full bg-error/80"></div>
          <div class="w-3 h-3 rounded-full bg-warning/80"></div>
          <div class="w-3 h-3 rounded-full bg-success/80"></div>
        </div>
        <div class="h-4 w-px bg-base-content/10 mx-1"></div>
        <div class="flex items-center gap-2">
          <Icon name="material-symbols:terminal-rounded" class="text-primary" size="18" />
          <span class="font-mono text-xs font-bold text-base-content/80">
            SSH Shell &mdash; {{ machineName || 'Host' }} ({{ machineIp || 'IP' }})
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded"
              :class="connected ? 'bg-success/15 text-success border border-success/30' : 'bg-error/15 text-error border border-error/30'">
          <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-success animate-ping' : 'bg-error'"></span>
          {{ connected ? 'Connected' : 'Disconnected' }}
        </span>

        <button @click="reconnect" class="btn btn-ghost btn-xs rounded hover:bg-primary/10 text-primary gap-1">
          <Icon name="material-symbols:refresh-rounded" size="14" />
          Reconnect
        </button>
        <button @click="clearTerminal" class="btn btn-ghost btn-xs rounded hover:bg-base-content/10 text-base-content/60">
          Clear
        </button>
      </div>
    </div>

    <!-- Terminal Container -->
    <div class="flex-1 w-full bg-[#090b10] p-3 overflow-hidden relative min-h-0" ref="terminalContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  machineId: string
  machineName: string
  machineIp: string
}>()

const terminalContainer = ref<HTMLElement | null>(null)
const connected = ref(false)

let term: any = null
let fitAddon: any = null
let socket: WebSocket | null = null
let resizeObserver: ResizeObserver | null = null

const fitTerminal = () => {
  if (fitAddon && term && terminalContainer.value) {
    try {
      const dims = fitAddon.proposeDimensions()
      if (dims && dims.cols > 0 && dims.rows > 0) {
        term.resize(dims.cols, dims.rows)
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    } catch {}
  }
}

const initTerminal = async () => {
  if (!process.client || !terminalContainer.value) return

  const { Terminal } = await import('@xterm/xterm')
  const { FitAddon } = await import('@xterm/addon-fit')
  await import('@xterm/xterm/css/xterm.css')

  if (term) return // Already initialized

  term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Fira Code, JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.2,
    theme: {
      background: '#090b10',
      foreground: '#e2e8f0',
      cursor: '#3b82f6',
      selectionBackground: '#3b82f640',
      black: '#1e293b',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#eab308',
      blue: '#3b82f6',
      magenta: '#ec4899',
      cyan: '#06b6d4',
      white: '#f8fafc',
      brightBlack: '#64748b',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#fde047',
      brightBlue: '#60a5fa',
      brightMagenta: '#f472b6',
      brightCyan: '#38bdf8',
      brightWhite: '#ffffff'
    }
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(terminalContainer.value)
  
  setTimeout(() => {
    fitTerminal()
  }, 50)

  term.onData((data: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }))
    }
  })

  term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'resize', cols, rows }))
    }
  })

  window.addEventListener('resize', fitTerminal)

  if (typeof ResizeObserver !== 'undefined' && terminalContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      fitTerminal()
    })
    resizeObserver.observe(terminalContainer.value)
  }

  // Start websocket after terminal container is ready
  if (props.machineId) {
    connectWebSocket()
  }
}

const connectWebSocket = () => {
  if (!props.machineId || props.machineId === 'undefined') {
    if (term) {
      term.write('\r\n\x1b[31m[ControlCenter] Waiting for valid machine selection...\x1b[0m\r\n')
    }
    return
  }

  // Clear terminal screen and buffer from previous connections
  if (term) {
    try { term.reset() } catch {}
  }

  // Safely cleanup old socket listeners before closing to prevent race condition disconnect alerts
  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
    try { socket.close() } catch {}
    socket = null
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/ssh?machineId=${encodeURIComponent(props.machineId)}`

  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    connected.value = true
    setTimeout(() => {
      fitTerminal()
    }, 50)
  }

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.data && term) {
        term.write(msg.data)
        if (typeof msg.data === 'string' && (msg.data.includes('SSH Connection Established') || msg.data.includes('Connected'))) {
          connected.value = true
          setTimeout(() => {
            fitTerminal()
          }, 100)
        }
      }
    } catch {
      if (term) {
        term.write(event.data)
      }
    }
  }

  socket.onclose = () => {
    connected.value = false
    if (term) {
      term.write('\r\n\x1b[31m[ControlCenter] SSH session disconnected.\x1b[0m\r\n')
    }
  }

  socket.onerror = () => {
    connected.value = false
    if (term) {
      term.write('\r\n\x1b[31m[ControlCenter] Connection error.\x1b[0m\r\n')
    }
  }
}

const reconnect = () => {
  if (term) {
    term.clear()
  }
  connectWebSocket()
}

const clearTerminal = () => {
  if (term) {
    term.clear()
  }
}

watch(() => props.machineId, (newId, oldId) => {
  if (newId && newId !== 'undefined' && newId !== oldId && term) {
    term.clear()
    connectWebSocket()
  }
})

onMounted(() => {
  initTerminal()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitTerminal)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
    try { socket.close() } catch {}
    socket = null
  }
  if (term) {
    term.dispose()
  }
})
</script>

<style scoped>
:deep(.xterm) {
  height: 100% !important;
  width: 100% !important;
}

:deep(.xterm-viewport) {
  height: 100% !important;
  width: 100% !important;
}
</style>
