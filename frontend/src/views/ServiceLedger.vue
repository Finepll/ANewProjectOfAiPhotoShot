<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { stateMachine, ledgerFlows, stateDist, lastDays, wave } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, areaGradient } from '../utils/chartTheme'

const list = ref(ledgerFlows.map((item) => ({ ...item })))
const typeFilter = ref('全部')

const typeOptions = ['全部', '权益入账', '权益冻结', '权益回收', '订单关闭']

const filtered = computed(() =>
  list.value.filter((item) => typeFilter.value === '全部' || item.type === typeFilter.value)
)

const stateDistOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 单（{d}%）' },
  legend: { ...legendBase, orient: 'vertical', right: 6, top: 'center', itemGap: 12 },
  series: [
    {
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['36%', '50%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: true, label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#2F3E3D' } },
      data: stateDist
    }
  ]
}))

const grantTrend = computed(() => {
  const days = lastDays(14)
  const grants = wave(14, 96, 34, 3.1)
  const recycles = wave(14, 14, 10, 4.4)
  return { days, grants, recycles }
})

const grantOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis' },
  legend: { ...legendBase, top: 0, right: 8, data: ['权益入账', '权益回收'] },
  grid: { ...gridBase, top: 42 },
  xAxis: { ...catAxis, data: grantTrend.value.days, boundaryGap: false },
  yAxis: { ...valAxis, name: '笔', nameTextStyle: { color: C_SUB, fontSize: 11 } },
  series: [
    {
      name: '权益入账',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.6 },
      areaStyle: { color: areaGradient('#99B6B4') },
      data: grantTrend.value.grants
    },
    {
      name: '权益回收',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.2, color: PALETTE[1] },
      areaStyle: { color: areaGradient('#D48982', 0.2, 0.01) },
      data: grantTrend.value.recycles
    }
  ]
}))

function statusType(status) {
  if (status === '成功') return 'soft-tag--success'
  if (status === '处理中') return 'soft-tag--primary'
  return 'soft-tag--mute'
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="支付与权益流水"
      feature="F-SRV-04 / 05"
      desc="服务端订单状态机与权益入账账单的只读视图，用于运营核对；写入逻辑由服务端负责，后台不提供直接修改入口。"
      :tags="['只读视图', '状态机', '权益账单']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo：账单流水由 F-SRV-05 权益入账与账单服务写入')">
          <el-icon><InfoFilled /></el-icon>
          <span style="margin-left: 6px">口径说明</span>
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="只读提示"
      description="本页仅展示服务端写入结果。订单状态变更、权益发放与回收均由 F-SRV-04 / F-SRV-05 负责，任何人工干预需通过「订单与账单」「退款与售后」流程发起并留痕。"
    />

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">订单状态机</div>
        <span class="soft-tag soft-tag--primary">F-SRV-04</span>
      </div>
      <div class="ap-card__body">
        <div class="machine">
          <template v-for="(step, index) in stateMachine" :key="step.key">
            <div class="machine__node">
              <div class="machine__key mono">{{ step.key }}</div>
              <div class="machine__title">{{ step.title }}</div>
              <div class="machine__desc">{{ step.desc }}</div>
            </div>
            <div v-if="index < stateMachine.length - 1" class="machine__arrow">
              <el-icon :size="16"><Right /></el-icon>
            </div>
          </template>
        </div>
        <p class="ap-muted" style="margin: 14px 0 0">
          说明：CLOSED 为终态，可由「支付超时」或「用户取消」进入；已支付订单进入退款流程时冻结权益但不回收，打款成功后执行权益回收。
        </p>
      </div>
    </div>

    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">近 14 天权益入账 / 回收</div>
          <span class="ap-muted">单位：笔</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="grantOption" :height="286" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">订单状态分布</div>
          <span class="ap-muted">近 30 天</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="stateDistOption" :height="286" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">权益账单流水</div>
        <div class="ap-toolbar">
          <el-select v-model="typeFilter" style="width: 150px">
            <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column prop="id" label="流水号" width="170">
            <template #default="{ row }"><span class="mono">{{ row.id }}</span></template>
          </el-table-column>
          <el-table-column prop="order" label="关联订单" width="170">
            <template #default="{ row }"><span class="mono">{{ row.order }}</span></template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="amount" label="变更内容" min-width="140" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="soft-tag" :class="statusType(row.status)">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="写入时间" width="170" />
          <el-table-column prop="operator" label="写入方" width="120">
            <template #default="{ row }"><span class="mono">{{ row.operator }}</span></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
}
@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.machine {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}

.machine__node {
  flex: 1 1 168px;
  min-width: 150px;
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  background: linear-gradient(160deg, #f7fbfa, #ffffff);
  transition: all 0.25s ease;
}

.machine__node:hover {
  transform: translateY(-4px);
  border-color: var(--c-primary-light);
  box-shadow: var(--sh-2);
}

.machine__key {
  color: var(--c-primary-deep);
  font-size: 11px;
  letter-spacing: 0.4px;
}

.machine__title {
  font-size: 15px;
  font-weight: 600;
  margin: 4px 0 4px;
}

.machine__desc {
  font-size: 12px;
  color: var(--c-text-sub);
  line-height: 1.5;
}

.machine__arrow {
  display: grid;
  place-items: center;
  color: var(--c-primary-light);
}

@media (max-width: 760px) {
  .machine__arrow {
    display: none;
  }
}
</style>
