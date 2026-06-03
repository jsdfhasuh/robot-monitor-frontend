<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">模型管理</div><div class="small-muted">上传、注册 ONNX 模型，并绑定到摄像头。</div></div>
      <div class="toolbar-actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" @click="registerVisible = true">注册已有模型</el-button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">上传模型</div>
      <el-form label-width="120px">
        <el-form-item label="模型文件">
          <el-upload :auto-upload="false" :limit="1" accept=".onnx" :on-change="onFileChange" :on-remove="clearFile">
            <el-button>选择 .onnx 文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="模型名称"><el-input v-model="uploadForm.name" placeholder="robot_pose" /></el-form-item>
        <el-form-item label="模型类型">
          <el-select v-model="uploadForm.model_type" style="width:220px">
            <el-option label="YOLO Pose" value="yolo_pose" />
            <el-option label="YOLO" value="yolo" />
            <el-option label="Motion" value="motion" />
            <el-option label="ArUco" value="aruco" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型族"><el-input v-model="uploadForm.model_family" placeholder="yolo11_pose" /></el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="!selectedFile" @click="submitUpload">上传模型</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card">
      <el-table :data="models" stripe>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="file_name" label="文件" min-width="220" />
        <el-table-column prop="model_type" label="类型" width="120" />
        <el-table-column prop="model_family" label="模型族" width="150" />
        <el-table-column prop="input_size" label="输入" width="90" />
        <el-table-column prop="num_keypoints" label="关键点" width="90" />
        <el-table-column label="文件状态" width="110">
          <template #default="{ row }"><el-tag :type="row.file_exists === false ? 'danger' : 'success'">{{ row.file_exists === false ? '缺失' : '存在' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }"><el-button size="small" type="primary" plain @click="openBind(row)">绑定摄像头</el-button></template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="registerVisible" title="注册已有模型文件" width="560px">
      <el-form label-width="120px">
        <el-form-item label="文件名"><el-input v-model="registerForm.file_name" placeholder="robot_pose.onnx" /></el-form-item>
        <el-form-item label="模型类型">
          <el-select v-model="registerForm.model_type" style="width:100%">
            <el-option label="YOLO Pose" value="yolo_pose" />
            <el-option label="YOLO" value="yolo" />
            <el-option label="Motion" value="motion" />
            <el-option label="ArUco" value="aruco" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型族"><el-input v-model="registerForm.model_family" /></el-form-item>
        <el-form-item label="输入尺寸"><el-input-number v-model="registerForm.input_size" :min="1" /></el-form-item>
        <el-form-item label="类别数"><el-input-number v-model="registerForm.class_count" :min="1" /></el-form-item>
        <el-form-item label="关键点数"><el-input-number v-model="registerForm.num_keypoints" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="registerVisible=false">取消</el-button><el-button type="primary" @click="submitRegister">注册</el-button></template>
    </el-dialog>

    <el-dialog v-model="bindVisible" title="绑定模型到摄像头" width="560px">
      <el-form label-width="120px">
        <el-form-item label="模型"><el-input :model-value="currentModel?.name" disabled /></el-form-item>
        <el-form-item label="摄像头">
          <el-select v-model="bindCameraId" style="width:100%">
            <el-option v-for="camera in cameras" :key="camera.id" :label="camera.name" :value="camera.numeric_id || camera.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键点">
          <el-select v-model="targetKeypoints" multiple style="width:100%">
            <el-option v-for="i in 12" :key="i - 1" :label="`kp${i - 1}`" :value="i - 1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="bindVisible=false">取消</el-button><el-button type="primary" @click="submitBind">绑定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { bindModelToCamera, getCameraRecords, getModels, registerModel, uploadModel } from '../api/platform'
import type { CameraRecord, ModelRecord } from '../types/platform'
import type { DetectorType } from '../types/settings'

const models = ref<ModelRecord[]>([])
const cameras = ref<CameraRecord[]>([])
const selectedFile = ref<File | null>(null)
const registerVisible = ref(false)
const bindVisible = ref(false)
const currentModel = ref<ModelRecord | null>(null)
const bindCameraId = ref<string | number>('')
const targetKeypoints = ref<number[]>([2, 3, 4, 5])
const uploadForm = reactive<{ name: string; model_type: DetectorType; model_family: string }>({ name: '', model_type: 'yolo_pose', model_family: 'yolo11_pose' })
const registerForm = reactive<{ file_name: string; model_type: DetectorType; model_family: string; input_size: number; class_count: number; num_keypoints: number }>({ file_name: '', model_type: 'yolo_pose', model_family: 'yolo11_pose', input_size: 640, class_count: 1, num_keypoints: 6 })

function onFileChange(file: UploadFile) { selectedFile.value = file.raw || null }
function clearFile() { selectedFile.value = null }
async function submitUpload() {
  if (!selectedFile.value) return
  const form = new FormData()
  form.append('file', selectedFile.value)
  form.append('name', uploadForm.name || selectedFile.value.name.replace(/\.onnx$/i, ''))
  form.append('model_type', uploadForm.model_type)
  form.append('model_family', uploadForm.model_family)
  await uploadModel(form)
  ElMessage.success('模型已上传')
  await load()
}
async function submitRegister() {
  await registerModel(registerForm)
  registerVisible.value = false
  ElMessage.success('模型已注册')
  await load()
}
function openBind(model: ModelRecord) {
  currentModel.value = model
  bindCameraId.value = cameras.value[0]?.numeric_id || cameras.value[0]?.id || ''
  bindVisible.value = true
}
async function submitBind() {
  if (!currentModel.value || !bindCameraId.value) return
  await bindModelToCamera({ camera_id: Number(bindCameraId.value), model_id: currentModel.value.id, extra_config: { providers: ['CPUExecutionProvider'], target_keypoints: targetKeypoints.value, keypoint_conf_threshold: 0.25 } })
  bindVisible.value = false
  ElMessage.success('模型已绑定到摄像头')
}
async function load() {
  const [modelRows, cameraRows] = await Promise.all([getModels(), getCameraRecords()])
  models.value = modelRows
  cameras.value = cameraRows
}
onMounted(load)
</script>
