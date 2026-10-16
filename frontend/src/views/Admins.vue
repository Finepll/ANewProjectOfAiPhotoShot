<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { confirmHighRisk, skippedHint } from '../utils/confirm'
import { admins, permissionTree, roleOptions, roleStats } from '../mock'
import { usePolicyStore } from '../stores/policy'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient } from '../utils/chartTheme'

const list = ref(admins.map((item) => ({ ...item })))
const keyword = ref('')
const roleFilter = ref('全部')

const filtered = computed(() =>
  list.value.filter((item) => {
    const matchKeyword =
      !keyword.value || item.account.includes(keyword.value) || item.name.includes(keyword.value)
    const matchRole = roleFilter.value === '全部' || item.role === roleFilter.value
    return matchKeyword && matchRole
  })
)

/* 策略存在 store 里，别的页面（操作审计、模板与素材）读的是同一份值 */
const policy = usePolicyStore()

/* 保留期给固定档位，不给自由文本：这几个值会被下游页面当数字用 */
const retentionOptions = [30, 90, 180, 365]

/* ---------------- 权限编辑 ---------------- */
const permDialog = reactive({ visible: false, row: null, checked: [] })

const treeRef = ref(null)

/** 叶子权限集合：父节点 id（content / user / …）不能作为勾选结果回灌 */
const leafKeys = new Set(permissionTree.flatMap((group) => (group.children || []).map((leaf) => leaf.id)))

const defaultCheckedByRole = {
  超级管理员: [
    'content:view', 'content:edit', 'content:online',
    'user:view', 'user:quota', 'user:ban',
    'pay:plan', 'pay:order', 'pay:refund',
    'system:admin', 'system:audit'
  ],
  运营专员: ['content:view', 'content:edit', 'content:online', 'user:view', 'pay:plan'],
  客服: ['user:view', 'user:quota', 'pay:order', 'pay:refund'],
  财务: ['pay:order', 'pay:refund'],
  内容审核: ['content:view', 'content:online', 'system:audit']
}

function openPerm(row) {
  permDialog.row = row
  /* 优先用这名管理员自己存过的权限集，没有才回落到角色的默认集。
     此前只读角色默认值，于是「保存权限」除了弹提示什么也没写：
     重新打开又变回默认勾选，弹窗顶部那句「权限变更会立即生效」是句空话。 */
  permDialog.checked = [...(row.permissions || defaultCheckedByRole[row.role] || ['content:view'])]
  permDialog.visible = true
}

/* el-tree 的 default-checked-keys 只在树实例初始化时生效，第二次打开对话框不会重算，
   会出现「换了管理员、勾选还是上一个人的」。改在对话框挂载后显式灌入。 */
function syncCheckedKeys() {
  treeRef.value?.setCheckedKeys(permDialog.checked)
}

/* 只保留叶子节点：halfCheckedKeys 里的父节点若回灌给 setCheckedKeys，
   会被当成「整个父节点全选」，下次打开就多授予了原本没勾的子权限。 */
function onTreeCheck(node, state) {
  permDialog.checked = state.checkedKeys.filter((key) => leafKeys.has(key))
}

function submitPerm() {
  const count = permDialog.checked.filter((key) => leafKeys.has(key)).length
  if (!count) {
    ElMessage.warning('至少保留一项权限，避免管理员无法登录后台')
    return
  }
  /* 落到这名管理员身上，重开弹窗才能看到自己刚保存的勾选 */
  permDialog.row.permissions = [...permDialog.checked]
  ElMessage.success(`已更新「${permDialog.row.name}」的权限（${count} 项），变更写入操作审计`)
  permDialog.visible = false
}

function toggleRole(row, role) {
  row.role = role
  ElMessage.success(`「${row.name}」的角色已调整为 ${role}`)
}

