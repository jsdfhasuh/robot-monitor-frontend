<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">配置版本管理</div><div class="small-muted">保存、应用、回滚检测参数、ROI、关节点规则，避免现场调参混乱。</div></div>
      <el-button type="primary" @click="createVersion">保存新版本</el-button>
    </div>

    <div class="version-grid">
      <div v-for="item in rows" :key="item.id" class="card version-card" :class="{ applied: item.applied }">
        <div class="version-head">
          <div><div class="version-title">{{ item.version }} {{ item.name }}</div><div class="small-muted">{{ item.created_at }} / {{ item.created_by }}</div></div>
          <el-tag v-if="item.applied" type="success">当前应用</el-tag>
        </div>
        <p class="version-desc">{{ item.description }}</p>
        <div class="version-meta">
          <span>检测器：{{ item.detector_type }}</span>
          <span>ROI：{{ item.roi_count }}</span>
          <span>关节点：{{ item.keypoint_count }}</span>
        </div>
        <div class="version-actions">
          <el-button size="small" @click="compare(item)">对比</el-button>
          <el-button size="small" type="primary" plain :disabled="item.applied" @click="apply(item)">应用</el-button>
          <el-button size="small" type="warning" plain @click="rollback(item)">回滚到此版本</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="compareVisible" title="版本对比" width="760px">
      <div v-if="current" class="compare-box">
        <div class="card mini-card"><b>当前选择</b><p>{{ current.version }} {{ current.name }}</p><p class="small-muted">{{ current.description }}</p></div>
        <div class="compare-table">
          <div><span>检测模式</span><b>{{ current.detector_type }}</b></div>
          <div><span>ROI 数量</span><b>{{ current.roi_count }}</b></div>
          <div><span>关节点数量</span><b>{{ current.keypoint_count }}</b></div>
          <div><span>创建时间</span><b>{{ current.created_at }}</b></div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { applyConfigVersion, getConfigVersions, rollbackConfigVersion } from '../api/platform'
import type { ConfigVersionRecord } from '../types/platform'

const rows = ref<ConfigVersionRecord[]>([])
const compareVisible = ref(false)
const current = ref<ConfigVersionRecord | null>(null)
function createVersion() { ElMessage.info('前端已预留保存新版本入口，后端接 /api/config-versions/create 即可') }
function compare(item: ConfigVersionRecord) { current.value = item; compareVisible.value = true }
async function apply(item: ConfigVersionRecord) { await applyConfigVersion(item.id); rows.value.forEach((row) => row.applied = row.id === item.id); ElMessage.success(`已应用 ${item.version}`) }
async function rollback(item: ConfigVersionRecord) { await rollbackConfigVersion(item.id); rows.value.forEach((row) => row.applied = row.id === item.id); ElMessage.success(`已回滚到 ${item.version}`) }
async function load() { rows.value = await getConfigVersions() }
onMounted(load)
</script>
