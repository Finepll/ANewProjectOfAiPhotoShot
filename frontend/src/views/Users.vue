<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import StatCard from '../components/StatCard.vue'
import ChartBox from '../components/ChartBox.vue'
import { confirmHighRisk, skippedHint } from '../utils/confirm'
import { useAuthStore } from '../stores/auth'
import { users, userStats, quotaLogsFor, userGrowth, quotaDistribution, todayStamp, appendAudit } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, areaGradient, barGradient } from '../utils/chartTheme'

/* 审计条目要记操作人与角色，从登录态取，不在页面里写死「当前管理员」 */
const auth = useAuthStore()

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

/* 「付费转化」有两个口径，写在卡片上要说清是哪个：
   这里是会员存量占累计用户的比例（6842/48260 ≈ 14.2%）；
   而右下方增长曲线算出来的是近 14 天的流量口径（≈14.8%）。
   原先只写「付费转化 14.2%」，和图并排看像是对不上。 */
const memberShare = computed(() => ((userStats.member / userStats.total) * 100).toFixed(1))

const stats = computed(() => [
  { key: 'total', label: '累计用户', value: userStats.total, unit: '人', icon: 'UserFilled', tone: 'primary', delta: 8.2, hint: '近 30 天' },
  { key: 'month', label: '本月新增', value: userStats.monthNew, unit: '人', icon: 'TrendCharts', tone: 'light', delta: 12.6, hint: '较上月' },
  { key: 'member', label: '会员用户', value: userStats.member, unit: '人', icon: 'Present', tone: 'warm', delta: 5.4, hint: `占累计用户 ${memberShare.value}%` },
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
  const row = list.value.find((item) => item.id === quotaDialog.row.id)
  const amount = quotaDialog.amount
  /* 调整量为 0 时余额不变，却仍会往流水里塞一行，还提示「已发放 0 额度」。
     弹窗里的 el-input-number 默认就是 0，不填直接确定就能触发。 */
  if (!amount) {
    ElMessage.warning('调整额度不能为 0，请填写正数发放或负数扣减')
    return
  }
  /* 扣减不得超过当前余额：原先用 Math.max(0, ...) 把余额截到 0，
     但流水记的是被申请的那个数，于是这一行算不平
     （原余额 12、记 -50、结余 0，12 - 50 ≠ 0）。流水必须自己对得上。 */
  if (amount < 0 && -amount > row.quota) {
    ElMessage.warning(`当前剩余额度 ${row.quota} 张，最多扣减 ${row.quota} 张`)
    return
  }
  if (!quotaDialog.reason.trim()) {
    ElMessage.warning('额度调整需填写原因，将写入额度流水与操作审计')
    return
  }
  const before = row.quota
  row.quota = row.quota + amount
  /* 记进「这个用户」的流水，时间取自 mock 的统一时钟，不再写死 */
  logsFor(row).unshift({
    time: todayStamp(),
    type: amount >= 0 ? '人工发放' : '人工扣减',
    amount,
    balance: row.quota,
    remark: quotaDialog.reason,
    operator: '当前管理员',
    /* 流水号原先只出现在 toast 里，没落到数据上——弹窗提示「流水号 QLxxx」，
       但事后拿这个号在任何地方都查不到。现在它跟着流水行走。 */
    flowNo: quotaDialog.flowNo
  })
  /* 同一句提示说「将写入额度流水与操作审计」，两处都得落到数据上。
     审计记的是变更前后（12 → 13），不是只记「调整了 1 张」——
     事后核查要能看出改成了多少。 */
  appendAudit({
    operator: auth.admin,
    type: '额度调整',
    target: `${row.id} ${row.phone}`,
    detail: `剩余额度 ${before} → ${row.quota}，原因：${quotaDialog.reason}，流水号 ${quotaDialog.flowNo}`
  })
  ElMessage.success(`已${amount >= 0 ? '发放' : '扣减'} ${Math.abs(amount)} 额度，流水号 ${quotaDialog.flowNo}`)
  quotaDialog.visible = false
}

/* ---------------- 封禁 / 解封 ---------------- */
async function toggleBan(row) {
  const ban = row.status !== '封禁'
  /* 封禁是不可逆的高危动作，走策略里的「强制二次确认」总开关 */
  const { ok, skipped } = await confirmHighRisk(
    ban
      ? `封禁后「${row.phone}」将无法登录小程序，已购权益保留但不可使用，确认封禁？`
      : `确认解封「${row.phone}」？解封后需重新同意肖像权协议。`,
    ban ? '封禁账号' : '解封账号',
    { type: 'warning', confirmButtonText: ban ? '确认封禁' : '确认解封', cancelButtonText: '取消' }
  )
  if (!ok) return
  row.status = ban ? '封禁' : '正常'
  /* 封禁与解封都记审计：两者都改账号可用状态，
     而报告 §三 规则(3) 只点名「封禁」——但「谁把这个人放出来的」同样要能查。 */
  appendAudit({
    operator: auth.admin,
    type: '用户封禁',
    target: `${row.id} ${row.phone}`,
    detail: ban
      ? `账号状态 正常 → 封禁，已购权益保留但不可用`
      : `账号状态 封禁 → 正常，需重新同意肖像权协议`
  })
  ElMessage.success(`${ban ? '账号已封禁' : '账号已解封'}，已写入操作审计${skippedHint(skipped)}`)
}

/* ---------------- 额度流水 ---------------- */
/* 按用户各存一份：原先是一个模块级 ref 装全站同一串记录，
   点谁都是同样的流水，且余额与该行额度对不上。 */
const logsByUser = reactive({})
const drawer = reactive({ visible: false, row: null })

function logsFor(user) {
  if (!logsByUser[user.id]) logsByUser[user.id] = quotaLogsFor(user)
  return logsByUser[user.id]
}

const currentLogs = computed(() => (drawer.row ? logsFor(drawer.row) : []))

function openLogs(row) {
  drawer.row = row
  drawer.visible = true
}

/* 用户详情抽屉与「额度流水」分开：流水是账（额度怎么变的），详情是档案
   （这个用户是谁、用了多少、授权过什么）。报告 I-02 把授权签署记录归在详情里，
   它和额度变动没有关系，塞进流水时间线只会让两件事互相干扰 */
const profile = reactive({ visible: false, row: null })

function openProfile(row) {
  profile.row = row
  profile.visible = true
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
      data: userGrowth.members
    }
  ]
}))

