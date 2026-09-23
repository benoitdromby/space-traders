<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface Star {
  x: number
  y: number
  r: number
  a: number
  da: number
}

const canvas = ref<HTMLCanvasElement | null>(null)

let stars: Star[] = []
let frame = 0
let context: CanvasRenderingContext2D | null = null
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function init() {
  const el = canvas.value
  if (!el) return
  el.width = window.innerWidth
  el.height = window.innerHeight
  const count = Math.floor((el.width * el.height) / 3000)
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * el.width,
    y: Math.random() * el.height,
    r: Math.random() * 1.2,
    a: Math.random() * 0.7 + 0.1,
    da: (Math.random() - 0.5) * 0.003,
  }))
  draw()
}

function draw() {
  const el = canvas.value
  if (!el || !context) return
  context.clearRect(0, 0, el.width, el.height)
  for (const star of stars) {
    star.a = Math.max(0.05, Math.min(0.9, star.a + star.da))
    if (star.a <= 0.05 || star.a >= 0.9) star.da *= -1
    context.beginPath()
    context.arc(star.x, star.y, star.r, 0, Math.PI * 2)
    context.fillStyle = `rgba(180, 210, 255, ${star.a})`
    context.fill()
  }
  // Users who ask for reduced motion get a static sky.
  if (!reducedMotion) frame = requestAnimationFrame(draw)
}

function onResize() {
  cancelAnimationFrame(frame)
  init()
}

onMounted(() => {
  context = canvas.value?.getContext('2d') ?? null
  if (!context) return
  init()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" class="pointer-events-none fixed inset-0 z-0" />
</template>
