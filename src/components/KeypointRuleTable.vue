<template>
  <div class="card">
    <div class="card-title">关节点规则</div>
    <el-table :data="model" border size="small">
      <el-table-column prop="index" label="序号" width="70" />
      <el-table-column prop="name" label="名称" min-width="120"><template #default="{ row }"><el-input v-model="row.name" /></template></el-table-column>
      <el-table-column prop="enabled" label="启用" width="90"><template #default="{ row }"><el-switch v-model="row.enabled" /></template></el-table-column>
      <el-table-column prop="motion_threshold_px" label="位移阈值(px)" min-width="130"><template #default="{ row }"><el-input-number v-model="row.motion_threshold_px" :min="1" size="small" /></template></el-table-column>
      <el-table-column prop="confidence_threshold" label="置信度阈值" min-width="130"><template #default="{ row }"><el-input-number v-model="row.confidence_threshold" :min="0" :max="1" :step="0.05" size="small" /></template></el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import type { KeypointRule } from '../types/settings'
const model = defineModel<KeypointRule[]>({ required: true })
</script>
