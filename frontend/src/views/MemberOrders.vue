<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { orders, orderTrend, channelDist, reconciliation, dateKey, todayStats, plans, planGrant } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient, areaGradient } from '../utils/chartTheme'

const list = ref(orders.map((item) => ({ ...item })))
const keyword = ref('')
const statusFilter = ref('全部')
const channelFilter = ref('全部')
const dateRange = ref([])
const tab = ref('list')

/* 「已退款」必须在这里出现：退款单打完款后订单就是这个状态，
   漏了它这些订单在列表里既筛不出来、也没有专属配色，只能落到兜底的灰色里 */
const statusOptions = ['全部', '已支付', '已退款', '退款中', '待支付', '支付超时', '已关闭']
const channelOptions = ['全部', '微信支付', 'Apple 内购', '支付宝']

const filtered = computed(() => {
  /* 日期区间原先只绑在控件上、没有参与过滤；这里按「下单日期」做闭区间比较 */
  const range = dateRange.value
  const from = Array.isArray(range) && range.length === 2 ? dateKey(range[0]) : null
  const to = Array.isArray(range) && range.length === 2 ? dateKey(range[1]) : null
  return list.value.filter((item) => {
    const matchKeyword = !keyword.value || item.id.includes(keyword.value) || item.user.includes(keyword.value)
    const matchStatus = statusFilter.value === '全部' || item.status === statusFilter.value
    const matchChannel = channelFilter.value === '全部' || item.channel === channelFilter.value
    const day = item.created.slice(0, 10)
    const matchDate = !from || (day >= from && day <= to)
    return matchKeyword && matchStatus && matchChannel && matchDate
  })
})

/* 三项取自 todayStats（看板「今日会员收入」读的是同一个数）。
   成功率原先写死 91.6：同一条 hint 里写着「支付成功 88 单」，
   而 88 / 96 = 91.67，四舍五入是 91.7——卡片和它自己的说明对不上。
   改成从两个真实计数算出来，改数字时不用记着还有第三个地方要同步。 */
const stats = computed(() => [
  { key: 'gmv', label: '今日 GMV', value: todayStats.gmv, unit: '元', icon: 'Money', tone: 'primary', delta: 12.8, hint: '含单次包' },
  { key: 'count', label: '今日订单', value: todayStats.orders, unit: '单', icon: 'Tickets', tone: 'light', delta: 6.4, hint: `支付成功 ${todayStats.paidOrders} 单` },
  {
    key: 'rate',
    label: '支付成功率',
    value: Number(((todayStats.paidOrders / todayStats.orders) * 100).toFixed(1)),
    unit: '%',
    icon: 'CircleCheckFilled',
    tone: 'warm',
    digits: 1,
    delta: 1.2,
    hint: '近 24 小时'
  },
  { key: 'abnormal', label: '异常 / 待处理单', value: list.value.filter((item) => item.abnormal).length, unit: '单', icon: 'WarningFilled', tone: 'accent', delta: -2, invert: true, hint: '需人工核对' }
])

const gmvOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...legendBase, top: 0, right: 8, data: ['GMV（元）', '订单量（单）'] },
  grid: { ...gridBase, top: 42, right: 46 },
  xAxis: { ...catAxis, data: orderTrend.days },
  yAxis: [
    { ...valAxis, name: '元', nameTextStyle: { color: C_SUB, fontSize: 11 } },
    { ...valAxis, name: '单', splitLine: { show: false }, nameTextStyle: { color: C_SUB, fontSize: 11 } }
  ],
  series: [
    {
      name: 'GMV（元）',
      type: 'bar',
      barWidth: 14,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#99B6B4') },
      data: orderTrend.gmv
    },
    {
      name: '订单量（单）',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbolSize: 7,
      lineStyle: { width: 2.4 },
      areaStyle: { color: areaGradient('#D48982', 0.2, 0.01) },
      data: orderTrend.orders
    }
  ]
}))

const channelOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c}%' },
  legend: { ...legendBase, bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['50%', '74%'],
      center: ['50%', '44%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { color: C_SUB, fontSize: 11, formatter: '{b}\n{d}%' },
      data: channelDist
    }
  ]
}))

