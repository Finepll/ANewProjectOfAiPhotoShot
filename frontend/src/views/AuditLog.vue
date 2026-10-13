<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { auditLogs, auditTypes, auditTypeDist, auditTrend } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient, areaGradient } from '../utils/chartTheme'

const list = ref(auditLogs.map((item) => ({ ...item })))
const keyword = ref('')
const typeFilter = ref('全部')
const resultFilter = ref('全部')
const dateRange = ref([])

const filtered = computed(() =>
  list.value.filter((item) => {
    const matchKeyword =
      !keyword.value || item.account.includes(keyword.value) || item.name.includes(keyword.value) || item.target.includes(keyword.value)
    const matchType = typeFilter.value === '全部' || item.type === typeFilter.value
    const matchResult = resultFilter.value === '全部' || item.result === resultFilter.value
    return matchKeyword && matchType && matchResult
  })
)

const typeOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 次（{d}%）' },
  legend: { ...legendBase, orient: 'vertical', right: 6, top: 'center', itemGap: 11 },
  series: [
    {
      type: 'pie',
      radius: ['50%', '74%'],
      center: ['36%', '50%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: true, label: { show: true, formatter: '{b}\n{c} 次', fontSize: 12, color: '#2F3E3D' } },
      data: auditTypeDist
    }
  ]
}))

const trendOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis' },
  grid: { ...gridBase, top: 24 },
  xAxis: { ...catAxis, data: auditTrend.days, boundaryGap: false },
  yAxis: { ...valAxis, name: '次', nameTextStyle: { color: C_SUB, fontSize: 11 } },
  series: [
    {
      name: '操作次数',
      type: 'line',
      smooth: true,
      symbolSize: 6,
      lineStyle: { width: 2.6 },
      areaStyle: { color: areaGradient('#99B6B4') },
      data: auditTrend.counts
    }
  ]
}))

const resultCount = computed(() => ({
  total: list.value.length,
  failed: list.value.filter((item) => item.result === '失败').length
}))

function exportLogs() {
  ElMessage.info('演示 Demo：正式环境按筛选条件导出脱敏审计日志（保留 180 天）')
}

function resultType(result) {
  return result === '成功' ? 'soft-tag--success' : 'soft-tag--accent'
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="操作审计"
      feature="F-ADM-03"
      desc="模板上下架、额度调整、退款审批、会员规格变更与登录行为全量留痕；支持按操作人、类型、结果筛选，日志保留 180 天。"
      :tags="['全量留痕', '180 天保留', '可导出']"
    >
      <template #actions>
        <el-button @click="exportLogs">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 6px">导出日志</span>
        </el-button>
      </template>
    </PageHeader>

    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">操作类型分布</div>
          <span class="ap-muted">近 7 天共 584 次操作</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="typeOption" :height="272" clickable @chart-click="(p) => ElMessage.info(`${p.name}：${p.value} 次`)" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">近 7 天操作趋势</div>
          <span class="soft-tag" :class="resultCount.failed ? 'soft-tag--accent' : 'soft-tag--success'">
            失败 {{ resultCount.failed }} 条
          </span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="trendOption" :height="272" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">审计日志</div>
        <div class="ap-toolbar">
          <el-input v-model="keyword" placeholder="搜索操作人 / 对象" clearable style="width: 210px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="typeFilter" style="width: 160px">
            <el-option v-for="item in auditTypes" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="resultFilter" style="width: 110px">
            <el-option label="全部" value="全部" />
            <el-option label="成功" value="成功" />
            <el-option label="失败" value="失败" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="→"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </div>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="detail">
                <div class="detail__row"><span>操作详情</span><span>{{ row.detail }}</span></div>
                <div class="detail__row"><span>来源 IP</span><span class="mono">{{ row.ip }}</span></div>
                <div class="detail__row"><span>日志编号</span><span class="mono">{{ row.id }}</span></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="时间" width="170" />
          <el-table-column prop="account" label="操作人" width="120">
            <template #default="{ row }">
              <span class="mono">{{ row.account }}</span>
              <span class="ap-muted"> · {{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="role" label="角色" width="120" />
          <el-table-column label="操作类型" width="150">
            <template #default="{ row }">
              <span class="soft-tag soft-tag--primary">{{ row.type }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="target" label="操作对象" min-width="200" show-overflow-tooltip />
          <el-table-column label="结果" width="100">
            <template #default="{ row }">
              <span class="soft-tag" :class="resultType(row.result)">{{ row.result }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ip" label="来源 IP" width="130">
            <template #default="{ row }"><span class="mono">{{ row.ip }}</span></template>
          </el-table-column>
          <template #empty>
            <el-empty description="没有符合条件的审计记录" />
          </template>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.detail {
  padding: 8px 16px 12px 44px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
}

.detail__row {
  display: flex;
  gap: 12px;
}

.detail__row > span:first-child {
  color: var(--c-text-sub);
  width: 70px;
  flex: none;
}
</style>
