<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { refunds, refundTrend, refundSteps, refundReasons, REFUND_TOTAL_30D, sumThisMonth, todayStamp } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient, areaGradient } from '../utils/chartTheme'

/* flow / skipped 是嵌套数组，必须逐层复制：
   只做浅拷贝的话 {...item} 里的 flow 仍指向 mock 源数组，
   审批时 push 的流水会写回模块级数据，下次进入本页状态已复位、流水却还留着。 */
const list = ref(
  refunds.map((item) => ({
    ...item,
    flow: item.flow.map((ev) => ({ ...ev })),
    skipped: [...(item.skipped || [])]
  }))
)
const statusFilter = ref('全部')

const statusOptions = ['全部', '待初审', '待复核', '已打款', '已驳回']

const filtered = computed(() =>
  list.value.filter((item) => statusFilter.value === '全部' || item.status === statusFilter.value)
)

/* 四项指标全部从数据算出来：
   - 「本月退款金额」原先写死 3862，而按同屏那张趋势图的 10 月各日金额相加是 3367；
   - 「退款率」原先写死 1.24%，趋势图末点画的是 1.40%——
     卡片和它旁边的曲线在同一天给出两个数，看的人不知道该信哪个；
   - 「待主管复核」的说明原先写「金额 ≥ 100 元」，而判定函数还有第二个条件
     （权益已使用），19 元却卡在待复核的单子点开来看不出原因。 */
const stats = computed(() => [
  { key: 'first', label: '待初审', value: list.value.filter((i) => i.status === '待初审').length, unit: '笔', icon: 'DocumentChecked', tone: 'primary', delta: 1, hint: '客服处理' },
  { key: 'review', label: '待主管复核', value: list.value.filter((i) => i.status === '待复核').length, unit: '笔', icon: 'UserFilled', tone: 'accent', delta: 2, hint: '金额 ≥ 100 元 或 已用权益' },
  { key: 'amount', label: '本月退款金额', value: sumThisMonth(refundTrend.days, refundTrend.amount), unit: '元', icon: 'Money', tone: 'warm', delta: -4.6, invert: true, hint: '10 月各日合计' },
  {
    key: 'rate',
    label: '退款率',
    value: refundTrend.rate[refundTrend.rate.length - 1],
    unit: '%',
    digits: 2,
    icon: 'TrendCharts',
    tone: 'light',
    delta: -0.3,
    invert: true,
    hint: '行业均值 2.1%'
  }
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
      /* 数据在 mock 里（refundReasons），不在页面配置里写死 */
      data: refundReasons
    }
  ]
}))

/* ---------------- 审批 / 驳回 ---------------- */
/* 阶段号与 refundSteps 的数组下标一一对应（refundSteps[i] 就是第 i+1 步）。
   单据上只存三个量：step（已完成到第几步）、skipped（本单免走的步）、
   rejectedAt（被驳回的步），渲染时由 stepStatus() 合成 el-steps 需要的状态。 */
const STAGE = { APPLY: 1, SERVICE: 2, MANAGER: 3, PAYOUT: 4, RECYCLE: 5 }

const review = reactive({ visible: false, row: null, action: 'approve', reason: '', recycle: true })

/* 二级复核有两条触发条件（金额 ≥ 100 元、或权益已使用），
   判定和提示必须同源：原先弹窗只写 amount >= 100，
   一条 19 元却卡在「待复核」的单子点开来，看不出它为什么需要复核。 */
