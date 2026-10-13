<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  /** ECharts option */
  option: { type: Object, required: true },
  height: { type: [Number, String], default: 300 },
  loading: { type: Boolean, default: false },
  /** 点击图表时把 params 抛给父组件 */
  clickable: { type: Boolean, default: false }
})

const emit = defineEmits(['chart-click'])

const wrapRef = ref(null)
const chart = shallowRef(null)
let observer = null

function styleHeight() {
  return typeof props.height === 'number' ? `${props.height}px` : props.height
}

function render() {
  if (!chart.value) return
  chart.value.setOption(props.option, { notMerge: true, lazyUpdate: false })
}

function resize() {
  chart.value?.resize()
}

function ensureChart() {
  const el = wrapRef.value
  if (!el || chart.value) return
  // 容器处于隐藏状态（例如未激活的 Tab）时尺寸为 0，等可见后再初始化，避免 ECharts 警告
  if (!el.clientWidth || !el.clientHeight) return
  chart.value = echarts.init(el, null, { renderer: 'canvas' })
  render()
  if (props.loading) toggleLoading(true)
  if (props.clickable) {
    chart.value.on('click', (params) => emit('chart-click', params))
  }
}

onMounted(async () => {
  await nextTick()
  ensureChart()
  observer = new ResizeObserver(() => {
    if (chart.value) resize()
    else ensureChart()
  })
  observer.observe(wrapRef.value)
})

function toggleLoading(value) {
  if (!chart.value) return
  if (value) {
    chart.value.showLoading({
      text: '加载中…',
      color: '#99B6B4',
      textColor: '#667977',
      maskColor: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      spinnerRadius: 8,
      lineWidth: 2
    })
  } else {
    chart.value.hideLoading()
  }
}

watch(
  () => props.option,
  () => {
    ensureChart()
    render()
  },
  { deep: true }
)
watch(
  () => props.loading,
  (value) => toggleLoading(value)
)

onBeforeUnmount(() => {
  observer?.disconnect()
  chart.value?.dispose()
  chart.value = null
})

defineExpose({ resize })
</script>

<template>
  <div ref="wrapRef" class="chart-box" :style="{ height: styleHeight() }"></div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  transition: opacity 0.25s ease;
}
</style>
