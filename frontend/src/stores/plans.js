import { defineStore } from 'pinia'
import { plans as seedPlans } from '../mock'

/**
 * 会员规格。放进 store 让「会员规格与权益配置」页和「运营看板」共用同一份，
 * 而不是各持一个副本。
 *
 * 原先规格页自己 `ref(plans.map(...))` 复制一份：在页面上把年卡的生效日期
 * 从 10-15 改成 11-01，切回看板，待办里那句「「年卡」权益配置将于 10-15 生效」
 * 照旧念旧日期——同一屏并排摆着的两句话，一个说 11-01 一个说 10-15。
 * buildTodoList 早就留好了 plansSource 参数（见 mock/index.js），
 * 缺的只是两边接同一个源。
 *
 * 初始值要深拷贝：直接引用 mock 的 plans 会把编辑写回那个常量数组，
 * 而 mock_integrity 之类的纯数据检查读的正是同一份。
 */
export const usePlansStore = defineStore('plans', {
  state: () => ({
    list: seedPlans.map((item) => ({ ...item, benefits: [...item.benefits] }))
  }),
  getters: {
    /** 每个规格的「发放权益」，供流水页等按规格名反查 */
    grantOf: (state) => (name) => state.list.find((item) => item.name === name)?.grant || '—'
  },
  actions: {
    /** 按 id 覆盖或追加。编辑与新增走同一条路，省得两处各写一遍索引查找 */
    upsert(row) {
      const next = { ...row, benefits: [...row.benefits] }
      const index = this.list.findIndex((item) => item.id === row.id)
      if (index > -1) this.list[index] = next
      else this.list.push({ ...next, sellCount: 0 })
    }
  }
})
