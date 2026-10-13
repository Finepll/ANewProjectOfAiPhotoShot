<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { templates, templateCategories, idSpecs, stickers, themePacks } from '../mock'
import { PALETTE, C_SUB, tooltip, legendBase, gridBase, catAxis, valAxis, barGradient } from '../utils/chartTheme'

const activeTab = ref('bg')
const view = ref('card')

const list = ref(templates.map((item) => ({ ...item })))
const keyword = ref('')
const category = ref('全部')
const onlyOffline = ref(false)

const specList = ref(idSpecs.map((item) => ({ ...item })))
const stickerList = ref(stickers.map((item) => ({ ...item })))
const themeList = ref(themePacks.map((item) => ({ ...item })))

const filtered = computed(() =>
  list.value.filter((item) => {
    const matchKeyword =
      !keyword.value ||
      item.name.includes(keyword.value) ||
      item.id.toLowerCase().includes(keyword.value.toLowerCase())
    const matchCategory = category.value === '全部' || item.category === category.value
    const matchStatus = !onlyOffline.value || !item.status
    return matchKeyword && matchCategory && matchStatus
  })
)

const copyrightRisk = computed(() => list.value.filter((item) => item.copyright.includes('待补充')))

const dialog = reactive({ visible: false, mode: 'create', form: {} })

function openCreate() {
  dialog.mode = 'create'
  dialog.form = {
    id: '',
    name: '',
    category: '虚拟影楼',
    theme: '',
    size: 6,
    copyright: '自有设计',
    spec: '',
    status: false,
    tags: []
  }
  dialog.visible = true
}

function openEdit(row) {
  dialog.mode = 'edit'
  dialog.form = { ...row }
  dialog.visible = true
}

function submitDialog() {
  if (!dialog.form.name) {
    ElMessage.warning('请填写模板名称')
    return
  }
  if (dialog.form.copyright.includes('待补充')) {
    ElMessage.warning('版权来源未登记，不允许上架（对应 F-ADM-01 合规校验）')
    return
  }
  if (dialog.mode === 'create') {
    list.value.unshift({
      ...dialog.form,
      id: `TPL-${6000 + list.value.length}`,
      updated: '2026-10-10',
      tags: dialog.form.tags?.length ? dialog.form.tags : ['新建']
    })
    ElMessage.success('模板已创建，默认处于下架状态，需登记版权后上架')
  } else {
    const index = list.value.findIndex((item) => item.id === dialog.form.id)
    if (index > -1) list.value[index] = { ...dialog.form }
    ElMessage.success('模板信息已更新')
  }
  dialog.visible = false
}

function toggleStatus(row) {
  const target = list.value.find((item) => item.id === row.id) || row
  if (target.status && target.copyright.includes('待补充')) {
    target.status = false
    ElMessage.error('版权来源未登记，已阻止上架')
    return
  }
  ElMessage.success(`「${target.name}」已${target.status ? '上架' : '下架'}`)
}

async function removeRow(row) {
  try {
    await ElMessageBox.confirm(`确认删除模板「${row.name}」？删除后小程序端将立即不可见。`, '删除模板', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    list.value = list.value.filter((item) => item.id !== row.id)
    ElMessage.success('模板已删除')
  } catch (e) {
    /* 取消 */
  }
}

function toggleSpec(row) {
  ElMessage.success(`证件照规格「${row.name}」已${row.status ? '启用' : '停用'}`)
}

const sizeOption = computed(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...legendBase, top: 0, right: 6, data: ['素材体积', '端侧预算上限'] },
  grid: { ...gridBase, top: 40, left: 4, right: 12 },
  xAxis: { ...catAxis, data: list.value.slice(0, 10).map((item) => item.name.slice(0, 6)), axisLabel: { color: C_SUB, fontSize: 10, interval: 0, rotate: 24 } },
  yAxis: { ...valAxis, name: 'MB', nameTextStyle: { color: C_SUB, fontSize: 11 } },
  series: [
    {
      name: '素材体积',
      type: 'bar',
      barWidth: 14,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#99B6B4') },
      data: list.value.slice(0, 10).map((item) => item.size)
    },
    {
      name: '端侧预算上限',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, type: 'dashed', color: PALETTE[1] },
      data: list.value.slice(0, 10).map(() => 15)
    }
  ]
}))

const specUsageOption = computed(() => ({
  color: PALETTE,
  tooltip: { ...tooltip, trigger: 'item', formatter: '{b}<br/>{c} 个模板引用' },
  legend: { ...legendBase, bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['50%', '44%'],
      itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 6 },
      label: { color: C_SUB, fontSize: 11, formatter: '{b}\n{d}%' },
      data: [
        { name: '一寸', value: 18 },
        { name: '二寸', value: 14 },
        { name: '小一寸', value: 6 },
        { name: '大一寸', value: 9 },
        { name: '小二寸', value: 5 }
      ]
    }
  ]
}))
</script>

