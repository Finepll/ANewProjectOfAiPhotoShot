<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { refunds, refundTrend, refundSteps } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient, areaGradient } from '../utils/chartTheme'

const list = ref(refunds.map((item) => ({ ...item })))
const statusFilter = ref('全部')

const statusOptions = ['全部', '待初审', '待复核', '已打款', '已驳回']

const filtered = computed(() =>
  list.value.filter((item) => statusFilter.value === '全部' || item.status === statusFilter.value)
)

const stats = computed(() => [
  { key: 'first', label: '待初审', value: list.value.filter((i) => i.status === '待初审').length, unit: '笔', icon: 'DocumentChecked', tone: 'primary', delta: 1, hint: '客服处理' },
  { key: 'review', label: '待主管复核', value: list.value.filter((i) => i.status === '待复核').length, unit: '笔', icon: 'UserFilled', tone: 'accent', delta: 2, hint: '金额 ≥ 100 元' },
  { key: 'amount', label: '本月退款金额', value: 3862, unit: '元', icon: 'Money', tone: 'warm', delta: -4.6, invert: true, hint: '较上月' },
  { key: 'rate', label: '退款率', value: 1.24, unit: '%', digits: 2, icon: 'TrendCharts', tone: 'light', delta: -0.3, invert: true, hint: '行业均值 2.1%' }
])

const trendOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...legendBase, top: 0, right: 8, data: ['退款金额（元）', '退款率（%）'] },
  grid: { ...gridBase, top: 42, right: 46 },
  xAxis: { ...catAxis, data: refundTrend.days },
  yAxis: [
    { ...valAxis, name: '元', nameTextStyle: { color: C_SUB, fontSize: 11 } },
    { ...valAxis, name: '%', splitLine: { show: false }, nameTextStyle: { color: C_SUB, fontSize: 11 } }
  ],
  series: [
    {
      name: '退款金额（元）',
      type: 'bar',
      barWidth: 14,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#DFB199') },
      data: refundTrend.amount
    },
    {
      name: '退款率（%）',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbolSize: 6,
      lineStyle: { width: 2.4, color: PALETTE[1] },
      areaStyle: { color: areaGradient('#D48982', 0.18, 0.01) },
      data: refundTrend.rate
    }
  ]
}))

const reasonOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 笔（{d}%）' },
  legend: { ...legendBase, orient: 'vertical', right: 6, top: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['50%', '74%'],
      center: ['36%', '50%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      data: [
        { name: '误购 / 重复购买', value: 18 },
        { name: '效果与预览不符', value: 12 },
        { name: '生成失败未补偿', value: 7 },
        { name: '其他', value: 5 }
      ]
    }
  ]
}))

/* ---------------- 审批 / 驳回 ---------------- */
const review = reactive({ visible: false, row: null, action: 'approve', reason: '', recycle: true })

function openReview(row, action) {
  review.row = row
  review.action = action
  review.reason = ''
  review.recycle = true
  review.visible = true
}

function submitReview() {
  if (!review.reason.trim()) {
    ElMessage.warning(review.action === 'approve' ? '审批通过必须填写审批意见' : '驳回必须填写驳回理由')
    return
  }
  const row = list.value.find((item) => item.id === review.row.id)
  if (review.action === 'approve') {
    row.status = row.amount >= 100 ? '待复核' : '已打款'
    row.step = Math.min(5, row.step + 2)
    row.operator = '当前管理员'
    ElMessage.success(
      row.amount >= 100 ? '已提交主管复核（金额 ≥ 100 元需二级审批）' : '审批通过，已提交财务原路退回'
    )
  } else {
    row.status = '已驳回'
    row.operator = '当前管理员'
    ElMessage.success('已驳回，理由将同步给用户与客服')
  }
  review.visible = false
}

/* ---------------- 审批链路 ---------------- */
const chain = reactive({ visible: false, row: null })

function openChain(row) {
  chain.row = row
  chain.visible = true
}

