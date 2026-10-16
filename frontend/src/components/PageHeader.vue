<script setup>
defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  feature: { type: String, default: '' },
  tags: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="page-head">
    <div class="page-head__text">
      <div class="page-head__title-row">
        <h2 class="page-head__title">{{ title }}</h2>
        <span v-if="feature" class="soft-tag soft-tag--primary mono">{{ feature }}</span>
        <span v-for="tag in tags" :key="tag" class="soft-tag soft-tag--warm">{{ tag }}</span>
      </div>
      <p v-if="desc" class="page-head__desc">{{ desc }}</p>
    </div>
    <div class="page-head__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-head__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-head__title {
  font-size: 20px;
  letter-spacing: -0.3px;
}

.page-head__desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--c-text-sub);
  max-width: 780px;
  line-height: 1.6;
}

.page-head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
