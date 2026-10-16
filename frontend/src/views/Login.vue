<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { usePolicyStore } from '../stores/policy'
import { demoMeta } from '../mock'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const policy = usePolicyStore()

const formRef = ref(null)
const loading = ref(false)
const remember = ref(true)

const form = reactive({
  account: '',
  password: ''
})

const rules = {
  account: [
    { required: true, message: '请输入管理员账号', trigger: 'blur' },
    { min: 3, message: '账号至少 3 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ]
}

/* 演示账号的唯一来源是 auth store 里那份账号表：原先这里把账号和密码又抄了一遍
   （admin/admin123、ops/ops123），auth store 里换密码或加账号，这排提示条不动——
   点一下「自动填入」，填进去的就是过期的密码。tone 只管配色，不是账号数据，留在本页。 */
const DEMO_TONES = { super: 'accent', ops: 'primary' }
const demoAccounts = computed(() =>
  auth.accounts.map((item) => ({
    account: item.account,
    password: item.password,
    label: item.info.role,
    tone: DEMO_TONES[item.info.roleKey] || 'primary'
  }))
)

/* 「记住账号」原先只是个没有任何行为的开关：勾不勾都一样，刷新回来还是空的。
   它只记账号、不记密码——密码落盘是另一个量级的安全问题，演示环境也不该开这个头。 */
const REMEMBER_KEY = 'ap_admin_remember_account'

onMounted(() => {
  const savedAccount = localStorage.getItem(REMEMBER_KEY)
  if (savedAccount) form.account = savedAccount
})

function onRememberChange(value) {
  if (!value) localStorage.removeItem(REMEMBER_KEY)
}

function fill(item) {
  form.account = item.account
  form.password = item.password
  ElMessage.success(`已填入演示账号：${item.account}`)
}

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  loading.value = true
  try {
    const admin = await auth.login({ account: form.account, password: form.password })
    if (remember.value) localStorage.setItem(REMEMBER_KEY, admin.account)
    else localStorage.removeItem(REMEMBER_KEY)
    ElMessage.success(`欢迎回来，${admin.name}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (err) {
    ElMessage.error(err.message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="login__bg">
      <span class="blob blob--1"></span>
      <span class="blob blob--2"></span>
      <span class="blob blob--3"></span>
      <span class="grid-mask"></span>
    </div>

    <!-- 左侧品牌区 -->
    <section class="login__brand">
      <div class="brand__mark">
        <el-icon :size="22"><Camera /></el-icon>
      </div>
      <h1 class="brand__title">AI 照相馆</h1>
      <p class="brand__sub">运营管理后台 · Admin Console</p>

      <ul class="brand__list">
        <li>
          <el-icon><PictureRounded /></el-icon>
          <span>模板素材 / 证件照规格 / 主题风格包统一管理</span>
        </li>
        <li>
          <el-icon><Wallet /></el-icon>
          <span>会员规格、订单账单、退款售后全链路</span>
        </li>
        <li>
          <el-icon><Cloudy /></el-icon>
          <span>云增强任务处置与上传文件销毁留痕</span>
        </li>
        <li>
          <el-icon><Document /></el-icon>
          <span>操作审计可追溯，权限按角色下发</span>
        </li>
      </ul>

      <div class="brand__foot">
        <span class="soft-tag soft-tag--warm">功能报告 {{ demoMeta.version }}</span>
        <span class="soft-tag soft-tag--primary">{{ demoMeta.featureCount }} 项功能点</span>
      </div>
    </section>

    <!-- 右侧登录卡 -->
    <section class="login__panel">
      <div class="login-card">
        <header class="login-card__head">
          <h2>管理员登录</h2>
          <p>管理人员账号由开发人员统一分配，系统不提供自助注册</p>
        </header>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          size="large"
          @submit.prevent="submit"
        >
          <el-form-item label="管理员账号" prop="account">
            <el-input v-model="form.account" placeholder="请输入账号" clearable @keyup.enter="submit">
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="登录密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              @keyup.enter="submit"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <div class="login-card__row">
            <el-checkbox v-model="remember" @change="onRememberChange">记住账号</el-checkbox>
            <span class="login-card__link" @click="ElMessage.info('请联系开发人员重置密码')">
              忘记密码？
            </span>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-card__submit"
            :loading="loading"
            @click="submit"
          >
            {{ loading ? '正在验证…' : '登 录' }}
          </el-button>
        </el-form>

        <div class="login-card__demo">
          <div class="login-card__demo-title">
            <el-icon :size="13"><MagicStick /></el-icon>
            演示账号（点击自动填入）
          </div>
          <div class="login-card__demo-list">
            <button
              v-for="item in demoAccounts"
              :key="item.account"
              class="demo-chip"
              :class="`demo-chip--${item.tone}`"
              @click="fill(item)"
            >
              <span class="demo-chip__name mono">{{ item.account }}</span>
              <span class="demo-chip__pass mono">/ {{ item.password }}</span>
              <span class="demo-chip__label">{{ item.label }}</span>
            </button>
          </div>
          <p class="login-card__tip">
            <el-icon :size="12"><InfoFilled /></el-icon>
            演示 Demo 未连接后端，账号校验在本地完成；失败 {{ policy.maxFail }} 次将锁定 {{ policy.lockMinutes }} 分钟（仅正式环境生效）
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  overflow: hidden;
  background: linear-gradient(135deg, #eef6f5 0%, #f7fbfa 40%, #fbf2ee 100%);
}

@media (max-width: 980px) {
  .login {
    grid-template-columns: 1fr;
  }
  .login__brand {
    display: none;
  }
}

/* ---- 背景装饰 ---- */
.login__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: float 14s ease-in-out infinite;
}

.blob--1 {
  width: 420px;
  height: 420px;
  left: -120px;
  top: -100px;
  background: rgba(153, 182, 180, 0.55);
}

.blob--2 {
  width: 360px;
  height: 360px;
  right: -80px;
  bottom: -60px;
  background: rgba(212, 137, 130, 0.32);
  animation-delay: -4s;
}

.blob--3 {
  width: 300px;
  height: 300px;
  left: 38%;
  bottom: -120px;
  background: rgba(223, 177, 153, 0.4);
  animation-delay: -8s;
}

.grid-mask {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(153, 182, 180, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(153, 182, 180, 0.16) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 30% 30%, #000 0%, transparent 72%);
}

@keyframes float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(18px, -22px, 0) scale(1.06);
  }
}

/* ---- 品牌区 ---- */
.login__brand {
  position: relative;
  z-index: 1;
  padding: 76px 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.brand__mark {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #99b6b4, #d48982);
  box-shadow: 0 16px 30px -16px rgba(47, 62, 61, 0.7);
  margin-bottom: 8px;
}

.brand__title {
  font-size: 40px;
  letter-spacing: -1px;
}

.brand__sub {
  margin: 0;
  color: var(--c-text-sub);
  font-size: 14px;
  letter-spacing: 0.6px;
}

.brand__list {
  list-style: none;
  margin: 26px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 460px;
}

.brand__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--c-text-sub);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: var(--sh-1);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.brand__list li:hover {
  transform: translateX(6px);
  border-color: var(--c-primary-light);
  box-shadow: var(--sh-2);
}

.brand__list li .el-icon {
  color: var(--c-primary-deep);
}

.brand__foot {
  display: flex;
  gap: 8px;
  margin-top: 24px;
}

/* ---- 登录卡 ---- */
.login__panel {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  padding: 40px 32px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 22px;
  padding: 32px 32px 26px;
  box-shadow: 0 30px 60px -32px rgba(47, 62, 61, 0.5);
  backdrop-filter: blur(10px);
  animation: card-in 0.5s ease;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-card__head h2 {
  font-size: 22px;
  letter-spacing: -0.4px;
}

.login-card__head p {
  margin: 6px 0 22px;
  font-size: 12.5px;
  color: var(--c-text-sub);
  line-height: 1.6;
}

.login-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 18px;
}

.login-card__link {
  font-size: 13px;
  color: var(--c-primary-deep);
  cursor: pointer;
  transition: color 0.2s ease;
}

.login-card__link:hover {
  color: var(--c-accent-dark);
  text-decoration: underline;
}

.login-card__submit {
  width: 100%;
  letter-spacing: 4px;
  height: 44px;
  font-size: 15px;
}

.login-card__demo {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px dashed var(--c-border-strong);
}

.login-card__demo-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--c-text-sub);
  margin-bottom: 10px;
}

.login-card__demo-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.demo-chip {
  flex: 1 1 160px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--c-border);
  background: #fff;
  cursor: pointer;
  transition: all 0.24s ease;
  text-align: left;
}

.demo-chip:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh-2);
}

.demo-chip--primary:hover {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
}

.demo-chip--accent:hover {
  border-color: var(--c-accent);
  background: var(--c-accent-soft);
}

.demo-chip__name {
  font-weight: 600;
  color: var(--c-text);
}

.demo-chip__pass {
  color: var(--c-text-mute);
}

.demo-chip__label {
  margin-left: auto;
  font-size: 11px;
  color: var(--c-text-mute);
  white-space: nowrap;
}

.login-card__tip {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  margin: 14px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--c-text-mute);
}
</style>
