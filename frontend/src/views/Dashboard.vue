<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import {
  dashboardKpis,
  trend14,
  categoryDist,
  hotTemplates,
  taskStatusDist,
  todoList,
  wave,
  lastDays
} from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, areaGradient, barGradient, hexA } from '../utils/chartTheme'

const router = useRouter()

const kpis = ref([...dashboardKpis])
const trend = ref({ ...trend14 })
const loading = ref(false)
const chartKey = ref(0)

function refresh() {
  loading.value = true
  setTimeout(() => {
    const seed = Math.random() * 10 + 1
    const days = lastDays(14)
    trend.value = {
      days,
      local: wave(14, 800, 260, seed),
      cloud: wave(14, 450, 190, seed + 0.7),
      successRate: wave(14, 96, 4, seed + 1.3).map((v) => Math.min(99.6, Math.max(90, v + 0.6))),
      revenue: wave(14, 15200, 5200, seed + 2.1)
    }
    kpis.value = dashboardKpis.map((item) => ({
      ...item,
      value: typeof item.value === 'number' ? Number((item.value * (1 + (Math.random() - 0.5) * 0.12)).toFixed(item.digits || 0)) : item.value,
      delta: Number((item.delta + (Math.random() - 0.5) * 4).toFixed(1))
    }))
    chartKey.value += 1
    loading.value = false
    ElMessage.success('看板数据已刷新（演示数据随机波动）')
  }, 620)
}

onMounted(() => {
  // 首屏做一次轻微的入场刷新，让图表有动态感
  setTimeout(() => {
    loading.value = true
    setTimeout(() => (loading.value = false), 380)
  }, 120)
})

const trendOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: hexA('#99B6B4', 0.5) } } },
  legend: { ...legendBase, data: ['端侧生成', '云增强', '成功率'], top: 4, right: 8 },
  grid: { ...gridBase, top: 46, right: 46 },
  xAxis: { ...catAxis, data: trend.value.days, boundaryGap: false },
  yAxis: [
    { ...valAxis, name: '张', nameTextStyle: { color: C_SUB, fontSize: 11 } },
    { ...valAxis, name: '%', min: 88, max: 100, splitLine: { show: false }, nameTextStyle: { color: C_SUB, fontSize: 11 } }
  ],
  series: [
    {
      name: '端侧生成',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.6 },
      areaStyle: { color: areaGradient('#99B6B4') },
      data: trend.value.local
    },
    {
      name: '云增强',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.6 },
      areaStyle: { color: areaGradient('#D48982') },
      data: trend.value.cloud
    },
    {
      name: '成功率',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, type: 'dashed' },
      data: trend.value.successRate
    }
  ]
}))

const categoryOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 张（{d}%）' },
  legend: { ...legendBase, orient: 'vertical', right: 4, top: 'center', itemGap: 12 },
  series: [
    {
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['36%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      emphasis: {
        scale: true,
        scaleSize: 8,
        label: { show: true, fontSize: 13, fontWeight: 600, color: '#2F3E3D', formatter: '{b}\n{d}%' }
      },
      data: categoryDist
    }
  ]
}))

const hotOption = computed(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { ...gridBase, top: 16, left: 4, right: 42 },
  xAxis: { ...valAxis, splitLine: { show: false }, axisLabel: { show: false } },
  yAxis: {
    ...catAxis,
    inverse: true,
    data: hotTemplates.map((item) => item.name),
    axisLabel: { color: C_SUB, fontSize: 11 }
  },
  series: [
    {
      type: 'bar',
      barWidth: 12,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: barGradient('#99B6B4') },
      label: { show: true, position: 'right', color: C_SUB, fontSize: 11 },
      data: hotTemplates.map((item) => item.value)
    }
  ]
}))

const statusOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item' },
  legend: { ...legendBase, bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['0%', '62%'],
      center: ['50%', '44%'],
      roseType: 'radius',
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { color: C_SUB, fontSize: 11, formatter: '{b}\n{d}%' },
      labelLine: { length: 6, length2: 8 },
      data: taskStatusDist
    }
  ]
}))

function onCategoryClick(params) {
  ElMessage.info(`「${params.name}」共生成 ${params.value} 张，占 ${params.percent}%`)
}