/* ---------------- 人工补发 ---------------- */
const deliveryDialog = reactive({ visible: false, row: null, remark: '', grant: '' })

/* 可补发的权益取自规格表，标签直接念规格自己的 grant——
   原先这个下拉框只有「30 张（月卡）/ 90 张（季卡）/ 10 张（单次包）」三个写死的选项，
   季卡其实发 90 天而不是 90 张，年卡 365 天干脆没有对应选项。 */
const grantOptions = plans.map((item) => ({ label: `${item.name} · ${item.grant}`, value: item.grant }))

function openDelivery(row) {
  deliveryDialog.row = row
  deliveryDialog.remark = ''
  /* 默认值跟着订单自己的规格走：原先无论哪一单都默认「额度 30 张（月卡权益）」，
     给一张年卡订单补发，弹窗一打开就预选了月卡的权益。 */
  deliveryDialog.grant = planGrant(row.plan)
  deliveryDialog.visible = true
}

function submitDelivery() {
  if (!deliveryDialog.remark.trim()) {
    ElMessage.warning('人工补发必须填写备注，用于账单与审计追溯')
    return
  }
  const row = list.value.find((item) => item.id === deliveryDialog.row.id)
  /* 补发只补「权益」，不改支付状态：原先把 status 一律写成「已支付」，
     会让支付超时 / 已关闭 / 待支付的单子在列表里变成已支付，与渠道流水号（-）自相矛盾。 */
  row.delivered = true
  /* 选了什么就发什么，并把它记到这一行上：原先 submitDelivery 根本没读这个下拉框，
     无论选 10 张还是 90 张，提示都是同一句，权益也没有落到订单上。 */
  row.grant = deliveryDialog.grant
  ElMessage.success(
    `已为 ${row.id} 补发权益「${deliveryDialog.grant}」，账单流水已记录`
    + `（支付状态保持「${row.status}」不变）`
  )
  deliveryDialog.visible = false
}

/* ---------------- 标记异常 ---------------- */
async function markAbnormal(row) {
  try {
    await ElMessageBox.confirm(
      `标记后该订单将进入「待核对」队列，需在按日对账中处理。确认标记 ${row.id}？`,
      '标记异常订单',
      { type: 'warning', confirmButtonText: '确认标记', cancelButtonText: '取消' }
    )
    row.abnormal = true
    ElMessage.success('已标记为异常订单')
  } catch (e) {
    /* 取消 */
  }
}

function refund(row) {
  ElMessage.info(`订单 ${row.id} 的退款需在「退款与售后」中由客服提交申请（F-ADM-07）`)
}

/* ---------------- 订单详情 ---------------- */
const detail = reactive({ visible: false, row: null })

function openDetail(row) {
  detail.row = row
  detail.visible = true
}

/* el-steps 的 :active = 已走完的步数（0 起算的那一步是「进行中」）。
   原先只有「已支付 → 4，其余 → 2」两档，两头都错：
   待支付被算成已经走完「支付中」，而退款已经打款到账的单子反而退回第 2 步。
   未付款就终结的三种状态一律停在第 1 步之后——它们只走完了「下单」，
   把「支付中」也标绿等于说支付成功过。 */
const STEP_ACTIVE = {
  待支付: 1,
  支付超时: 1,
  已关闭: 1,
  已支付: 4,
  退款中: 4,
  已退款: 4
}

function stepActive(status) {
  return STEP_ACTIVE[status] ?? 1
}

