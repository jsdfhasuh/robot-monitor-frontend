<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">检测任务管理</div><div class="small-muted">配置每路摄像头使用的检测器、ROI 过滤方式、目标关节点和停机阈值。</div></div>
      <el-button type="primary" @click="openCreate">新增任务</el-button>
    </div>
    <div class="card">
      <el-table :data="rows" stripe>
        <el-table-column prop="name" label="任务名称" min-width="240" />
        <el-table-column prop="camera_name" label="摄像头" min-width="220" />
        <el-table-column prop="robot_name" label="机器人" width="160" />
        <el-table-column prop="detector_type" label="检测模式" width="130" />
        <el-table-column label="ROI 过滤" width="170"><template #default="{ row }">{{ roiModeText(row.roi_filter_mode) }}</template></el-table-column>
        <el-table-column label="目标关键点" width="160"><template #default="{ row }"><el-tag v-for="kp in row.target_keypoints" :key="kp" size="small" style="margin-right:4px">kp{{ kp }}</el-tag></template></el-table-column>
        <el-table-column prop="motion_threshold_px" label="位移阈值(px)" width="120" />
        <el-table-column prop="stop_seconds" label="停机时间(s)" width="120" />
        <el-table-column label="启用" width="90"><template #default="{ row }"><el-switch v-model="row.enabled" /></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="taskStatusType(row.status)">{{ taskStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="260" fixed="right"><template #default="{ row }"><el-button size="small" @click="edit(row)">编辑</el-button><el-button size="small" type="success" plain @click="start(row)">启动</el-button><el-button size="small" type="warning" plain @click="stop(row)">停止</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑检测任务' : '新增检测任务'" width="720px">
      <el-form label-width="130px">
        <el-form-item label="任务名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="摄像头"><el-input v-model="form.camera_name" placeholder="后端接入后可替换成摄像头下拉" /></el-form-item>
        <el-form-item label="机器人"><el-input v-model="form.robot_name" /></el-form-item>
        <el-form-item label="检测模式"><el-select v-model="form.detector_type"><el-option label="YOLO Pose" value="yolo_pose" /><el-option label="传统运动检测" value="motion" /><el-option label="混合检测" value="hybrid" /></el-select></el-form-item>
        <el-form-item label="ROI 过滤模式"><el-select v-model="form.roi_filter_mode"><el-option label="不使用 ROI" value="disabled" /><el-option label="只统计 ROI 内关键点" value="filter_keypoints" /><el-option label="只统计 ROI 内目标框" value="filter_bbox" /></el-select></el-form-item>
        <el-form-item label="目标关键点"><el-select v-model="form.target_keypoints" multiple><el-option v-for="i in 6" :key="i-1" :label="`kp${i-1}`" :value="i-1" /></el-select></el-form-item>
        <el-form-item label="位移阈值"><el-input-number v-model="form.motion_threshold_px" :min="0" :max="100" /></el-form-item>
        <el-form-item label="停机判定时间"><el-input-number v-model="form.stop_seconds" :min="1" :max="600" /></el-form-item>
        <el-form-item label="是否启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { getDetectTasks, saveDetectTask, startDetectTask, stopDetectTask } from '../api/platform'
import type { DetectTaskRecord } from '../types/platform'

const rows = ref<DetectTaskRecord[]>([])
const dialogVisible = ref(false)
const form = reactive<DetectTaskRecord>({ id: '', name: '', camera_id: '', camera_name: '', robot_id: '', robot_name: '', detector_type: 'yolo_pose', roi_filter_mode: 'filter_keypoints', target_keypoints: [2,3,4,5], stop_seconds: 30, motion_threshold_px: 4, enabled: true, status: 'running' })
function roiModeText(mode: DetectTaskRecord['roi_filter_mode']) { return mode === 'disabled' ? '不使用 ROI' : mode === 'filter_keypoints' ? 'ROI 内关键点' : 'ROI 内目标框' }
function taskStatusType(status: DetectTaskRecord['status']) { return status === 'running' ? 'success' : status === 'paused' ? 'warning' : 'danger' }
function taskStatusText(status: DetectTaskRecord['status']) { return status === 'running' ? '运行中' : status === 'paused' ? '已暂停' : '异常' }
function resetForm() { Object.assign(form, { id: '', name: '', camera_id: '', camera_name: '', robot_id: '', robot_name: '', detector_type: 'yolo_pose', roi_filter_mode: 'filter_keypoints', target_keypoints: [2,3,4,5], stop_seconds: 30, motion_threshold_px: 4, enabled: true, status: 'running' }) }
function openCreate() { resetForm(); dialogVisible.value = true }
function edit(row: DetectTaskRecord) { Object.assign(form, structuredClone(row)); dialogVisible.value = true }
async function save() {
  await saveDetectTask({ ...form, id: form.id || `task_${Date.now()}` })
  const idx = rows.value.findIndex((item) => item.id === form.id)
  if (idx >= 0) rows.value[idx] = structuredClone(form)
  else rows.value.unshift({ ...structuredClone(form), id: `task_${Date.now()}` })
  dialogVisible.value = false
  ElMessage.success('检测任务已保存')
}
async function start(row: DetectTaskRecord) { await startDetectTask(row.camera_id); row.status = 'running'; ElMessage.success('检测 worker 已启动') }
async function stop(row: DetectTaskRecord) { await stopDetectTask(row.camera_id); row.status = 'paused'; ElMessage.success('检测 worker 已停止') }
async function load() { rows.value = await getDetectTasks() }
onMounted(load)
</script>
