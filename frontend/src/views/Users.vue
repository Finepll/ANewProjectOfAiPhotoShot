<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { users, userStats, quotaLogs, userGrowth } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, areaGradient, barGradient } from '../utils/chartTheme'

const list = ref(users.map((item) => ({ ...item })))
const keyword = ref('')
const statusFilter = ref('全部')

const filtered = computed(() =>
  list.value.filter((item) => {
    const matchKeyword =
      !keyword.value || item.phone.includes(keyword.value) || item.nick.includes(keyword.value) || item.id.includes(keyword.value)
    const matchStatus = statusFilter.value === '全部' || item.status === statusFilter.value
    return matchKeyword && matchStatus
  })
)

const stats = computed(() => [
  { key: 'total', label: '累计用户', value: userStats.total, unit: '人', icon: 'UserFilled', tone: 'primary', delta: 8.2, hint: '近 30 天' },
  { key: 'month', label: '本月新增', value: userStats.monthNew, unit: '人', icon: 'TrendCharts', tone: 'light', delta: 12.6, hint: '较上月' },
  { key: 'member', label: '会员用户', value: userStats.member, unit: '人', icon: 'Present', tone: 'warm', delta: 5.4, hint: '付费转化 14.2%' },
  { key: 'banned', label: '封禁中', value: userStats.banned, unit: '人', icon: 'CircleCloseFilled', tone: 'accent', delta: -1.2, invert: true, hint: '含违规合成' }
])

/* ---------------- 额度调整 ---------------- */
const quotaDialog = reactive({ visible: false, row: null, amount: 0, reason: '', flowNo: '' })

function openQuota(row) {
  quotaDialog.row = row
  quotaDialog.amount = 0
  quotaDialog.reason = ''
  quotaDialog.flowNo = `QL${Date.now().toString().slice(-12)}`
  quotaDialog.visible = true
}

function submitQuota() {
  if (!quotaDialog.reason.trim()) {
    ElMessage.warning('额度调整需填写原因，将写入额度流水与操作审计')
    return
  }
  const row = list.value.find((item) => item.id === quotaDialog.row.id)
  row.quota = Math.max(0, row.quota + quotaDialog.amount)
  logs.value.unshift({
    time: '2026-10-10 10:26',
    type: quotaDialog.amount >= 0 ? '人工发放' : '人工扣减',
    amount: quotaDialog.amount,
    balance: row.quota,
    remark: quotaDialog.reason,
    operator: '当前管理员'
  })
  ElMessage.success(`已${quotaDialog.amount >= 0 ? '发放' : '扣减'} ${Math.abs(quotaDialog.amount)} 额度，流水号 ${quotaDialog.flowNo}`)
  quotaDialog.visible = false
}

/* ---------------- 封禁 / 解封 ---------------- */
async function toggleBan(row) {
  const ban = row.status !== '封禁'
  try {
    await ElMessageBox.confirm(
      ban
        ? `封禁后「${row.phone}」将无法登录小程序，已购权益保留但不可使用，确认封禁？`
        : `确认解封「${row.phone}」？解封后需重新同意肖像权协议。`,
      ban ? '封禁账号' : '解封账号',
      { type: 'warning', confirmButtonText: ban ? '确认封禁' : '确认解封', cancelButtonText: '取消' }
    )
    row.status = ban ? '封禁' : '正常'
    ElMessage.success(ban ? '账号已封禁，已写入操作审计' : '账号已解封')
  } catch (e) {
    /* 取消 */
  }
}

/* ---------------- 额度流水 ---------------- */
const logs = ref([...quotaLogs])
const drawer = reactive({ visible: false, row: null })

function openLogs(row) {
  drawer.row = row
  drawer.visible = true
}

const growthOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis' },
  legend: { ...legendBase, top: 0, right: 8, data: ['新增用户', '新增会员'] },
  grid: { ...gridBase, top: 42 },
  xAxis: { ...catAxis, data: userGrowth.days },
  yAxis: { ...valAxis, name: '人', nameTextStyle: { color: C_SUB, fontSize: 11 } },
  series: [
    {
      name: '新增用户',
      type: 'bar',
      barWidth: 14,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#99B6B4') },
      data: userGrowth.newUsers
    },
    {
      name: '新增会员',
      type: 'line',
      smooth: true,
      symbolSize: 6,
      lineStyle: { width: 2.4 },
      areaStyle: { color: areaGradient('#D48982', 0.24, 0.01) },
      data: userGrowth.members.map((v) => v / 3)
    }
  ]
}))

const quotaDistOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 人（{d}%）' },
  legend: { ...legendBase, orient: 'vertical', right: 6, top: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['50%', '74%'],
      center: ['38%', '50%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { show: false },
      data: [
        { name: '额度 0（耗尽）', value: 1240 },
        { name: '额度 1~5', value: 2680 },
        { name: '额度 6~20', value: 3120 },
        { name: '额度 20 以上', value: 1480 }
      ]
    }
  ]
}))
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="用户与额度"
      feature="F-ADM-02"
      desc="用户列表默认脱敏展示手机号；额度调整必须填写原因并生成流水号，封禁 / 解封全过程写入操作审计。"
      :tags="['脱敏展示', '额度流水', '封禁解封']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo 暂不支持导出，正式环境提供脱敏 CSV 导出')">
          <el-icon><Download /></el-icon>
          <span style="margin-left: 6px">导出列表</span>
        </el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid">
      <StatCard
        v-for="item in stats"
        :key="item.key"
        :label="item.label"
        :value="item.value"
        :unit="item.unit"
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
          <div class="ap-card__title">近 14 天用户增长</div>
          <span class="ap-muted">新增用户 / 新增会员</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="growthOption" :height="280" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">剩余额度分布</div>
          <span class="ap-muted">用于评估发放策略</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="quotaDistOption" :height="280" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">用户列表</div>
        <div class="ap-toolbar">
          <el-input v-model="keyword" placeholder="搜索手机号 / 昵称 / 用户ID" clearable style="width: 230px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="statusFilter" style="width: 130px">
            <el-option v-for="item in ['全部', '正常', '额度冻结', '封禁']" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column prop="id" label="用户ID" width="110" />
          <el-table-column prop="phone" label="手机号（脱敏）" width="140" />
          <el-table-column prop="nick" label="昵称" min-width="120" />
          <el-table-column prop="registered" label="注册时间" width="160" />
          <el-table-column label="剩余额度" width="110" sortable :sort-method="(a, b) => a.quota - b.quota">
            <template #default="{ row }">
              <span class="num quota" :class="{ 'quota--low': row.quota <= 1 }">{{ row.quota }}</span>
              <span class="ap-muted"> 张</span>
            </template>
          </el-table-column>
          <el-table-column label="会员" width="100">
            <template #default="{ row }">
              <span class="soft-tag" :class="row.member === '无' ? 'soft-tag--mute' : 'soft-tag--warm'">
                {{ row.member }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span
                class="soft-tag"
                :class="row.status === '正常' ? 'soft-tag--success' : row.status === '封禁' ? 'soft-tag--accent' : 'soft-tag--primary'"
              >
                {{ row.status }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="orders" label="订单数" width="90" />
          <el-table-column prop="lastActive" label="最近活跃" width="130" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openQuota(row)">额度调整</el-button>
              <el-button link type="primary" @click="openLogs(row)">额度流水</el-button>
              <el-button link :type="row.status === '封禁' ? 'success' : 'danger'" @click="toggleBan(row)">
                {{ row.status === '封禁' ? '解封' : '封禁' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 额度调整 -->
    <el-dialog v-model="quotaDialog.visible" title="额度调整" width="480px">
      <el-form label-width="88px">
        <el-form-item label="用户">
          <span class="mono">{{ quotaDialog.row?.id }} · {{ quotaDialog.row?.phone }}</span>
        </el-form-item>
        <el-form-item label="当前额度">
          <span class="num">{{ quotaDialog.row?.quota }} 张</span>
        </el-form-item>
        <el-form-item label="调整数量" required>
          <el-input-number v-model="quotaDialog.amount" :min="-100" :max="200" />
          <span class="ap-muted" style="margin-left: 10px">正数发放，负数扣减</span>
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-input
            v-model="quotaDialog.reason"
            type="textarea"
            :rows="3"
            maxlength="120"
            show-word-limit
            placeholder="例如：任务失败补偿 / 客诉安抚 / 违规回收"
          />
        </el-form-item>
        <el-form-item label="流水号">
          <span class="mono">{{ quotaDialog.flowNo }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitQuota">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 额度流水 -->
    <el-drawer v-model="drawer.visible" title="额度流水" size="420px">
      <div class="drawer-head">
        <span class="mono">{{ drawer.row?.id }}</span>
        <span class="ap-muted">{{ drawer.row?.phone }}</span>
        <span class="soft-tag soft-tag--primary">当前 {{ drawer.row?.quota }} 张</span>
      </div>
      <el-timeline>
        <el-timeline-item
          v-for="(log, index) in logs"
          :key="index"
          :timestamp="log.time"
          :type="log.amount > 0 ? 'success' : log.amount < 0 ? 'danger' : 'info'"
          placement="top"
        >
          <div class="log-item">
            <div class="log-item__title">
              {{ log.type }}
              <span class="num" :class="log.amount >= 0 ? 'log-up' : 'log-down'">
                {{ log.amount > 0 ? '+' : '' }}{{ log.amount }}
              </span>
            </div>
            <div class="log-item__desc">{{ log.remark }}</div>
            <div class="log-item__meta mono">余额 {{ log.balance }} · 操作人 {{ log.operator }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
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
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
}
@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.quota {
  font-weight: 600;
}

.quota--low {
  color: var(--c-accent-dark);
}

.drawer-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--c-border);
  margin-bottom: 16px;
}

.log-item__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.log-up {
  color: #668268;
}
.log-down {
  color: var(--c-accent-dark);
}

.log-item__desc {
  font-size: 12.5px;
  color: var(--c-text-sub);
  margin-top: 2px;
}

.log-item__meta {
  font-size: 11px;
  color: var(--c-text-mute);
  margin-top: 4px;
}
</style>
