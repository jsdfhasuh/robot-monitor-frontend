<template>
  <div class="page-grid" v-if="settings && roiPayload">
    <SettingsForms v-model="settings" />
    <KeypointRuleTable v-model="settings.keypoint_rules" />

    <div class="card">
      <div class="card-title">多 ROI 配置</div>
      <div class="two-col">
        <RoiEditor v-model:rois="roiPayload.rois" :active-roi-id="activeRoiId" :camera-label="selectedCameraLabel" :camera-id="cameraId" />
        <div>
          <el-form label-width="120px">
            <el-form-item label="摄像头选择">
              <el-select v-model="cameraId" @change="loadRoi" style="width:100%">
                <el-option v-for="c in cameras" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="ROI过滤模式">
              <el-radio-group v-model="roiPayload.roi_filter_mode">
                <el-radio value="disabled">禁用</el-radio>
                <el-radio value="filter_keypoints">只统计 ROI 内关键点</el-radio>
                <el-radio value="filter_bbox">只统计 ROI 内目标框</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>

          <el-table :data="roiPayload.rois" height="235" highlight-current-row @current-change="(r:any)=> r && (activeRoiId = r.id)">
            <el-table-column label="ROI名称" min-width="140"><template #default="{ row }"><span :style="{color: row.color, fontWeight: 700}">●</span> {{ row.name }}</template></el-table-column>
            <el-table-column label="启用" width="90"><template #default="{ row }"><el-switch v-model="row.enabled" /></template></el-table-column>
            <el-table-column label="绑定keypoints" min-width="180"><template #default="{ row }">{{ row.keypoint_indexes.join(',') || '-' }}</template></el-table-column>
            <el-table-column label="操作" width="80"><template #default="{ row }"><el-button text type="primary" @click="activeRoiId=row.id">编辑</el-button></template></el-table-column>
          </el-table>

          <div v-if="activeRoi" style="margin-top:16px" class="card">
            <div class="card-title">当前 ROI</div>
            <el-form label-width="130px">
              <el-form-item label="ROI名称"><el-input v-model="activeRoi.name" /></el-form-item>
              <el-form-item label="是否启用"><el-switch v-model="activeRoi.enabled" /></el-form-item>
              <el-form-item label="绑定keypoints">
                <el-select v-model="activeRoi.keypoint_indexes" multiple style="width:100%">
                  <el-option v-for="r in settings.keypoint_rules" :key="r.index" :label="`${r.index} - ${r.name}`" :value="r.index" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>

          <div style="display:flex; gap:12px; margin-top:14px; flex-wrap:wrap">
            <el-button type="primary" plain @click="addRoi">新增 ROI</el-button>
            <el-button type="danger" plain @click="deleteRoi">删除 ROI</el-button>
            <el-button @click="undoPoint">撤销点</el-button>
            <el-button @click="clearActive">清空当前</el-button>
            <el-button type="primary" @click="saveRoi">保存 ROI</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-actions">
      <el-button @click="resetAll">恢复默认</el-button>
      <el-button type="primary" plain @click="saveAll">保存配置</el-button>
      <el-button type="primary" @click="applyAll">保存并应用</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import SettingsForms from '../components/SettingsForms.vue'
import KeypointRuleTable from '../components/KeypointRuleTable.vue'
import RoiEditor from '../components/RoiEditor.vue'
import type { AppSettings, CameraOption, CameraRoiPayload, RoiConfig } from '../types/settings'
import { applySettings, getCameraRoi, getCameras, getSettings, resetSettings, saveCameraRoi, saveSettings } from '../api/settings'

const settings = ref<AppSettings>()
const roiPayload = ref<CameraRoiPayload>()
const cameras = ref<CameraOption[]>([])
const cameraId = ref('cam_001')
const activeRoiId = ref('')
const selectedCameraLabel = computed(() => cameras.value.find(c => c.id === cameraId.value)?.name || cameraId.value)
const activeRoi = computed(() => roiPayload.value?.rois.find(r => r.id === activeRoiId.value))

async function loadRoi() {
  roiPayload.value = await getCameraRoi(cameraId.value)
  activeRoiId.value = roiPayload.value.rois[0]?.id || ''
}
function addRoi() {
  if (!roiPayload.value) return
  const id = `roi_${Date.now()}`
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea']
  const roi: RoiConfig = { id, name: `roi_${roiPayload.value.rois.length + 1}`, enabled: true, type: 'polygon', color: colors[roiPayload.value.rois.length % colors.length], points: [], keypoint_indexes: [] }
  roiPayload.value.rois.push(roi)
  activeRoiId.value = id
}
function deleteRoi() {
  if (!roiPayload.value) return
  roiPayload.value.rois = roiPayload.value.rois.filter(r => r.id !== activeRoiId.value)
  activeRoiId.value = roiPayload.value.rois[0]?.id || ''
}
function undoPoint() { activeRoi.value?.points.pop() }
function clearActive() { if (activeRoi.value) activeRoi.value.points = [] }
async function saveRoi() { if (!roiPayload.value) return; await saveCameraRoi(cameraId.value, roiPayload.value); ElMessage.success('ROI 已保存') }
async function saveAll() { if (!settings.value) return; await saveSettings(settings.value); ElMessage.success('配置已保存') }
async function applyAll() { if (!settings.value) return; await applySettings(settings.value); ElMessage.success('配置已保存并应用') }
async function resetAll() { settings.value = await resetSettings(); ElMessage.success('已恢复默认配置') }
onMounted(async () => { cameras.value = await getCameras(); settings.value = await getSettings(); await loadRoi() })
</script>