/* 口径说明写在标题右侧，人数由档位自己求和——原先四档写死在模板里、
   合计 8520 与 KPI「累计用户 48,260」对不上，也没说统计的是哪一批人 */
const quotaDistTotal = computed(() => quotaDistribution.reduce((sum, item) => sum + item.value, 0))

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
      data: quotaDistribution
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

    <div class="kpi-grid kpi-grid--4">
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
          <span class="ap-muted">付费会员 {{ quotaDistTotal.toLocaleString() }} 人 · 用于评估发放策略</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="quotaDistOption" :height="280" />
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <!-- 表里是样例，页头 KPI 是全平台口径。写明这一点，
             免得封禁一个用户后看到「封禁中 37 人」不动，以为功能没生效。 -->
        <div class="ap-card__title">用户列表<span class="ap-muted">（最近活跃 {{ list.length }} 位，KPI 为全平台口径）</span></div>
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
          <!-- 报告 I-02 要求列表含「任务次数」。它不能被订单数顶替：一次订单可能产出多次
               任务，而免费用户没有订单照样有任务（每日免费额度那 5 张），两个数一起看才有意义 -->
          <el-table-column prop="tasks" label="任务次数" width="104" sortable :sort-method="(a, b) => a.tasks - b.tasks">
            <template #default="{ row }">
              <span class="num">{{ row.tasks }}</span>
              <span class="ap-muted"> 次</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastActive" label="最近活跃" width="130" />
          <el-table-column label="操作" width="288" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openQuota(row)">额度调整</el-button>
              <el-button link type="primary" @click="openLogs(row)">额度流水</el-button>
              <el-button link type="primary" @click="openProfile(row)">详情</el-button>
              <el-button link :type="row.status === '封禁' ? 'success' : 'danger'" @click="toggleBan(row)">
                {{ row.status === '封禁' ? '解封' : '封禁' }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="没有符合条件的用户" />
          </template>
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
          v-for="(log, index) in currentLogs"
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
            <div class="log-item__meta mono">
              余额 {{ log.balance }} 张 · 操作人 {{ log.operator }}
              <template v-if="log.flowNo"><br />流水号 {{ log.flowNo }}</template>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>

    <!-- 用户详情。报告 I-02：「用户列表与详情（脱敏展示，仅含手机号掩码、注册时间、
         任务次数、剩余额度与授权签署记录，不提供任何人脸原图查看能力）」 -->
    <el-drawer v-model="profile.visible" title="用户详情" size="460px">
      <div class="drawer-head">
        <span class="mono">{{ profile.row?.id }}</span>
        <span class="ap-muted">{{ profile.row?.phone }}</span>
        <span
          class="soft-tag"
          :class="profile.row?.status === '正常' ? 'soft-tag--success' : 'soft-tag--accent'"
        >
          {{ profile.row?.status }}
        </span>
      </div>

      <div class="profile-grid">
        <div class="profile-grid__item">
          <span class="profile-grid__label">昵称</span><span>{{ profile.row?.nick }}</span>
        </div>
        <div class="profile-grid__item">
          <span class="profile-grid__label">注册时间</span><span class="mono">{{ profile.row?.registered }}</span>
        </div>
        <div class="profile-grid__item">
          <span class="profile-grid__label">任务次数</span><span class="num">{{ profile.row?.tasks }} 次</span>
        </div>
        <div class="profile-grid__item">
          <span class="profile-grid__label">剩余额度</span><span class="num">{{ profile.row?.quota }} 张</span>
        </div>
        <div class="profile-grid__item">
          <span class="profile-grid__label">会员</span><span>{{ profile.row?.member }}</span>
        </div>
        <div class="profile-grid__item">
          <span class="profile-grid__label">最近活跃</span><span class="mono">{{ profile.row?.lastActive }}</span>
        </div>
      </div>

      <div class="profile-title">
        <span>云端能力授权签署记录</span>
        <span class="ap-muted">逐次授权 · 可随时撤回</span>
      </div>
      <el-table v-if="profile.row?.grants?.length" :data="profile.row.grants" size="small" border>
        <el-table-column prop="ability" label="能力" min-width="130" />
        <el-table-column prop="signedAt" label="签署时间" min-width="150" />
        <el-table-column label="状态" width="96">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === '已签署' ? 'success' : 'info'" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <!-- 空态要说清是「从未授权」而不是「没加载出来」：报告 A-04 规定用户拒绝授权则该
           云能力不可用、端侧能力不受影响，所以没有记录本身就是一种正常状态 -->
      <el-empty v-else description="该用户从未授权使用云端能力" :image-size="64" />

      <div class="ap-muted profile-note">按报告 I-02，此处不提供任何人脸原图查看能力</div>
    </el-drawer>
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

/* 详情抽屉的键值网格。两列自适应，窄屏自动折成一列 */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  margin-bottom: 20px;
}

@media (max-width: 560px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.profile-grid__item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--c-bg-deep);
  font-size: 13px;
}

.profile-grid__label {
  color: var(--c-text-mute);
}

.profile-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
}

.profile-title .ap-muted {
  font-size: 12px;
  font-weight: 400;
}

.profile-note {
  margin-top: 18px;
  font-size: 12px;
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
