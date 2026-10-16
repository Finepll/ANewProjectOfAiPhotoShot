<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import ChartBox from '../components/ChartBox.vue'
import { confirmHighRisk, skippedHint } from '../utils/confirm'
import { templates, templateCategories, idSpecs, stickers, themePacks, nextId, todayStamp, appendAudit } from '../mock'
import { usePolicyStore } from '../stores/policy'
import { useAuthStore } from '../stores/auth'

/* 版本记录留痕时长与「操作审计」页共用同一份策略 */
const policy = usePolicyStore()
/* 审计条目记操作人，从登录态取 */
const auth = useAuthStore()
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

/* 版权告警要覆盖本页两个页签的全部素材：原先只扫背景模板，
   于是告警写着「1 个素材缺少版权来源登记」，切到主题风格包页签
   却能看见 THM-04 水彩插画同样是「待补充来源」。 */
const copyrightRisk = computed(() =>
  [...list.value, ...themeList.value].filter((item) => item.copyright?.includes('待补充'))
)

const dialog = reactive({ visible: false, mode: 'create', form: {} })

/* 封面配色的四个档位，与 .tpl-card__cover--0~3 的渐变一一对应。给名称是为了让色块按钮
   有个可读的说明——一个不含文字的色块，悬停和读屏都问不出它是什么颜色。 */
const coverNames = ['青绿', '浅青', '暖棕', '砖红']

/* 报告 B 线：证件照线禁用虚化、调焦、贴纸、涂鸦、文字与全部风格化能力。
   这是全表单唯一按分类改行为的字段，提出来给模板与提交两处共用，免得两处各判一次。 */
const isIdPhoto = computed(() => dialog.form.category === '证件照')
/* 只把开关置灰不够：从别的分类切到证件照时，先前打开的开关仍停在 true 上，
   存下去就成了「证件照支持风格化」。切过去的同时归零。 */
watch(isIdPhoto, (v) => {
  if (v) {
    dialog.form.blur = false
    dialog.form.stylize = false
  }
})

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
    /* 底图资源与封面必须有值：表格的「底图资源」列和卡片墙的封面色都读它们，
       新建时留空会渲染出一张没有封面、资源列为空的卡片 */
    assets: '底图 1080×1440 / 蒙版 1024×1024',
    cover: 1,
    /* 默认分类是虚拟影楼，允许背景虚化；风格化默认关闭——它要额外的 LUT 与模型配额 */
    blur: true,
    stylize: false,
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
  /* 证件照的能力位在保存时再强制归零一次。表单里已由 watch 保证，但这是报告 B 线的
     硬约束（成品须可用于正式场合），不该只靠一个 watch 活着——将来表单结构调整、
     watch 被挪走时，这里还兜得住 */
  if (dialog.form.category === '证件照') {
    dialog.form.blur = false
    dialog.form.stylize = false
  }
  if (dialog.form.copyright.includes('待补充')) {
    ElMessage.warning('版权来源未登记，不允许上架（对应 F-ADM-01 合规校验）')
    return
  }
  if (dialog.mode === 'create') {
    /* 新建的模板沿用 TPL-6xxx 段：只在该段内取最大号 +1，
       原先用列表长度推号，删掉一条再新增就会撞上已存在的编号。 */
    const custom = list.value.filter((item) => item.id.startsWith('TPL-6'))
    list.value.unshift({
      ...dialog.form,
      id: nextId('TPL-', custom, 6000),
      updated: todayStamp().slice(0, 10),
      tags: dialog.form.tags?.length ? dialog.form.tags : ['新建']
    })
    /* 提示要跟着表单里的「上架状态」开关走：原先无论开关在哪一边，
       都固定提示「默认处于下架状态」，可列表里新记录已经显示「已上架」。 */
    ElMessage.success(
      dialog.form.status
        ? '模板已创建并上架'
        : '模板已创建，默认处于下架状态，需登记版权后上架'
    )
  } else {
    const index = list.value.findIndex((item) => item.id === dialog.form.id)
    if (index > -1) list.value[index] = { ...dialog.form }
    ElMessage.success('模板信息已更新')
  }
  dialog.visible = false
}

