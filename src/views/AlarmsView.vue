<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">告警中心</div><div class="small-muted">查看停机、离线、检测异常、恢复运行记录，支持标记处理。</div></div>
      <div class="toolbar-actions"><el-select v-model="filter" style="width:150px"><el-option label="全部状态" value="all" /><el-option label="待处理" value="pending" /><el-option label="处理中" value="processing" /><el-option label="已处理" value="resolved" /></el-select><el-button @click="load">刷新</el-button></div>
    </div>
    <div class="card">
      <el-table :data="filteredRows" stripe>
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="camera_name" label="摄像头" min-width="220" />
        <el-table-column prop="robot_name" label="机器人" width="160" />
        <el-table-column label="事件类型" width="120"><template #default="{ row }"><el-tag :type="eventType(row.type)">{{ eventText(row.type) }}</el-tag></template></el-table-column>
        <el-table-column label="等级" width="100"><template #default="{ row }"><el-tag :type="levelType(row.level)">{{ levelText(row.level) }}</el-tag></template></el-table-column>
        <el-table-column label="持续时间" width="120"><template #default="{ row }">{{ row.duration_seconds }}s</template></el-table-column>
        <el-table-column prop="reason" label="判断原因" min-width="320" show-overflow-tooltip />
        <el-table-column label="处理状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right"><template #default="{ row }"><el-button size="small" @click="detail(row)">详情</el-button><el-button size="small" type="success" plain :disabled="row.status==='resolved'" @click="resolve(row)">标记处理</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="告警详情" width="720px">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item label="告警编号">{{ current.id }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ current.time }}</el-descriptions-item>
        <el-descriptions-item label="摄像头">{{ current.camera_name }}</el-descriptions-item>
        <el-descriptions-item label="机器人">{{ current.robot_name }}</el-descriptions-item>
        <el-descriptions-item label="事件类型">{{ eventText(current.type) }}</el-descriptions-item>
        <el-descriptions-item label="持续时间">{{ current.duration_seconds }}s</el-descriptions-item>
        <el-descriptions-item label="判断原因" :span="2">{{ current.reason }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAlarmRecords, resolveAlarm } from '../api/platform'
import type { AlarmRecord } from '../types/platform'

const rows = ref<AlarmRecord[]>([])
const filter = ref<'all' | AlarmRecord['status']>('all')
const detailVisible = ref(false)
const current = ref<AlarmRecord | null>(null)
const filteredRows = computed(() => filter.value === 'all' ? rows.value : rows.value.filter((item) => item.status === filter.value))
function eventType(type: AlarmRecord['type']) { return type === 'STOPPED' ? 'danger' : type === 'OFFLINE' ? 'warning' : type === 'ERROR' ? 'danger' : 'success' }
function eventText(type: AlarmRecord['type']) { return type === 'STOPPED' ? '确认停机' : type === 'OFFLINE' ? '摄像头离线' : type === 'ERROR' ? '检测异常' : '恢复运行' }
function levelType(level: AlarmRecord['level']) { return level === 'critical' ? 'danger' : level === 'warning' ? 'warning' : 'info' }
function levelText(level: AlarmRecord['level']) { return level === 'critical' ? '严重' : level === 'warning' ? '警告' : '信息' }
function statusType(status: AlarmRecord['status']) { return status === 'resolved' ? 'success' : status === 'processing' ? 'warning' : 'danger' }
function statusText(status: AlarmRecord['status']) { return status === 'resolved' ? '已处理' : status === 'processing' ? '处理中' : '待处理' }
function detail(row: AlarmRecord) { current.value = row; detailVisible.value = true }
async function resolve(row: AlarmRecord) { await resolveAlarm(row.id); row.status = 'resolved'; ElMessage.success('已标记处理') }
async function load() { rows.value = await getAlarmRecords() }
onMounted(load)
</script>
