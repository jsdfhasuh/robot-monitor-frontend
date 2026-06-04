<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">摄像头管理</div><div class="small-muted">管理 RTSP 摄像头、绑定机器人、测试连接。</div></div>
      <el-button type="primary" @click="openCreate">新增摄像头</el-button>
    </div>
    <div class="card">
      <el-table :data="rows" stripe>
        <el-table-column prop="name" label="摄像头名称" min-width="220" />
        <el-table-column prop="line" label="产线" width="100" />
        <el-table-column prop="robot_name" label="绑定机器人" width="150" />
        <el-table-column label="RTSP 地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.rtsp_url_masked || row.rtsp_url || '-' }}</template>
        </el-table-column>
        <el-table-column label="启用" width="90"><template #default="{ row }"><el-switch v-model="row.enabled" /></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="cameraType(row.status)">{{ cameraText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="last_online" label="最后在线" width="180" />
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="edit(row)">编辑</el-button>
            <el-button size="small" type="primary" plain @click="test(row)">测试</el-button>
            <el-button size="small" type="success" plain @click="start(row)">启动</el-button>
            <el-button size="small" type="warning" plain @click="stop(row)">停止</el-button>
            <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑摄像头' : '新增摄像头'" width="660px">
      <el-form label-width="120px">
        <el-form-item label="摄像头名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="RTSP 地址">
          <el-input v-model="form.rtsp_url" placeholder="rtsp://192.168.100.76:8554/cam1 或 192.168.100.76:8554/cam1" />
        </el-form-item>
        <el-form-item label="RTSP 用户名">
          <el-input v-model="rtspAuth.username" autocomplete="off" placeholder="可选，例如 admin" />
        </el-form-item>
        <el-form-item label="RTSP 密码">
          <el-input v-model="rtspAuth.password" type="password" show-password autocomplete="new-password" placeholder="可选，保存时会拼入 RTSP 地址" />
        </el-form-item>
        <el-form-item label="产线"><el-input v-model="form.line" /></el-form-item>
        <el-form-item label="机器人编号"><el-input v-model="form.robot_id" /></el-form-item>
        <el-form-item label="机器人名称"><el-input v-model="form.robot_name" /></el-form-item>
        <el-form-item label="是否启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { deleteCameraRecord, getCameraRecords, saveCameraRecord, startDetectTask, stopDetectTask, testCameraConnection } from '../api/platform'
import type { CameraRecord } from '../types/platform'

const rows = ref<CameraRecord[]>([])
const dialogVisible = ref(false)
const form = reactive<CameraRecord>({ id: '', name: '', line: '', robot_id: '', robot_name: '', rtsp_url: '', enabled: true, status: 'online', last_online: '' })
const rtspAuth = reactive({ username: '', password: '' })

function cameraType(status: CameraRecord['status']) { return status === 'online' ? 'success' : status === 'offline' ? 'info' : 'danger' }
function cameraText(status: CameraRecord['status']) { return status === 'online' ? '在线' : status === 'offline' ? '离线' : '异常' }
function ensureRtspScheme(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `rtsp://${trimmed}`
}
function fillRtspAuthFromUrl(value: string) {
  rtspAuth.username = ''
  rtspAuth.password = ''
  const urlValue = ensureRtspScheme(value)
  if (!urlValue) return
  try {
    const parsed = new URL(urlValue)
    rtspAuth.username = decodeURIComponent(parsed.username || '')
    rtspAuth.password = decodeURIComponent(parsed.password || '')
    parsed.username = ''
    parsed.password = ''
    form.rtsp_url = parsed.toString()
  } catch {
    form.rtsp_url = value
  }
}
function buildRtspUrl() {
  const urlValue = ensureRtspScheme(form.rtsp_url)
  if (!urlValue) return ''
  if (!rtspAuth.username && !rtspAuth.password) return urlValue
  try {
    const parsed = new URL(urlValue)
    parsed.username = rtspAuth.username
    parsed.password = rtspAuth.password
    return parsed.toString()
  } catch {
    return urlValue
  }
}
function resetForm() {
  Object.assign(form, { id: '', name: '', line: '', robot_id: '', robot_name: '', rtsp_url: '', enabled: true, status: 'online', last_online: '' })
  rtspAuth.username = ''
  rtspAuth.password = ''
}
function openCreate() { resetForm(); dialogVisible.value = true }
function edit(row: CameraRecord) {
  Object.assign(form, row)
  fillRtspAuthFromUrl(row.rtsp_url || '')
  dialogVisible.value = true
}
async function save() {
  const payload = { ...form, rtsp_url: buildRtspUrl() }
  if (!payload.rtsp_url) {
    ElMessage.error('请填写 RTSP 地址')
    return
  }
  try {
    await saveCameraRecord(payload)
    await load()
    dialogVisible.value = false
    ElMessage.success('摄像头配置已保存')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '摄像头配置保存失败')
  }
}
async function test(row: CameraRecord) {
  const result = await testCameraConnection(row)
  ElMessage[result.ok ? 'success' : 'error'](result.message)
}
async function start(row: CameraRecord) { await startDetectTask(row); ElMessage.success('摄像头 Worker 已启动'); await load() }
async function stop(row: CameraRecord) { await stopDetectTask(row); ElMessage.success('摄像头 Worker 已停止'); await load() }
async function remove(row: CameraRecord) {
  await ElMessageBox.confirm(`确认删除摄像头「${row.name}」？后端会先停止 Worker。`, '删除摄像头', { type: 'warning' })
  await deleteCameraRecord(row)
  ElMessage.success('摄像头已删除')
  await load()
}
async function load() { rows.value = await getCameraRecords() }
onMounted(load)
</script>