function toggleStatus(row) {
  const target = list.value.find((item) => item.id === row.id) || row
  /* 开关已经先翻了，target.status 是新值：true = 这次是上架 */
  const action = target.status ? '上架' : '下架'
  if (target.status && target.copyright.includes('待补充')) {
    target.status = false
    ElMessage.error('版权来源未登记，已阻止上架')
    /* 被拦下的操作也要留痕，并且记成「失败」——审计页的结果筛选就是给这类事用的：
       事后要能查出「谁试过把一个没有版权来源的素材上架」。 */
    appendAudit({
      operator: auth.admin,
      type: '模板上下架',
      target: `${target.id} ${target.name}`,
      detail: '尝试上架被拦截：版权来源未登记，素材保持下架',
      result: '失败'
    })
    return
  }
  /* 报告 I-01：「上下架与变更需记录操作人与时间」。删除也归这一档——
     报告的措辞把「上下架」与「变更」并成一类留痕对象，枚举里不另开一格。 */
  appendAudit({
    operator: auth.admin,
    type: '模板上下架',
    target: `${target.id} ${target.name}`,
    detail: `上下架状态 ${target.status ? '下架 → 上架' : '上架 → 下架'}，版权来源：${target.copyright}，体积 ${target.size} MB`
  })
  ElMessage.success(`「${target.name}」已${action}`)
}

async function removeRow(row) {
  /* 报告 I-01：被历史工程引用的模板只允许下架、不允许删除。
     工程不落盘、按模板快照参数回放，删掉模板记录，引用它的那些工程就失去了
     可核对的来源。此处只拦删除，下架路径不受影响。 */
  if (row.referenced > 0) {
    ElMessage.warning(`「${row.name}」已被 ${row.referenced} 个历史工程引用，只能下架不能删除`)
    return
  }
  const { ok, skipped } = await confirmHighRisk(
    `确认删除模板「${row.name}」？删除后小程序端将立即不可见。`,
    '删除模板',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  )
  if (!ok) return
  list.value = list.value.filter((item) => item.id !== row.id)
  appendAudit({
    operator: auth.admin,
    type: '模板上下架',
    target: `${row.id} ${row.name}`,
    detail: `删除模板（无历史工程引用），版权来源：${row.copyright}`
  })
  ElMessage.success(`模板已删除${skippedHint(skipped)}`)
}

function toggleSpec(row) {
  ElMessage.success(`证件照规格「${row.name}」已${row.status ? '启用' : '停用'}`)
}

/* 端侧包内下发预算。图表虚线的高度和卡片角上那句文案共用这个常量，
   原先两处各写一个 15，改一处就会对不上。 */
const SIZE_BUDGET = 15

/* 这张图在「主题风格包」页签里，左边同屏就是 themeList 的表格，
   所以画的必须是风格包：原先取的是 list（背景模板），
   图上的柱子全是 1.6~14.2 MB、没有一根越过 15 MB 预算线，
   而左边表格里 THM-01/02/04 分别是 22.6/18.4/26.8 MB，三个都超预算。
   同一屏两套数据的矛盾就在这里。 */
