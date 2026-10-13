<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { cloudTasks, cloudStats, cloudTrend } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, areaGradient } from '../utils/chartTheme'

const list = ref(cloudTasks.map((item) => ({ ...item })))
const keyword = ref('')
const statusFilter = ref('全部')
const typeFilter = ref('全部')

const statusOptions = ['全部', '排队中', '处理中', '成功', '失败']
const typeOptions = ['全部', '超分增强', '换装生成', '背景替换', '风格化']

const filtered = computed(() =>
  list.value.filter((item) => {
    const matchKeyword = !keyword.value || item.id.includes(keyword.value) || item.user.includes(keyword.value)
    const matchStatus = statusFilter.value === '全部' || item.status === statusFilter.value
    const matchType = typeFilter.value === '全部' || item.type === typeFilter.value
    return matchKeyword && matchStatus && matchType
  })
)

const stats = computed(() => [
  { key: 'total', label: '今日云增强任务', value: cloudStats.todayTotal, unit: '次', icon: 'Cloudy', tone: 'primary', delta: 9.6, hint: '占全部生成 38.6%' },
  { key: 'running', label: '进行中', value: cloudStats.running, unit: '个', icon: 'Loading', tone: 'light', delta: 2, hint: '排队 + 处理中' },
  { key: 'cost', label: '平均耗时', value: cloudStats.avgCost, unit: 's', digits: 1, icon: 'Timer', tone: 'warm', delta: -6.2, invert: true, hint: '较昨日' },
  { key: 'deleted', label: '临时文件已销毁', value: cloudStats.fileDeleted, unit: '个', icon: 'DeleteFilled', tone: 'accent', delta: 12, hint: '回传后即时删除' }
])

const failCount = computed(() => list.value.filter((item) => item.status === '失败').length)

const trendOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis' },
  legend: { ...legendBase, top: 0, right: 8, data: ['上行文件量', '平均云耗时（秒）'] },
  grid: { ...gridBase, top: 42, right: 46 },
  xAxis: { ...catAxis, data: cloudTrend.days, boundaryGap: false },
  yAxis: [
    { ...valAxis, name: '个', nameTextStyle: { color: C_SUB, fontSize: 11 } },
    { ...valAxis, name: 's', splitLine: { show: false }, nameTextStyle: { color: C_SUB, fontSize: 11 } }
  ],
  series: [
    {
      name: '上行文件量',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.6 },
      areaStyle: { color: areaGradient('#99B6B4') },
      data: cloudTrend.upload
    },
    {
      name: '平均云耗时（秒）',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.2, type: 'dashed', color: PALETTE[1] },
      data: cloudTrend.cost
    }
  ]
}))

const typeOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 次（{d}%）' },
  legend: { ...legendBase, bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['50%', '44%'],
      roseType: 'radius',
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { color: C_SUB, fontSize: 11, formatter: '{b}\n{d}%' },
      data: [
        { name: '超分增强', value: 186 },
        { name: '换装生成', value: 142 },
        { name: '背景替换', value: 98 },
        { name: '风格化', value: 60 }
      ]
    }
  ]
}))

async function retry(row) {
  try {
    await ElMessageBox.confirm(
      `重试将重新上传文件并消耗云资源，失败原因已记录。确认重试任务 ${row.id}？`,
      '手动重试',
      { type: 'warning', confirmButtonText: '确认重试', cancelButtonText: '取消' }
    )
    row.status = '排队中'
    row.retry += 1
    row.upload = '使用中'
    ElMessage.success('已加入重试队列，状态将在轮询中更新')
  } catch (e) {
    /* 取消 */
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `删除任务将同时清理云端临时文件，并在审计中记录操作人。确认删除 ${row.id}？`,
      '删除云任务',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
    row.status = '已删除'
    row.upload = '已删除'
    ElMessage.success('任务已删除，临时文件已销毁并写入审计')
  } catch (e) {
    /* 取消 */
  }
}

function statusType(status) {
  if (status === '成功') return 'soft-tag--success'
  if (status === '失败') return 'soft-tag--accent'
  if (status === '已删除') return 'soft-tag--mute'
  return 'soft-tag--primary'
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="云增强任务处置"
      feature="F-CLD-01 / 02"
      desc="云增强任务列表、失败重试、临时文件销毁留痕；上行文件仅用于本次生成，回传完成后即时删除，服务端保留删除审计记录。"
      :tags="['即时删除', '重试机制', '审计留痕']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo：批量重试需服务端支持幂等重试')">
          <el-icon><RefreshRight /></el-icon>
          <span style="margin-left: 6px">批量重试</span>
        </el-button>
        <el-button type="primary" @click="keyword = ''; statusFilter = '失败'; typeFilter = '全部'">
          <el-icon><Filter /></el-icon>
          <span style="margin-left: 6px">只看失败（{{ failCount }}）</span>
        </el-button>
      </template>
    </PageHeader>

    <el-alert type="info" show-icon :closable="false" title="合规提示" description="端侧照片不上行；仅用户主动选择「云增强」时才上传必要文件，且在上行接口返回后立即销毁原文件，删除时间与操作人写入审计（保留 180 天）。" />

    <div class="kpi-grid">
      <StatCard
        v-for="item in stats"
        :key="item.key"
        :label="item.label"
        :value="item.value"
        :unit="item.unit"
        :digits="item.digits || 0"
        :icon="item.icon"
        :tone="item.tone"
        :delta="item.delta"
        :invert="!!item.invert"
        :hint="item.hint"
      />
    </div>

    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">近 14 天上行文件量与云耗时</div>
          <span class="ap-muted">上行量越低越符合「端侧优先」原则</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="trendOption" :height="286" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">云任务类型分布</div>
          <span class="soft-tag soft-tag--primary">近 30 天</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="typeOption" :height="286" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">云任务列表</div>
        <div class="ap-toolbar">
          <el-input v-model="keyword" placeholder="搜索任务号 / 用户" clearable style="width: 220px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="statusFilter" style="width: 130px">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="typeFilter" style="width: 140px">
            <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column prop="id" label="任务号" width="150">
            <template #default="{ row }"><span class="mono">{{ row.id }}</span></template>
          </el-table-column>
          <el-table-column prop="user" label="用户（脱敏）" width="130" />
          <el-table-column prop="type" label="增强类型" width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="soft-tag" :class="statusType(row.status)">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="100">
            <template #default="{ row }"><span class="num">{{ row.cost ? `${row.cost}s` : '—' }}</span></template>
          </el-table-column>
          <el-table-column label="重试次数" width="110">
            <template #default="{ row }">
              <span class="num" :class="{ 'retry-warn': row.retry >= 2 }">{{ row.retry }}</span>
            </template>
          </el-table-column>
          <el-table-column label="文件指纹" min-width="150">
            <template #default="{ row }"><span class="mono">{{ row.hash }}</span></template>
          </el-table-column>
          <el-table-column label="上行文件" width="120">
            <template #default="{ row }">
              <span class="soft-tag" :class="row.upload === '已删除' ? 'soft-tag--success' : 'soft-tag--warm'">
                {{ row.upload }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="created" label="创建时间" width="160" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :disabled="row.status === '已删除'" @click="retry(row)">重试</el-button>
              <el-button link type="danger" :disabled="row.status === '已删除'" @click="remove(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
}
@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.retry-warn {
  color: var(--c-accent-dark);
  font-weight: 600;
}
</style>