function statusType(status) {
  if (status === '已打款') return 'soft-tag--success'
  if (status === '已驳回') return 'soft-tag--mute'
  if (status === '待复核') return 'soft-tag--warm'
  return 'soft-tag--primary'
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="退款与售后处理"
      feature="F-ADM-07"
      desc="审批 / 驳回均必填理由，退款流水与权益回收同步记录；金额 ≥ 100 元或已使用权益需主管复核，审批链路全程可追溯。"
      :tags="['必填理由', '二级复核', '权益回收']"
    >
      <template #actions>
        <el-select v-model="statusFilter" style="width: 140px">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </template>
    </PageHeader>

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
          <div class="ap-card__title">近 14 天退款金额与退款率</div>
          <span class="ap-muted">退款率 = 退款单 / 支付成功单</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="trendOption" :height="286" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">退款原因分布</div>
          <span class="soft-tag soft-tag--warm">近 30 天</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="reasonOption" :height="286" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">退款申请</div>
        <span class="ap-muted">共 {{ filtered.length }} 笔</span>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column prop="id" label="退款单号" width="160">
            <template #default="{ row }"><span class="mono">{{ row.id }}</span></template>
          </el-table-column>
          <el-table-column prop="order" label="关联订单" width="160">
            <template #default="{ row }"><span class="mono">{{ row.order }}</span></template>
          </el-table-column>
          <el-table-column prop="user" label="用户（脱敏）" width="130" />
          <el-table-column prop="plan" label="规格" width="130" />
          <el-table-column label="金额" width="100">
            <template #default="{ row }"><span class="num">¥ {{ row.amount.toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column prop="reason" label="申请理由" min-width="190" show-overflow-tooltip />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="soft-tag" :class="statusType(row.status)">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="applyAt" label="申请时间" width="160" />
          <el-table-column prop="operator" label="处理人" width="110" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openChain(row)">链路</el-button>
              <el-button
                link
                type="success"
                :disabled="!['待初审', '待复核'].includes(row.status)"
                @click="openReview(row, 'approve')"
              >
                审批
              </el-button>
              <el-button
                link
                type="danger"
                :disabled="!['待初审', '待复核'].includes(row.status)"
                @click="openReview(row, 'reject')"
              >
                驳回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="review.visible"
      :title="review.action === 'approve' ? '退款审批' : '驳回退款申请'"
      width="520px"
    >
      <el-form label-width="96px">
        <el-form-item label="退款单号">
          <span class="mono">{{ review.row?.id }}</span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="num amount">¥ {{ review.row?.amount.toFixed(2) }}</span>
          <span v-if="review.row?.amount >= 100" class="soft-tag soft-tag--warm" style="margin-left: 10px">
            超过 100 元，需主管复核
          </span>
        </el-form-item>
        <el-form-item :label="review.action === 'approve' ? '审批意见' : '驳回理由'" required>
          <el-input
            v-model="review.reason"
            type="textarea"
            :rows="3"
            maxlength="140"
            show-word-limit
            :placeholder="
              review.action === 'approve'
                ? '例如：核实用户未使用权益，同意原路退回'
                : '例如：权益已使用且生成成功，不符合退款条件'
            "
          />
        </el-form-item>
        <el-form-item v-if="review.action === 'approve'" label="权益回收">
          <el-switch v-model="review.recycle" active-text="回收未使用权益" inactive-text="保留权益" inline-prompt />
        </el-form-item>
        <el-form-item v-if="review.action === 'approve'" label="退款去向">
          <span class="ap-muted">原路退回（微信支付渠道，1-3 个工作日到账）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="review.visible = false">取消</el-button>
        <el-button :type="review.action === 'approve' ? 'primary' : 'danger'" @click="submitReview">
          {{ review.action === 'approve' ? '提交审批' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批链路 -->
    <el-drawer v-model="chain.visible" title="审批链路与退款流水" size="460px">
      <div v-if="chain.row" class="chain">
        <div class="chain__head">
          <span class="mono">{{ chain.row.id }}</span>
          <span class="soft-tag" :class="statusType(chain.row.status)">{{ chain.row.status }}</span>
        </div>
        <div class="chain__meta">
          <div><span>关联订单</span><span class="mono">{{ chain.row.order }}</span></div>
          <div><span>用户</span><span>{{ chain.row.user }}</span></div>
          <div><span>规格 / 金额</span><span>{{ chain.row.plan }} · ¥ {{ chain.row.amount.toFixed(2) }}</span></div>
          <div><span>申请理由</span><span>{{ chain.row.reason }}</span></div>
          <div><span>申请时间</span><span>{{ chain.row.applyAt }}</span></div>
        </div>
        <el-divider content-position="left">审批链路</el-divider>
        <el-steps direction="vertical" :active="chain.row.step" finish-status="success" process-status="process">
          <el-step v-for="step in refundSteps" :key="step.title" :title="step.title" :description="step.desc" />
        </el-steps>
        <el-divider content-position="left">退款流水</el-divider>
        <div class="flow">
          <div class="flow__row">
            <span class="flow__dot"></span>
            <div>
              <div>申请提交</div>
              <div class="ap-muted">{{ chain.row.applyAt }} · 用户端</div>
            </div>
          </div>
          <div v-if="chain.row.step >= 2" class="flow__row">
            <span class="flow__dot"></span>
            <div>
              <div>客服初审</div>
              <div class="ap-muted">2026-10-10 09:58 · 客服·王琪</div>
            </div>
          </div>
          <div v-if="chain.row.step >= 3" class="flow__row">
            <span class="flow__dot"></span>
            <div>
              <div>主管复核</div>
              <div class="ap-muted">2026-10-10 10:12 · 主管·赵宁</div>
            </div>
          </div>
          <div v-if="chain.row.step >= 4" class="flow__row">
            <span class="flow__dot"></span>
            <div>
              <div>财务打款</div>
              <div class="ap-muted">渠道流水 4200002288202610920</div>
            </div>
          </div>
          <div v-if="chain.row.step >= 5" class="flow__row">
            <span class="flow__dot"></span>
            <div>
              <div>权益回收</div>
              <div class="ap-muted">已回收未使用权益并写入账单流水</div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
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

.amount {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-accent-dark);
}

.chain__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--c-border);
}

.chain__meta {
  margin: 14px 0 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.chain__meta > div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.chain__meta > div > span:first-child {
  color: var(--c-text-sub);
}

.flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
}

.flow__dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 3px var(--c-primary-soft);
  flex: none;
}
</style>
