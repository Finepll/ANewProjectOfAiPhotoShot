<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { admins, permissionTree, roleOptions, roleStats, loginPolicy } from '../mock'
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

const policy = reactive({ ...loginPolicy, forceConfirm: true })

/* ---------------- 权限编辑 ---------------- */
const permDialog = reactive({ visible: false, row: null, checked: [] })

const treeRef = ref(null)

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
  permDialog.checked = [...(defaultCheckedByRole[row.role] || ['content:view'])]
  permDialog.visible = true
}

function submitPerm() {
  if (!permDialog.checked.length) {
    ElMessage.warning('至少保留一项权限，避免管理员无法登录后台')
    return
  }
  ElMessage.success(`已更新「${permDialog.row.name}」的权限（${permDialog.checked.length} 项），变更写入操作审计`)
  permDialog.visible = false
}

function toggleRole(row, role) {
  row.role = role
  ElMessage.success(`「${row.name}」的角色已调整为 ${role}`)
}

async function resetPwd(row) {
  try {
    await ElMessageBox.confirm(
      `将为「${row.name}（${row.account}）」生成一次性临时密码并强制下次登录修改，确认重置？`,
      '重置密码',
      { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' }
    )
    ElMessage.success('临时密码已生成，请通过内部渠道转交管理员本人')
  } catch (e) {
    /* 取消 */
  }
}

async function toggleActive(row) {
  const disable = row.status
  try {
    await ElMessageBox.confirm(
      disable
        ? `停用后「${row.account}」将立即失去后台访问权限，正在进行中的操作会中断。确认停用？`
        : `确认启用「${row.account}」？启用后按原角色恢复权限。`,
      disable ? '停用管理员' : '启用管理员',
      { type: 'warning', confirmButtonText: disable ? '确认停用' : '确认启用', cancelButtonText: '取消' }
    )
    row.status = !disable
    ElMessage.success(disable ? '账号已停用' : '账号已启用')
  } catch (e) {
    /* 取消 */
  }
}

function savePolicy() {
  ElMessage.success(`登录策略已保存：连续失败 ${policy.maxFail} 次锁定 ${policy.lockMinutes} 分钟`)
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
            <el-input v-model="policy.auditRetention" size="small" style="width: 120px" />
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
          <el-table-column prop="lastLogin" label="最近登录" width="170" />
          <el-table-column label="登录失败" width="110">
            <template #default="{ row }">
              <span class="num" :class="{ 'fail-warn': row.failCount >= 3 }">{{ row.failCount }} 次</span>
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
        </el-table>
      </div>
    </div>

    <el-dialog v-model="permDialog.visible" :title="`权限配置 · ${permDialog.row?.name || ''}`" width="620px">
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
        @check="(node, state) => (permDialog.checked = [...state.checkedKeys, ...state.halfCheckedKeys])"
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