async function resetPwd(row) {
  /* 临时密码的有效期直接念策略里的值：原先那个「密码有效期」输入框
     改完只在保存提示里露个脸，没有任何地方照着它办事。 */
  const { ok, skipped } = await confirmHighRisk(
    `将为「${row.name}（${row.account}）」生成一次性临时密码并强制下次登录修改，`
      + `临时密码沿用策略里的 ${policy.passwordDays} 天有效期。确认重置？`,
    '重置密码',
    { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' }
  )
  if (!ok) return
  ElMessage.success(`临时密码已生成（${policy.passwordDays} 天内有效），请通过内部渠道转交管理员本人${skippedHint(skipped)}`)
}

async function toggleActive(row) {
  const disable = row.status
  const { ok, skipped } = await confirmHighRisk(
    disable
      ? `停用后「${row.account}」将立即失去后台访问权限，正在进行中的操作会中断。确认停用？`
      : `确认启用「${row.account}」？启用后按原角色恢复权限。`,
    disable ? '停用管理员' : '启用管理员',
    { type: 'warning', confirmButtonText: disable ? '确认停用' : '确认启用', cancelButtonText: '取消' }
  )
  if (!ok) return
  row.status = !disable
  ElMessage.success(`${disable ? '账号已停用' : '账号已启用'}${skippedHint(skipped)}`)
}

function savePolicy() {
  policy.save()
  /* 提示里把五项都说全：原先只回显失败阈值和锁定时长，
     另外三项（密码有效期、日志保留、强制二次确认）看着像没被保存，
     实际上也确实没有消费方——现在它们会被审计页和模板页读走。 */
  ElMessage.success(
    `登录策略已保存：连续失败 ${policy.maxFail} 次锁定 ${policy.lockMinutes} 分钟，`
    + `密码 ${policy.passwordDays} 天有效，日志保留 ${policy.retentionText}`
    + `${policy.forceConfirm ? '，高危操作需二次确认' : ''}`
  )
}

const roleChartOption = computed(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { ...gridBase, top: 16, right: 40 },
  xAxis: { ...valAxis, splitLine: { show: false }, axisLabel: { show: false } },
  yAxis: {
    ...catAxis,
    inverse: true,
    data: roleStats.roles,
    axisLabel: { color: C_SUB, fontSize: 11 }
  },
  series: [
    {
      type: 'bar',
      barWidth: 13,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: barGradient('#99B6B4') },
      label: { show: true, position: 'right', color: C_SUB, fontSize: 11, formatter: '{c} 次' },
      data: roleStats.counts
    }
  ]
}))
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="管理员与权限管理"
      feature="F-ADM-03"
      desc="后台账号由开发人员分配，支持角色调整、权限项勾选、密码重置、登录失败锁定与停用启用；所有变更写入操作审计。"
      :tags="['RBAC 权限', '密码重置', '失败锁定']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo：新增管理员需由开发人员在服务端创建账号')">
          <el-icon><Plus /></el-icon>
          <span style="margin-left: 6px">新增管理员</span>
        </el-button>
      </template>
    </PageHeader>

    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">各角色操作次数</div>
          <span class="ap-muted">近 7 天，用于观察权限集中度</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="roleChartOption" :height="272" />
        </div>
      </div>

      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">登录与安全策略</div>
          <span class="soft-tag soft-tag--warm">仅超级管理员可改</span>
        </div>
        <div class="ap-card__body policy">
          <div class="policy__row">
            <span>连续失败锁定阈值</span>
            <el-input-number v-model="policy.maxFail" :min="3" :max="10" size="small" />
          </div>
          <div class="policy__row">
            <span>锁定时长（分钟）</span>
            <el-input-number v-model="policy.lockMinutes" :min="5" :max="120" :step="5" size="small" />
          </div>
          <div class="policy__row">
            <span>密码有效期（天）</span>
            <el-input-number v-model="policy.passwordDays" :min="30" :max="365" :step="30" size="small" />
          </div>
          <div class="policy__row">
            <span>审计日志保留</span>
            <el-select v-model="policy.auditRetentionDays" size="small" style="width: 120px">
              <el-option v-for="day in retentionOptions" :key="day" :label="`${day} 天`" :value="day" />
            </el-select>
          </div>
          <div class="policy__row">
            <span>强制二次确认（高危操作）</span>
            <el-switch v-model="policy.forceConfirm" size="small" />
          </div>
          <el-button type="primary" size="small" style="margin-top: 6px" @click="savePolicy">
            保存策略
          </el-button>
        </div>
      </div>
    </div>

    <div class="ap-card">
      <div class="ap-card__head">
        <div class="ap-card__title">管理员列表</div>
        <div class="ap-toolbar">
          <el-input v-model="keyword" placeholder="搜索账号 / 姓名" clearable style="width: 210px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="roleFilter" style="width: 150px">
            <el-option label="全部" value="全部" />
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
      </div>
      <div class="ap-card__body">
        <el-table :data="filtered" stripe>
          <el-table-column prop="id" label="编号" width="100" />
          <el-table-column prop="account" label="账号" width="130">
            <template #default="{ row }"><span class="mono">{{ row.account }}</span></template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="110" />
          <el-table-column label="角色" width="170">
            <template #default="{ row }">
              <el-select
                :model-value="row.role"
                size="small"
                style="width: 140px"
                @change="(value) => toggleRole(row, value)"
              >
                <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="dept" label="所属部门" width="130" />
          <!-- 列名带「（脱敏）」不是啰嗦，是给人看的说明：报告 §三 规则(4) 要求
               管理员手机号与邮箱一律脱敏展示，标注出来，运营看到 138****2093
               才知道这是完整信息被遮蔽后的样子，而不是数据缺失或渲染坏了。
               这里拿到的本来就是掩码值（见 mock 里 admins 的注释），
               所以不存在「某处忘了脱敏」的口子。 -->
          <el-table-column label="手机号（脱敏）" width="140">
            <template #default="{ row }"><span class="mono">{{ row.phone }}</span></template>
          </el-table-column>
          <el-table-column label="邮箱（脱敏）" width="180">
            <template #default="{ row }"><span class="mono">{{ row.email }}</span></template>
          </el-table-column>
          <el-table-column prop="lastLogin" label="最近登录" width="170" />
          <!-- 标红阈值取右侧策略里的「连续失败锁定阈值」，原先写死 3：
               把阈值调到 3 或 10 保存后，这一列的颜色都不跟着动。
               表头把阈值写出来，红色才有明确含义。 -->
          <el-table-column label="登录失败" width="150">
            <template #header>
              <span>登录失败<span class="ap-muted">（≥{{ policy.maxFail }} 次标红）</span></span>
            </template>
            <template #default="{ row }">
              <span class="num" :class="{ 'fail-warn': row.failCount >= policy.maxFail }">{{ row.failCount }} 次</span>
            </template>
          </el-table-column>
          <el-table-column prop="ip" label="最近 IP" width="130">
            <template #default="{ row }"><span class="mono">{{ row.ip }}</span></template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <span class="soft-tag" :class="row.status ? 'soft-tag--success' : 'soft-tag--mute'">
                {{ row.status ? '启用' : '已停用' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPerm(row)">权限</el-button>
              <el-button link type="warning" @click="resetPwd(row)">重置密码</el-button>
              <el-button link :type="row.status ? 'danger' : 'success'" @click="toggleActive(row)">
                {{ row.status ? '停用' : '启用' }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="没有符合条件的管理员账号" />
          </template>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="permDialog.visible"
      :title="`权限配置 · ${permDialog.row?.name || ''}`"
      width="620px"
      destroy-on-close
      @open="syncCheckedKeys"
    >
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="权限变更会立即生效，并记录操作人、时间与前后差异"
        style="margin-bottom: 14px"
      />
      <el-tree
        ref="treeRef"
        :data="permissionTree"
        show-checkbox
        node-key="id"
        default-expand-all
        :default-checked-keys="permDialog.checked"
        :props="{ label: 'label', children: 'children' }"
        @check="onTreeCheck"
      />
      <template #footer>
        <el-button @click="permDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitPerm">保存权限</el-button>
      </template>
    </el-dialog>
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

.policy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.policy__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--c-text-sub);
}

.fail-warn {
  color: var(--c-accent-dark);
  font-weight: 600;
}
</style>
