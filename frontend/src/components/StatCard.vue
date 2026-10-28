<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], required: true },
  unit: { type: String, default: '' },
  delta: { type: Number, default: null },
  /** 数值是否反转语义（如“退款项”，下降是好事） */
  invert: { type: Boolean, default: false },
  digits: { type: Number, default: 0 },
  icon: { type: String, default: 'DataLine' },
  tone: { type: String, default: 'primary' }, // primary | light | accent | warm
  hint: { type: String, default: '' }
})

const shown = ref(typeof props.value === 'number' ? 0 : props.value)
let raf = null

function format(num) {
  if (typeof num !== 'number') return num
  /* 千分位只加整数部分。原先两个分支写的是同一个表达式（都直接 replace 整串），
     既没用到 digits，也会在位数多的小数里插逗号（1234.5678 → 1,234.5,678）。 */
  const [int, frac] = num.toFixed(props.digits).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

function animate(to) {
  if (typeof to !== 'number') {
    shown.value = to
    return
  }
  cancelAnimationFrame(raf)
  const from = typeof shown.value === 'number' ? shown.value : 0
  const start = performance.now()
  const duration = 720
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - p, 3)
    shown.value = from + (to - from) * eased
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => animate(props.value))
watch(() => props.value, (value) => animate(value))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="stat ap-card ap-card--hover" :class="`stat--${tone}`">
    <div class="stat__icon">
      <el-icon :size="20"><component :is="icon" /></el-icon>
    </div>
    <div class="stat__main">
      <div class="stat__label">{{ label }}</div>
      <div class="stat__value num">
        {{ format(shown) }}<span class="stat__unit">{{ unit }}</span>
      </div>
      <div class="stat__foot">
        <span
          v-if="delta !== null"
          class="stat__delta"
          :class="(invert ? delta < 0 : delta >= 0) ? 'is-up' : 'is-down'"
        >
          <el-icon :size="12">
            <component :is="delta >= 0 ? 'CaretTop' : 'CaretBottom'" />
          </el-icon>
          {{ Math.abs(delta) }}%
        </span>
        <span class="stat__hint">{{ hint || '较昨日' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  cursor: default;
  position: relative;
  overflow: hidden;
}

.stat::after {
  content: '';
  position: absolute;
  inset: auto -30px -40px auto;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  opacity: 0.18;
  transition: transform 0.4s ease, opacity 0.4s ease;
}

.stat:hover::after {
  transform: scale(1.35);
  opacity: 0.28;
}

.stat__icon {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  transition: transform 0.3s ease;
}

.stat:hover .stat__icon {
  transform: translateY(-2px) rotate(-6deg);
}

.stat--primary .stat__icon {
  background: linear-gradient(135deg, #99b6b4, #7a9290);
}
.stat--primary::after {
  background: #99b6b4;
}
.stat--light .stat__icon {
  background: linear-gradient(135deg, #bacfce, #99b6b4);
}
.stat--light::after {
  background: #bacfce;
}
.stat--accent .stat__icon {
  background: linear-gradient(135deg, #d48982, #b26f69);
}
.stat--accent::after {
  background: #d48982;
}
.stat--warm .stat__icon {
  background: linear-gradient(135deg, #dfb199, #b98d76);
}
.stat--warm::after {
  background: #dfb199;
}

.stat__main {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.stat__label {
  font-size: 13px;
  color: var(--c-text-sub);
}

.stat__value {
  margin-top: 2px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.stat__unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: var(--c-text-mute);
}

.stat__foot {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat__delta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
}

.stat__delta.is-up {
  color: #668268;
}
.stat__delta.is-down {
  color: var(--c-accent-dark);
}

.stat__hint {
  font-size: 12px;
  color: var(--c-text-mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
