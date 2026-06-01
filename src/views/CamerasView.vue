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
        <el-table-column prop="rtsp_url" label="RTSP 地址" min-width="260" show-overflow-tooltip />
        <el-table-column label="启用" width="90"><template #default="{ row }"><el-switch v-model="row.enabled" /></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="cameraType(row.status)">{{ cameraText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="last_online" label="最后在线" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="edit(row)">编辑</el-button>
            <el-button size="small" type="primary" plain @click="test(row.id)">测试连接</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑摄像头' : '新增摄像头'" width="620px">
      <el-form label-width="110px">
        <el-form-item label="摄像头名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="RTSP 地址"><el-input v-model="form.rtsp_url" /></el-form-item>
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
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { getCameraRecords, saveCameraRecord, testCameraConnection } from '../api/platform'
import type { CameraRecord } from '../types/platform'

const rows = ref<CameraRecord[]>([])
const dialogVisible = ref(false)
const form = reactive<CameraRecord>({ id: '', name: '', line: '', robot_id: '', robot_name: '', rtsp_url: '', enabled: true, status: 'online', last_online: '' })

function cameraType(status: CameraRecord['status']) { return status === 'online' ? 'success' : status === 'offline' ? 'info' : 'danger' }
function cameraText(status: CameraRecord['status']) { return status === 'online' ? '在线' : status === 'offline' ? '离线' : '异常' }
function resetForm() { Object.assign(form, { id: '', name: '', line: '', robot_id: '', robot_name: '', rtsp_url: '', enabled: true, status: 'online', last_online: '' }) }
function openCreate() { resetForm(); dialogVisible.value = true }
function edit(row: CameraRecord) { Object.assign(form, row); dialogVisible.value = true }
async function save() {
  await saveCameraRecord({ ...form })
  await load()
  dialogVisible.value = false
  ElMessage.success('摄像头配置已保存')
}
async function test(id: string) {
  const result = await testCameraConnection(id)
  ElMessage[result.ok ? 'success' : 'error'](result.message)
}
async function load() { rows.value = await getCameraRecords() }
onMounted(load)
</script>