function goTodo(item) {
  router.push(item.path)
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="运营看板"
      feature="F-ADM-04"
      desc="今日生成量、云任务占比、成功率、会员收入与待办事项集中呈现；数据为演示 Mock，用于验证后台信息架构。"
      :tags="['今日 2026-10-10']"
    >
      <template #actions>
        <el-button :loading="loading" @click="refresh">
          <el-icon><Refresh /></el-icon>
          <span style="margin-left: 6px">刷新数据</span>
        </el-button>
        <el-button type="primary" @click="router.push('/cloud-tasks')">
          <el-icon><Cloudy /></el-icon>
          <span style="margin-left: 6px">云任务处置</span>
        </el-button>
      </template>
    </PageHeader>

    <!-- KPI -->
    <div class="kpi-grid">
      <StatCard
        v-for="item in kpis"
        :key="item.key"
        :label="item.label"
        :value="item.value"
        :unit="item.unit"
        :delta="item.delta"
        :digits="item.digits || 0"
        :icon="item.icon"
        :tone="item.tone"
        :hint="item.hint"
        :invert="item.key === 'refund'"
      />
    </div>

    <!-- 趋势 + 分类 -->
    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">近 14 天生成趋势</div>
          <div class="ap-toolbar">
            <span class="soft-tag soft-tag--primary">端侧 + 云端</span>
            <span class="ap-muted">单位：张 / %</span>
          </div>
        </div>
        <div class="ap-card__body">
          <ChartBox :key="chartKey" :option="trendOption" :height="306" :loading="loading" />
        </div>
      </div>

      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">模板分类分布</div>
          <span class="ap-muted">点击扇区查看明细</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="categoryOption" :height="306" clickable @chart-click="onCategoryClick" />
        </div>
      </div>
    </div>

    <!-- 热门模板 + 任务状态 + 待办 -->
    <div class="grid-3">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">热门模板 Top 8</div>
          <span class="ap-muted">近 7 天使用量</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="hotOption" :height="330" />
        </div>
      </div>

      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">任务状态占比</div>
          <span class="soft-tag soft-tag--success">成功率 97.2%</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="statusOption" :height="330" />
        </div>
      </div>

      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">待办提醒</div>
          <span class="soft-tag soft-tag--accent">{{ todoList.length }} 条</span>
        </div>
        <div class="ap-card__body todo">
          <div v-for="item in todoList" :key="item.id" class="todo__item" @click="goTodo(item)">
            <span class="todo__bar" :class="`todo__bar--${item.level}`"></span>
            <div class="todo__text">
              <div class="todo__title">{{ item.text }}</div>
              <div class="todo__time">{{ item.time }}</div>
            </div>
            <el-icon class="todo__arrow" :size="14"><ArrowRight /></el-icon>
          </div>
          <div class="todo__tip">
            <el-icon :size="13"><InfoFilled /></el-icon>
            演示数据：真实环境由 F-ADM-04 运营看板接口下发
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
@media (max-width: 1500px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}
@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.grid-3 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr);
}
@media (max-width: 1400px) {
  .grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 980px) {
  .grid-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.todo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.24s ease;
  background: #fff;
}

.todo__item:hover {
  border-color: var(--c-primary-light);
  background: #f7fbfa;
  transform: translateX(4px);
  box-shadow: var(--sh-1);
}

.todo__item:hover .todo__arrow {
  color: var(--c-primary-deep);
  transform: translateX(2px);
}

.todo__bar {
  width: 4px;
  height: 30px;
  border-radius: 4px;
  flex: none;
}

.todo__bar--accent {
  background: var(--c-accent);
}
.todo__bar--warm {
  background: var(--c-warm);
}
.todo__bar--primary {
  background: var(--c-primary);
}
.todo__bar--mute {
  background: var(--c-border-strong);
}

.todo__text {
  flex: 1;
  min-width: 0;
}

.todo__title {
  font-size: 13px;
  line-height: 1.4;
}

.todo__time {
  font-size: 11px;
  color: var(--c-text-mute);
  margin-top: 2px;
}

.todo__arrow {
  color: var(--c-text-mute);
  transition: all 0.24s ease;
}

.todo__tip {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--c-text-mute);
}
</style>