function statusType(status) {
  /* 「已退款」用中性的主色，和绿色（已支付）、灰色（已关闭/超时）都分得开：
     它是钱已退出的终态，既不是成功也不是无效单。 */
  if (status === '已退款') return 'soft-tag--primary'
  if (status === '已支付') return 'soft-tag--success'
  if (status === '退款中') return 'soft-tag--accent'
  if (status === '待支付') return 'soft-tag--warm'
  return 'soft-tag--mute'
}
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="订单与账单管理"
      feature="F-ADM-06"
      desc="订单查询、渠道流水号对照、异常单标记与人工补发、按日对账视图；支付状态机由 F-SRV-04 维护，后台仅做处置与追溯。"
      :tags="['渠道流水', '人工补发', '按日对账']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo：对账文件导出需对接渠道账单接口')">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 6px">导出对账</span>
        </el-button>
        <el-button type="primary" @click="tab = tab === 'recon' ? 'list' : 'recon'">
          <el-icon><DataAnalysis /></el-icon>
          <span style="margin-left: 6px">{{ tab === 'recon' ? '返回订单列表' : '按日对账视图' }}</span>
        </el-button>
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
          <div class="ap-card__title">近 14 天 GMV 与订单量</div>
          <span class="ap-muted">单位：元 / 单</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="gmvOption" :height="286" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">支付渠道占比</div>
          <span class="soft-tag soft-tag--primary">微信小程序为主</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="channelOption" :height="286" />
        </div>
      </div>
    </div>

    <div v-if="tab === 'list'" class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">订单列表</div>
        <div class="ap-toolbar">
          <el-input v-model="keyword" placeholder="搜索订单号 / 手机号" clearable style="width: 220px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="statusFilter" style="width: 130px">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="channelFilter" style="width: 140px">
            <el-option v-for="item in channelOptions" :key="item" :label="item" :value="item" />
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
          <el-table-column prop="id" label="订单号" width="170">
            <template #default="{ row }">
              <span class="mono">{{ row.id }}</span>
              <span v-if="row.abnormal" class="soft-tag soft-tag--accent" style="margin-left: 6px">异常</span>
            </template>
          </el-table-column>
          <el-table-column prop="user" label="用户（脱敏）" width="130" />
          <el-table-column prop="plan" label="规格" min-width="130" />
          <el-table-column label="金额" width="100">
            <template #default="{ row }">
              <span class="num">¥ {{ row.amount.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <!-- 优惠是金额旁边的独立一列，不并进「金额」。
               本页已有三条对账口径（金额 / 平台记账 / 渠道账单），再引入一个
               「实付」会让对账视图的差异算不清该以哪个为准；
               单列展示减免额，amount 的口径就完全不用动。 -->
          <el-table-column label="优惠" width="110">
            <template #default="{ row }">
              <span v-if="row.discount" class="num discount">- ¥ {{ row.discount.toFixed(2) }}</span>
              <span v-else class="ap-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="channel" label="渠道" width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span class="soft-tag" :class="statusType(row.status)">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="渠道流水号" min-width="190">
            <template #default="{ row }">
              <span class="mono" :class="{ 'text-mute': row.tradeNo === '-' }">{{ row.tradeNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="created" label="下单时间" width="160" />
          <el-table-column label="权益" width="96">
            <template #default="{ row }">
              <span class="soft-tag" :class="row.delivered ? 'soft-tag--success' : 'soft-tag--mute'">
                {{ row.delivered ? '已发放' : '未发放' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button link type="warning" :disabled="row.abnormal" @click="markAbnormal(row)">标记异常</el-button>
              <el-button link type="success" :disabled="row.delivered" @click="openDelivery(row)">人工补发</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="没有符合条件的订单" />
          </template>
        </el-table>
      </div>
    </div>

    <div v-else class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">按日对账视图</div>
        <span class="soft-tag soft-tag--warm">平台金额 vs 渠道金额</span>
      </div>
      <div class="ap-card__body">
        <el-table :data="reconciliation" stripe :row-class-name="({ row }) => (row.diff !== 0 ? 'row-diff' : '')">
          <el-table-column prop="day" label="日期" width="140" />
          <el-table-column label="平台记账金额" min-width="150">
            <template #default="{ row }"><span class="num">¥ {{ row.platform.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column label="渠道账单金额" min-width="150">
            <template #default="{ row }"><span class="num">¥ {{ row.channel.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column label="差异" width="120">
            <template #default="{ row }">
              <span class="num" :class="row.diff === 0 ? 'diff-ok' : 'diff-bad'">
                {{ row.diff === 0 ? '一致' : `¥ ${row.diff}` }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="处理状态" min-width="220">
            <template #default="{ row }">
              <span v-if="row.diff === 0" class="soft-tag soft-tag--success">无需处理</span>
              <span v-else class="soft-tag soft-tag--accent">{{ row.note }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button v-if="row.diff !== 0" link type="primary" @click="ElMessage.info('已创建对账差异工单，等待财务核对')">
                创建工单
              </el-button>
              <span v-else class="ap-muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 订单详情 -->
    <el-drawer v-model="detail.visible" title="订单详情" size="440px">
      <div v-if="detail.row" class="detail">
        <div class="detail__row"><span>订单号</span><span class="mono">{{ detail.row.id }}</span></div>
        <div class="detail__row"><span>用户</span><span>{{ detail.row.user }}</span></div>
        <div class="detail__row"><span>会员规格</span><span>{{ detail.row.plan }}</span></div>
        <div class="detail__row"><span>金额</span><span class="num">¥ {{ detail.row.amount.toFixed(2) }}</span></div>
        <div class="detail__row"><span>支付渠道</span><span>{{ detail.row.channel }}</span></div>
        <div class="detail__row"><span>订单状态</span><span>{{ detail.row.status }}</span></div>
        <div class="detail__row"><span>渠道流水号</span><span class="mono">{{ detail.row.tradeNo }}</span></div>
        <div class="detail__row"><span>下单时间</span><span>{{ detail.row.created }}</span></div>
        <!-- 退过款的单子权益是被回收的，写「未发放」会让客服以为从没发过 -->
        <div class="detail__row">
          <span>权益发放</span>
          <span>{{ detail.row.status === '已退款' ? '已回收' : detail.row.delivered ? '已发放' : '未发放' }}</span>
        </div>
        <el-divider content-position="left">状态机流转</el-divider>
        <el-steps direction="vertical" :active="stepActive(detail.row.status)" finish-status="success">
          <el-step title="下单" description="生成预付单" />
          <el-step title="支付中" description="调起微信支付" />
          <el-step title="已支付" description="回调验签通过" />
          <el-step title="权益入账" description="发放额度 / 会员有效期" />
        </el-steps>
        <div class="detail__actions">
          <!-- 已经退过款的单子不能再发起退款：钱已经出去了，
               之前这个按钮对已退款订单照样可点，点完只弹一句「请到退款页提交申请」 -->
          <el-button
            type="danger"
            plain
            :disabled="detail.row.status === '已退款'"
            @click="refund(detail.row)"
          >
            发起退款
          </el-button>
          <el-button type="primary" plain @click="openDelivery(detail.row)">人工补发</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 人工补发 -->
    <el-dialog v-model="deliveryDialog.visible" title="人工补发权益" width="480px">
      <el-form label-width="96px">
        <el-form-item label="订单号">
          <span class="mono">{{ deliveryDialog.row?.id }}</span>
        </el-form-item>
        <el-form-item label="补发内容">
          <el-select v-model="deliveryDialog.grant" style="width: 100%">
            <el-option
              v-for="item in grantOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="补发备注" required>
          <el-input
            v-model="deliveryDialog.remark"
            type="textarea"
            :rows="3"
            maxlength="120"
            show-word-limit
            placeholder="例如：用户支付成功但未收到权益，客服核实后补发"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deliveryDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitDelivery">确认补发</el-button>
      </template>
    </el-dialog>
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

.text-mute {
  color: var(--c-text-mute);
}

/* 与对账视图「差异为 0」用同一个绿：这一页里绿色已经被读作「钱对得上」，
   减免额也是「用户少付了」，不再引第二个绿值出来 */
.discount {
  color: #668268;
}

.diff-ok {
  color: #668268;
}

.diff-bad {
  color: var(--c-accent-dark);
  font-weight: 600;
}

:deep(.row-diff) {
  background: #fdf6f5 !important;
}

.detail__row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--c-border);
  font-size: 13px;
}

.detail__row > span:first-child {
  color: var(--c-text-sub);
}

.detail__actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}
</style>