<template>
  <div class="ap-page">
    <PageHeader
      title="模板与素材"
      feature="F-ADM-01"
      desc="背景模板、证件照规格库、贴纸素材库、主题风格包统一维护；未登记版权来源的素材禁止上架，素材体积需标注以便端侧下发。"
      :tags="['版权来源登记', '上下架', '体积标注']"
    >
      <template #actions>
        <el-button @click="view = view === 'card' ? 'table' : 'card'">
          <el-icon><component :is="view === 'card' ? 'List' : 'Grid'" /></el-icon>
          <span style="margin-left: 6px">{{ view === 'card' ? '表格视图' : '卡片视图' }}</span>
        </el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>
          <span style="margin-left: 6px">新增素材</span>
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="copyrightRisk.length"
      type="warning"
      show-icon
      :closable="false"
      :title="`有 ${copyrightRisk.length} 个素材缺少版权来源登记，已自动下架：${copyrightRisk.map((item) => item.name).join('、')}`"
      description="合规要求：第三方素材必须上传授权书并登记来源，版本记录留痕 180 天。"
    />

    <el-tabs v-model="activeTab" class="ap-card tabs-card">
      <!-- ============ 背景模板 ============ -->
      <el-tab-pane label="背景模板" name="bg">
        <div class="ap-toolbar panel-toolbar">
          <el-input v-model="keyword" placeholder="搜索模板名称 / 编号" clearable style="width: 240px">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="category" style="width: 150px">
            <el-option v-for="item in templateCategories" :key="item" :label="item" :value="item" />
          </el-select>
          <el-checkbox v-model="onlyOffline">只看未上架</el-checkbox>
          <span class="ap-muted ap-toolbar--right">共 {{ filtered.length }} 个素材</span>
        </div>

        <div v-if="view === 'card'" class="tpl-grid">
          <div v-for="(row, index) in filtered" :key="row.id" class="tpl-card ap-card ap-card--hover">
            <div class="tpl-card__cover" :class="`tpl-card__cover--${index % 4}`">
              <el-icon :size="26"><PictureRounded /></el-icon>
              <span class="tpl-card__cat">{{ row.category }}</span>
              <span class="tpl-card__size mono">{{ row.size }} MB</span>
            </div>
            <div class="tpl-card__body">
              <div class="tpl-card__name">{{ row.name }}</div>
              <div class="tpl-card__meta mono">{{ row.id }} · {{ row.spec }}</div>
              <div class="tpl-card__tags">
                <span class="soft-tag soft-tag--primary">{{ row.theme }}</span>
                <span
                  class="soft-tag"
                  :class="row.copyright.includes('待补充') ? 'soft-tag--accent' : 'soft-tag--mute'"
                >
                  {{ row.copyright }}
                </span>
              </div>
              <div class="tpl-card__foot">
                <el-switch v-model="row.status" size="small" @change="toggleStatus(row)" />
                <span class="ap-muted">{{ row.status ? '已上架' : '已下架' }}</span>
                <div class="ap-toolbar--right">
                  <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                  <el-button link type="danger" @click="removeRow(row)">删除</el-button>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-if="!filtered.length" description="没有符合条件的素材" style="grid-column: 1 / -1" />
        </div>

        <el-table v-else :data="filtered" stripe style="width: 100%">
          <el-table-column prop="id" label="编号" width="120" />
          <el-table-column prop="name" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="110" />
          <el-table-column prop="spec" label="规格 / 引导" min-width="170" />
          <el-table-column prop="size" label="体积" width="90">
            <template #default="{ row }">
              <span class="mono" :class="{ oversize: row.size > 15 }">{{ row.size }} MB</span>
            </template>
          </el-table-column>
          <el-table-column prop="copyright" label="版权来源" min-width="180">
            <template #default="{ row }">
              <el-tag size="small" :type="row.copyright.includes('待补充') ? 'danger' : 'info'" effect="light">
                {{ row.copyright }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="updated" label="更新时间" width="120" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-switch v-model="row.status" size="small" @change="toggleStatus(row)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="removeRow(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ============ 证件照规格 ============ -->
      <el-tab-pane label="证件照规格库" name="spec" lazy>
        <div class="grid-2">
          <el-table :data="specList" stripe>
            <el-table-column prop="name" label="规格" width="100" />
            <el-table-column prop="sizeMm" label="尺寸" width="130" />
            <el-table-column prop="px" label="像素" width="130" />
            <el-table-column prop="headRatio" label="头部占比" width="120" />
            <el-table-column prop="margin" label="边距规则" min-width="140" />
            <el-table-column prop="usage" label="常见用途" min-width="120" />
            <el-table-column label="自定义取色底" width="130">
              <template #default="{ row }">
                <el-tag size="small" :type="row.allowColor ? 'warning' : 'info'" effect="light">
                  {{ row.allowColor ? '允许（非正式场景）' : '不允许' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="启用" width="90">
              <template #default="{ row }">
                <el-switch v-model="row.status" size="small" @change="toggleSpec(row)" />
              </template>
            </el-table-column>
          </el-table>

          <div class="ap-card">
            <div class="ap-card__head">
              <div class="ap-card__title">规格引用分布</div>
              <span class="ap-muted">证件照导出规格占比</span>
            </div>
            <div class="ap-card__body">
              <ChartBox :option="specUsageOption" :height="300" />
            </div>
          </div>
        </div>
        <p class="ap-muted" style="margin-top: 10px">
          说明：正式证件照禁用装饰与风格化，自定义取色底仅对非正式场景开放（对应 F-ID-02 边界口径）。
        </p>
      </el-tab-pane>

      <!-- ============ 贴纸素材 ============ -->
      <el-tab-pane label="贴纸素材库" name="sticker" lazy>
        <el-table :data="stickerList" stripe>
          <el-table-column prop="id" label="编号" width="110" />
          <el-table-column prop="name" label="素材包" min-width="140" />
          <el-table-column prop="pack" label="所属礼包" min-width="140" />
          <el-table-column prop="count" label="数量" width="90" />
          <el-table-column prop="size" label="体积" width="100">
            <template #default="{ row }"><span class="mono">{{ row.size }} MB</span></template>
          </el-table-column>
          <el-table-column prop="updated" label="更新时间" width="120" />
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-switch v-model="row.status" size="small" active-text="上架" inactive-text="下架" inline-prompt />
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ============ 主题风格包 ============ -->
      <el-tab-pane label="主题风格包" name="theme" lazy>
        <div class="grid-2">
          <el-table :data="themeList" stripe>
            <el-table-column prop="id" label="编号" width="100" />
            <el-table-column prop="name" label="风格包" min-width="120" />
            <el-table-column prop="style" label="风格效果" min-width="140" />
            <el-table-column prop="models" label="依赖模型" min-width="140" />
            <el-table-column prop="size" label="体积" width="100">
              <template #default="{ row }"><span class="mono">{{ row.size }} MB</span></template>
            </el-table-column>
            <el-table-column prop="copyright" label="来源" width="120" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status ? 'success' : 'info'" effect="light">
                  {{ row.status ? '已上架' : '已下架' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="ap-card">
            <div class="ap-card__head">
              <div class="ap-card__title">素材体积与端侧预算</div>
              <span class="soft-tag soft-tag--warm">端侧包内下发预算 15 MB</span>
            </div>
            <div class="ap-card__body">
              <ChartBox :option="sizeOption" :height="300" />
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增素材' : '编辑素材'" width="560px">
      <el-form :model="dialog.form" label-width="96px">
        <el-form-item label="素材名称" required>
          <el-input v-model="dialog.form.name" placeholder="例如：暖光影棚 · 米色幕布" />
        </el-form-item>
        <el-form-item label="所属分类">
          <el-select v-model="dialog.form.category" style="width: 100%">
            <el-option v-for="item in templateCategories.slice(1)" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="主题 / 风格">
          <el-input v-model="dialog.form.theme" placeholder="例如：暖调影棚" />
        </el-form-item>
        <el-form-item label="规格说明">
          <el-input v-model="dialog.form.spec" placeholder="例如：1080×1440 引导框 / 25×35mm" />
        </el-form-item>
        <el-form-item label="素材体积">
          <el-input-number v-model="dialog.form.size" :min="0.1" :max="40" :step="0.5" />
          <span class="ap-muted" style="margin-left: 10px">MB，端侧包内下发预算 15 MB</span>
        </el-form-item>
        <el-form-item label="版权来源">
          <el-select v-model="dialog.form.copyright" style="width: 100%">
            <el-option label="自有拍摄" value="自有拍摄" />
            <el-option label="自有设计" value="自有设计" />
            <el-option label="合作摄影师授权" value="合作摄影师授权" />
            <el-option label="第三方素材（已附授权书）" value="第三方素材（已附授权书）" />
            <el-option label="待补充来源（禁止上架）" value="待补充来源" />
          </el-select>
        </el-form-item>
        <el-form-item label="上架状态">
          <el-switch v-model="dialog.form.status" active-text="上架" inactive-text="下架" inline-prompt />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tabs-card {
  padding: 6px 18px 18px;
}

.tabs-card :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.panel-toolbar {
  margin-bottom: 16px;
}

.tpl-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.tpl-card {
  overflow: hidden;
  cursor: default;
}

.tpl-card__cover {
  position: relative;
  height: 122px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
  transition: transform 0.35s ease;
}

.tpl-card:hover .tpl-card__cover {
  transform: scale(1.03);
}

.tpl-card__cover--0 {
  background: linear-gradient(135deg, #99b6b4, #7a9290);
}
.tpl-card__cover--1 {
  background: linear-gradient(135deg, #bacfce, #99b6b4);
}
.tpl-card__cover--2 {
  background: linear-gradient(135deg, #dfb199, #c2907a);
}
.tpl-card__cover--3 {
  background: linear-gradient(135deg, #d48982, #b26f69);
}

.tpl-card__cat {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(4px);
}

.tpl-card__size {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(47, 62, 61, 0.35);
}

.tpl-card__body {
  padding: 12px 14px 14px;
}

.tpl-card__name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.tpl-card__meta {
  color: var(--c-text-mute);
  margin-bottom: 10px;
}

.tpl-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tpl-card__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--c-border);
}

.grid-2 {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
}

@media (max-width: 1200px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.oversize {
  color: var(--c-accent-dark);
  font-weight: 600;
}
</style>
