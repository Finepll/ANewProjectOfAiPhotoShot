<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { plans, planSales, benefitOptions } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient, areaGradient } from '../utils/chartTheme'

const list = ref(plans.map((item) => ({ ...item })))

const onlineCount = computed(() => list.value.filter((item) => item.status).length)
const totalSales = computed(() => planSales.amounts.reduce((sum, item) => sum + item, 0))

const dialog = reactive({ visible: false, mode: 'edit', form: {} })

function openEdit(row) {
  dialog.mode = row ? 'edit' : 'create'
  dialog.form = row
    ? { ...row, benefits: [...row.benefits] }
    : {
        id: `PLAN-${Date.now().toString().slice(-4)}`,
        name: '',
        type: '订阅',
        price: 0,
        origin: 0,
        duration: '30 天',
        status: false,
        effectAt: '2026-11-01 00:00',
        sellCount: 0,
        recommend: false,
        upgrade: '按剩余天数折算 50%',
        benefits: []
      }
  dialog.visible = true
}

function submit() {
  if (!dialog.form.name) {
    ElMessage.warning('请填写规格名称')
    return
  }
  if (!dialog.form.benefits.length) {
    ElMessage.warning('至少勾选一项会员权益')
    return
  }
  if (dialog.mode === 'edit') {
    const index = list.value.findIndex((item) => item.id === dialog.form.id)
    if (index > -1) list.value[index] = { ...dialog.form }
    ElMessage.success('规格已保存，生效时间之后对用户可见')
  } else {
    list.value.push({ ...dialog.form, sellCount: 0 })
    ElMessage.success('新规格已创建（默认下架，配置完成后可上架）')
  }
  dialog.visible = false
}

function toggleStatus(row) {
  ElMessage.success(`「${row.name}」已${row.status ? '上架' : '下架'}`)
}

const salesOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...legendBase, top: 0, right: 8, data: ['销量（单）', '销售额（元）'] },
  grid: { ...gridBase, top: 42, left: 4, right: 48 },
  xAxis: { ...catAxis, data: planSales.names },
  yAxis: [
    { ...valAxis, name: '单', nameTextStyle: { color: C_SUB, fontSize: 11 } },
    { ...valAxis, name: '元', splitLine: { show: false }, nameTextStyle: { color: C_SUB, fontSize: 11 } }
  ],
  series: [
    {
      name: '销量（单）',
      type: 'bar',
      barWidth: 18,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#99B6B4') },
      data: planSales.counts
    },
    {
      name: '销售额（元）',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbolSize: 7,
      lineStyle: { width: 2.4 },
      areaStyle: { color: areaGradient('#D48982', 0.22, 0.01) },
      data: planSales.amounts
    }
  ]
}))

const revenueOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>¥{c}（{d}%）' },
  legend: { ...legendBase, bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['50%', '44%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { color: C_SUB, fontSize: 11, formatter: '{b}\n{d}%' },
      data: planSales.names.map((name, index) => ({ name, value: planSales.amounts[index] }))
    }
  ]
}))
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="会员规格与权益配置"
      feature="F-ADM-05"
      desc="月卡 / 季卡 / 年卡与单次包的价格、权益项、升级折算比例、上下架与生效时间统一配置；生效时间到达后自动同步至小程序端。"
      :tags="['权益项配置', '升级折算', '生效时间']"
    >
      <template #actions>
        <el-button @click="ElMessage.info('演示 Demo：规格变更会写入操作审计（F-ADM-03）')">
          <el-icon><Document /></el-icon>
          <span style="margin-left: 6px">变更记录</span>
        </el-button>
        <el-button type="primary" @click="openEdit(null)">
          <el-icon><Plus /></el-icon>
          <span style="margin-left: 6px">新增规格</span>
        </el-button>
      </template>
    </PageHeader>

    <div class="summary">
      <div class="summary__item ap-card ap-card--hover">
        <span class="ap-sub">在售规格</span>
        <strong class="num">{{ onlineCount }} / {{ list.length }}</strong>
      </div>
      <div class="summary__item ap-card ap-card--hover">
        <span class="ap-sub">累计销售额</span>
        <strong class="num">¥ {{ totalSales.toLocaleString() }}</strong>
      </div>
      <div class="summary__item ap-card ap-card--hover">
        <span class="ap-sub">付费转化率</span>
        <strong class="num">14.2 %</strong>
      </div>
      <div class="summary__item ap-card ap-card--hover">
        <span class="ap-sub">ARPU</span>
        <strong class="num">¥ 27.3</strong>
      </div>
    </div>

    <div class="plan-grid">
      <div
        v-for="row in list"
        :key="row.id"
        class="plan ap-card ap-card--hover"
        :class="{ 'plan--off': !row.status, 'plan--rec': row.recommend }"
      >
        <div class="plan__head">
          <div>
            <div class="plan__name-row">
              <span class="plan__name">{{ row.name }}</span>
              <span v-if="row.recommend" class="soft-tag soft-tag--accent">推荐</span>
            </div>
            <div class="ap-muted">{{ row.type }} · {{ row.duration }}</div>
          </div>
          <el-switch v-model="row.status" @change="toggleStatus(row)" />
        </div>
        <div class="plan__price">
          <span class="plan__currency">¥</span>
          <span class="plan__amount num">{{ row.price }}</span>
          <span class="plan__origin num">¥{{ row.origin }}</span>
        </div>
        <ul class="plan__benefits">
          <li v-for="item in row.benefits" :key="item">
            <el-icon :size="13"><Select /></el-icon>
            {{ item }}
          </li>
        </ul>
        <div class="plan__meta">
          <div>升级折算：{{ row.upgrade }}</div>
          <div>生效时间：{{ row.effectAt }}</div>
          <div>累计售出：{{ row.sellCount.toLocaleString() }} 单</div>
        </div>
        <div class="plan__foot">
          <el-button size="small" @click="openEdit(row)">
            <el-icon><Edit /></el-icon>
            <span style="margin-left: 4px">编辑</span>
          </el-button>
          <span class="soft-tag" :class="row.status ? 'soft-tag--success' : 'soft-tag--mute'">
            {{ row.status ? '在售' : '已下架' }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">各规格销量与销售额</div>
          <span class="ap-muted">近 30 天</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="salesOption" :height="300" />
        </div>
      </div>
      <div class="ap-card">
        <div class="ap-card__head">
          <div class="ap-card__title">收入占比</div>
          <span class="soft-tag soft-tag--warm">升级折算不计入</span>
        </div>
        <div class="ap-card__body">
          <ChartBox :option="revenueOption" :height="300" />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'create' ? '新增会员规格' : `编辑规格 · ${dialog.form.name}`"
      width="620px"
    >
      <el-form :model="dialog.form" label-width="104px">
        <el-form-item label="规格名称" required>
          <el-input v-model="dialog.form.name" placeholder="例如：月卡 / 单次包 · 10 张" />
        </el-form-item>
        <el-form-item label="规格类型">
          <el-radio-group v-model="dialog.form.type">
            <el-radio-button value="订阅">订阅</el-radio-button>
            <el-radio-button value="计次">计次</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="售价 / 原价">
          <el-input-number v-model="dialog.form.price" :min="0" :precision="1" :step="1" />
          <span class="ap-muted" style="margin: 0 8px">原价</span>
          <el-input-number v-model="dialog.form.origin" :min="0" :precision="1" :step="1" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-input v-model="dialog.form.duration" placeholder="例如：30 天 / 90 天有效" />
        </el-form-item>
        <el-form-item label="权益项" required>
          <el-checkbox-group v-model="dialog.form.benefits" class="benefit-group">
            <el-checkbox v-for="item in benefitOptions" :key="item" :value="item" border>{{ item }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="升级折算">
          <el-select v-model="dialog.form.upgrade" style="width: 100%">
            <el-option label="按剩余天数折算 50%" value="按剩余天数折算 50%" />
            <el-option label="按剩余天数折算 60%" value="按剩余天数折算 60%" />
            <el-option label="按剩余天数折算 70%" value="按剩余天数折算 70%" />
            <el-option label="不支持折算升级" value="不支持折算升级" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker
            v-model="dialog.form.effectAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="选择生效时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="推荐位 / 上架">
          <el-switch v-model="dialog.form.recommend" active-text="设为推荐" inactive-text="不推荐" inline-prompt />
          <span style="width: 20px"></span>
          <el-switch v-model="dialog.form.status" active-text="上架" inactive-text="下架" inline-prompt />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存规格</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.summary {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 1100px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.summary__item {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary__item strong {
  font-size: 22px;
  letter-spacing: -0.4px;
}

.plan-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
}

.plan {
  position: relative;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.plan--off {
  opacity: 0.72;
  filter: saturate(0.7);
}

.plan--rec {
  border-color: var(--c-primary-light);
  box-shadow: 0 12px 26px -18px rgba(47, 62, 61, 0.5);
}

.plan__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.plan__name {
  font-size: 16px;
  font-weight: 600;
}

.plan__price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--c-primary-deep);
}

.plan__currency {
  font-size: 14px;
}

.plan__amount {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.6px;
}

.plan__origin {
  margin-left: 6px;
  font-size: 12px;
  color: var(--c-text-mute);
  text-decoration: line-through;
}

.plan__benefits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12.5px;
  color: var(--c-text-sub);
}

.plan__benefits li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan__benefits .el-icon {
  color: var(--c-primary);
}

.plan__meta {
  font-size: 11.5px;
  color: var(--c-text-mute);
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 10px;
  border-top: 1px dashed var(--c-border);
  margin-top: auto;
}

.plan__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.benefit-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.benefit-group :deep(.el-checkbox) {
  margin-right: 0;
  width: 100%;
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
</style>
