<template>
  <div class="card bg-base-200/60 border border-base-content/10 backdrop-blur-md p-5 rounded-xl flex flex-col items-center justify-between shadow-lg relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
    <!-- Ambient background glow based on usage level -->
    <div 
      class="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl transition-all duration-500 opacity-15 group-hover:opacity-30 pointer-events-none"
      :class="colorGlowClass"
    ></div>

    <div class="flex items-center justify-between w-full mb-3">
      <div class="flex items-center gap-2.5">
        <!-- Exact 32x32px square tile icon wrapper -->
        <div class="w-8 h-8 rounded-lg bg-base-300/80 text-primary flex items-center justify-center flex-shrink-0">
          <Icon :name="icon" size="18" />
        </div>
        <span class="text-xs font-bold tracking-wider uppercase text-base-content/80">{{ title }}</span>
      </div>
      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md border border-base-content/10 bg-base-300/60" :class="statusBadgeClass">
        {{ percentage.toFixed(1) }}%
      </span>
    </div>

    <!-- Radial SVG Gauge -->
    <div class="relative w-36 h-36 flex items-center justify-center my-1">
      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <!-- Background Track -->
        <circle
          cx="50"
          cy="50"
          r="40"
          class="stroke-base-300"
          stroke-width="10"
          fill="transparent"
        />
        <!-- Progress Ring -->
        <circle
          cx="50"
          cy="50"
          r="40"
          :class="strokeColorClass"
          stroke-width="10"
          stroke-linecap="round"
          fill="transparent"
          :stroke-dasharray="strokeDashArray"
          :stroke-dashoffset="strokeDashOffset"
          class="transition-all duration-700 ease-out"
        />
      </svg>
      <div class="absolute flex flex-col items-center justify-center text-center">
        <span class="text-2xl font-black tracking-tight">{{ percentage.toFixed(0) }}<span class="text-xs font-normal text-base-content/50">%</span></span>
        <span class="text-[11px] font-medium text-base-content/60 capitalize">{{ label }}</span>
      </div>
    </div>

    <!-- Subtitle / Footer stats -->
    <div class="w-full mt-3 pt-2.5 border-t border-base-content/5 flex justify-between items-center text-xs font-medium text-base-content/60">
      <span>{{ detailLabel || 'Usage' }}</span>
      <span class="font-bold text-base-content">{{ detailValue || `${percentage.toFixed(1)}%` }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  label?: string
  percentage: number
  icon: string
  detailLabel?: string
  detailValue?: string
  color?: 'primary' | 'secondary' | 'accent' | 'warning' | 'error'
}>()

const strokeDashArray = 2 * Math.PI * 40

const strokeDashOffset = computed(() => {
  const clamped = Math.min(100, Math.max(0, props.percentage))
  return strokeDashArray - (strokeDashArray * clamped) / 100
})

const strokeColorClass = computed(() => {
  if (props.percentage > 85) return 'stroke-error'
  if (props.percentage > 70) return 'stroke-warning'
  
  switch (props.color) {
    case 'secondary': return 'stroke-secondary'
    case 'accent': return 'stroke-accent'
    default: return 'stroke-primary'
  }
})

const colorGlowClass = computed(() => {
  if (props.percentage > 85) return 'bg-error'
  if (props.percentage > 70) return 'bg-warning'

  switch (props.color) {
    case 'secondary': return 'bg-secondary'
    case 'accent': return 'bg-accent'
    default: return 'bg-primary'
  }
})

const statusBadgeClass = computed(() => {
  if (props.percentage > 85) return 'text-error border-error/30'
  if (props.percentage > 70) return 'text-warning border-warning/30'
  return 'text-primary border-primary/30'
})
</script>