const sizeOption = computed(() => ({
  tooltip: { ...tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { ...legendBase, top: 0, right: 6, data: ['风格包体积', '端侧预算上限'] },
  grid: { ...gridBase, top: 40, left: 4, right: 12 },
  xAxis: { ...catAxis, data: themeList.value.map((item) => item.name), axisLabel: { color: C_SUB, fontSize: 10, interval: 0, rotate: 24 } },
  yAxis: { ...valAxis, name: 'MB', nameTextStyle: { color: C_SUB, fontSize: 11 } },
  series: [
    {
      name: '风格包体积',
      type: 'bar',
      barWidth: 20,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: barGradient('#99B6B4') },
      data: themeList.value.map((item) => item.size)
    },
    {
      name: '端侧预算上限',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, type: 'dashed', color: PALETTE[1] },
      data: themeList.value.map(() => SIZE_BUDGET)
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
        <!-- 只有「背景模板」这一个页签有卡片/表格两种视图，另外三个页签
             本来就只有表格；按钮挂在不认它的事件上，点了没有任何反应。
             所以按当前页签决定是否显示。 -->
        <el-button v-if="activeTab === 'bg'" @click="view = view === 'card' ? 'table' : 'card'">
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
      :description="`合规要求：第三方素材必须上传授权书并登记来源，版本记录留痕 ${policy.retentionText}。`"
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
          <div v-for="row in filtered" :key="row.id" class="tpl-card ap-card ap-card--hover">
            <!-- 封面取模板自己的 cover 档位，不再按列表下标轮换：下标会随关键词、分类、
                 上下架筛选整体重排，同一个模板换个筛选条件就变一次颜色，那不是「封面」 -->
            <div class="tpl-card__cover" :class="`tpl-card__cover--${row.cover}`">
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
                <!-- 标签原先只写进数据、没有任何地方渲染（死字段），报告 I-01 把它列为
                     模板要维护的属性之一，所以在这里显出来 -->
                <span v-for="tag in row.tags" :key="tag" class="soft-tag soft-tag--mute">{{ tag }}</span>
                <!-- 被引用过的模板不能删（见 removeRow）。这个标记让「不能删」在界面上有据可依，
                     而不是等点了删除才弹一句警告 -->
                <span v-if="row.referenced > 0" class="soft-tag soft-tag--warm">
                  被 {{ row.referenced }} 个工程引用
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
          <!-- 报告 I-01 把「底图资源」列为模板要维护的属性。它和「规格 / 引导」不是
               一回事：那是成品的尺寸约束，这是下发内容由哪些资源构成 -->
          <el-table-column prop="assets" label="底图资源" min-width="185" show-overflow-tooltip />
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
          <!-- 有引用的模板删不掉，数量摆在列表上，省得运维点一次删除才知道 -->
          <el-table-column label="工程引用" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.referenced > 0" size="small" type="warning" effect="light">
                {{ row.referenced }} 个
              </el-tag>
              <span v-else class="ap-muted">未被引用</span>
            </template>
          </el-table-column>
          <!-- 报告 I-01 的两个能力位。证件照分类恒为「不支持」——报告 B 线规定证件照
               禁用虚化、调焦与全部风格化能力，所以「不支持」是个有意义的状态，
               要显式写出来，不能留空 -->
          <el-table-column label="支持虚化" width="96" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.blur" size="small" type="success" effect="light">支持</el-tag>
              <span v-else class="ap-muted">不支持</span>
            </template>
          </el-table-column>
          <el-table-column label="支持风格化" width="104" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.stylize" size="small" type="warning" effect="light">支持</el-tag>
              <span v-else class="ap-muted">不支持</span>
            </template>
          </el-table-column>
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
          <!-- 卡片视图早就有 el-empty，表格视图却退回 Element Plus 的默认「暂无数据」，
               同一个筛选条件下两种视图说法不一致 -->
          <template #empty>
            <el-empty description="没有符合条件的模板素材" />
          </template>
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
              <div class="ap-card__title">风格包体积与端侧预算</div>
              <span class="soft-tag soft-tag--warm">端侧包内下发预算 {{ SIZE_BUDGET }} MB</span>
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
        <el-form-item label="底图资源">
          <el-input v-model="dialog.form.assets" placeholder="例如：底图 1080×1440 / 蒙版 1024×1024" />
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
        <el-form-item label="封面配色">
          <el-radio-group v-model="dialog.form.cover">
            <el-radio-button v-for="(name, i) in coverNames" :key="name" :value="i" :title="name">
              <span class="cover-swatch" :class="`tpl-card__cover--${i}`" />
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <!-- 两个能力各自成行，字段名交给 el-form-item 的 label，而不是写在 el-switch 的
             active-text 上：EP 的开关标签在非 inline-prompt 模式下常驻（源码里只要
             activeText 存在就渲染），选中时把颜色换成 --el-color-primary，本项目那个值
             是 #99b6b4，落在白底上只有 2.16:1——越是想看清自己刚打开了什么，越看不清。
             开关本体的位置已经表达开/关，字段名不必再兼任状态灯。
             这么写也和本表单其它字段（底图资源 / 素材体积 / 版权来源）同一种写法。 -->
        <el-form-item label="背景虚化">
          <el-switch v-model="dialog.form.blur" :disabled="isIdPhoto" />
        </el-form-item>
        <el-form-item label="支持风格化">
          <el-switch v-model="dialog.form.stylize" :disabled="isIdPhoto" />
        </el-form-item>
        <!-- 灰掉开关不等于约束成立：从别的分类切到证件照时，之前打开的开关还停在 true 上，
             保存下去就成了「证件照支持风格化」。这里说清为什么会被自动关掉 -->
        <el-form-item v-if="isIdPhoto">
          <div class="ap-muted">
            证件照线禁用虚化与全部风格化能力（成品须可用于正式场合），保存时两项均为「不支持」
          </div>
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

/* 表单里选封面档位的色块。直接复用上面四组渐变——色板只留一处定义，
   将来调整配色不必追着编辑表单再改一遍 */
.cover-swatch {
  display: inline-block;
  width: 22px;
  height: 12px;
  border-radius: 3px;
  vertical-align: middle;
}

.tpl-card__cat {
  position: absolute;
  left: 10px;
  bottom: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  /* 这层底是半透明白压在封面渐变上，字若跟着 .tpl-card__cover 继承白 92%，
     全站对比度普查实测只有 1.42~2.01:1——浅色药丸上再压白字，等于看不见
     （渐变最亮端最低，是唯一一类像素量与声明色量双双低于 1.5:1 的文字）。
     显式给深字：与全站 .soft-tag 的「浅底深字」一致，也与同卡片右上角
     __size 的「深底白字」成对，两侧药丸不再一深一浅却都配白字。 */
  color: var(--c-text);
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