function needSecondReview(row) {
  if (!row) return ''
  if (row.amount >= 100) return '金额 ≥ 100 元，需主管复核'
  if (row.usedBenefit) return '权益已使用，需主管复核'
  return ''
}

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
  const stamp = todayStamp()

  if (review.action === 'approve') {
    /* 这一步是谁在审，取决于单据当前卡在哪：待初审 = 客服，待复核 = 主管。
       两级审批共用同一个按钮，所以结论必须按当前阶段分流，否则会把主管的复核
       记成客服初审，出现「同一个阶段两条记录」。 */
    const atService = row.status === '待初审'
    const stage = atService ? STAGE.SERVICE : STAGE.MANAGER
    row.flow.push({
      stage,
      title: atService ? '客服初审' : '主管复核',
      detail: `${stamp} · 当前管理员 · ${review.reason}${review.recycle ? ' · 同意回收未使用权益' : ' · 保留用户权益'}`
    })
    row.step = stage
    row.operator = '当前管理员'

    if (atService && needSecondReview(row)) {
      /* 客服通过但仍需二级复核：转主管，此时不能再往下走流水 */
      row.status = '待复核'
      ElMessage.success(`客服初审通过，已提交主管复核（${needSecondReview(row)}）`)
      review.visible = false
      return
    }

    /* 到这里就是终局放款：免复核时客服初审后直接打款，需补记被跳过的第 3 步 */
    if (atService) row.skipped = [...(row.skipped || []), STAGE.MANAGER]
    row.status = '已打款'
    row.step = STAGE.PAYOUT
    row.flow.push({
      stage: STAGE.PAYOUT,
      title: '财务打款',
      detail: `${stamp} · 系统 · 已提交原路退回（${row.channel}），1-3 个工作日到账，渠道回执同步中`
    })
    if (review.recycle) {
      row.step = STAGE.RECYCLE
      row.flow.push({ stage: STAGE.RECYCLE, title: '权益回收', detail: `${stamp} · F-SRV-05 · 已回收未使用权益并写入账单流水` })
    }
    ElMessage.success(review.recycle ? '审批通过，已提交原路退回并回收权益' : '审批通过，已提交原路退回（保留用户权益）')
  } else {
    /* 驳回是终态：记下是在哪一步被驳回的，链路里那一步标红 */
    const stage = row.status === '待复核' ? STAGE.MANAGER : STAGE.SERVICE
    row.status = '已驳回'
    row.rejectedAt = stage
    row.step = Math.max(row.step, stage - 1)
    row.operator = '当前管理员'
    row.flow.push({ stage, title: '驳回', tone: 'error', detail: `${stamp} · 当前管理员 · ${review.reason}` })
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

/* el-steps 每个节点的状态全部由数据推出来，四种情况互斥：
   驳回的阶段标红；本单免走的阶段（金额 < 100 元时的主管复核）留灰；
   已完成的阶段打勾；下一个待办阶段高亮为进行中。
   直接绑 :active="step" 做不到区分——那个数字分不清「还没走到」和「不用走」。 */
function stepStatus(index) {
  const row = chain.row
  if (!row) return 'wait'
  const stage = index + 1
  if (row.rejectedAt === stage) return 'error'
  if (row.skipped?.includes(stage)) return 'wait'
  if (stage <= row.step) return 'finish'
  return stage === row.step + 1 ? 'process' : 'wait'
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

    <div class="kpi-grid kpi-grid--4">
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
          <!-- 口径必须写在界面上：这张饼图是近 30 天全部 {{ REFUND_TOTAL_30D }} 笔，
               下面表格是近期申请样例。两个数字对不上是口径不同，不是数据错，
               但页面上不说清，看的人只会当成 bug。 -->
          <span class="soft-tag soft-tag--warm">近 30 天 · 共 {{ REFUND_TOTAL_30D }} 笔</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="reasonOption" :height="286" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">退款申请</div>
        <span class="ap-muted">近期申请样例 · 显示 {{ filtered.length }} / {{ list.length }} 笔</span>
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
          <!-- 表格已经按状态筛过数据，空态必须自己给：
               不给的话 Element 会渲染英文默认文案，且提示与本页的筛选项无关 -->
          <template #empty>
            <el-empty :description="statusFilter === '全部' ? '暂无退款申请' : `没有「${statusFilter}」状态的退款申请`" />
          </template>
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
          <span v-if="needSecondReview(review.row)" class="soft-tag soft-tag--warm" style="margin-left: 10px">
            {{ needSecondReview(review.row) }}
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
          <div><span>退款渠道</span><span>{{ chain.row.channel }}（原路退回）</span></div>
          <div><span>申请理由</span><span>{{ chain.row.reason }}</span></div>
          <div><span>申请时间</span><span>{{ chain.row.applyAt }}</span></div>
        </div>
        <el-divider content-position="left">审批链路</el-divider>
        <el-steps direction="vertical" :active="chain.row.step" finish-status="success">
          <el-step
            v-for="(step, index) in refundSteps"
            :key="step.title"
            :title="step.title"
            :description="chain.row.skipped?.includes(index + 1) ? `${step.desc}（本单金额 < 100 元，免复核）` : step.desc"
            :status="stepStatus(index)"
          />
        </el-steps>
        <el-divider content-position="left">退款流水</el-divider>
        <div class="flow">
          <div v-for="(ev, index) in chain.row.flow" :key="index" class="flow__row">
            <span class="flow__dot" :class="{ 'flow__dot--error': ev.tone === 'error' }"></span>
            <div>
              <div>{{ ev.title }}</div>
              <div class="ap-muted">{{ ev.detail }}</div>
            </div>
          </div>
          <div v-if="chain.row.flow.length < 2" class="ap-muted flow__hint">
            客服尚未受理，暂无后续流水
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
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

/* 驳回这条流水的圆点跟随标签色，避免和正常节点长得一样 */
.flow__dot--error {
  background: var(--c-accent);
  box-shadow: 0 0 0 3px var(--c-accent-soft);
}

.flow__hint {
  font-size: 12.5px;
  padding-left: 18px;
}
</style>
