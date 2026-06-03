<template>
  <div class="page-grid" v-if="rulePayload">
    <div class="card page-toolbar">
      <div>
        <div class="card-title">规则面板</div>
        <div class="small-muted">摄像头级停机判断规则</div>
      </div>
      <div class="toolbar-actions">
        <el-select v-model="cameraId" :loading="loadingCameras" filterable style="width: 300px" @change="loadRule">
          <el-option v-for="camera in cameras" :key="camera.id" :label="camera.name" :value="camera.id" />
        </el-select>
        <el-button :icon="Refresh" :loading="loadingRule" @click="loadAll">刷新</el-button>
        <el-button type="primary" :icon="DocumentChecked" :loading="saving" @click="saveRule">保存规则</el-button>
      </div>
    </div>

    <div class="rules-layout">
      <div class="card">
        <div class="rule-head">
          <div>
            <div class="rule-title">{{ selectedCameraLabel }}</div>
            <div class="rule-meta">
              <span>检测器：{{ detectorText(rulePayload.detector_type) }}</span>
              <span>配置版本：{{ rulePayload.config_version || '-' }}</span>
              <span>更新时间：{{ rulePayload.updated_at || '-' }}</span>
            </div>
          </div>
          <el-tag :type="statusTagType(rulePayload.current.status)" size="large">{{ stateText(rulePayload.current.status) }}</el-tag>
        </div>
        <div class="current-grid">
          <div>
            <span>运动分数</span>
            <b>{{ formatNumber(rulePayload.current.motion_distance) }}</b>
          </div>
          <div>
            <span>运动阈值</span>
            <b>{{ rulePayload.rule.motion_threshold }}</b>
          </div>
          <div>
            <span>停机时间</span>
            <b>{{ rulePayload.rule.stop_seconds }}s</b>
          </div>
          <div>
            <span>分数来源</span>
            <b>{{ movementScoreText(rulePayload.tracker.movement_score) }}</b>
          </div>
        </div>
        <el-alert
          v-if="rulePayload.current.message"
          :title="rulePayload.current.message"
          :type="rulePayload.current.status === 'STOPPED' ? 'warning' : 'info'"
          :closable="false"
          show-icon
          style="margin-top: 14px"
        />
      </div>

      <div class="card">
        <div class="card-title">复制规则</div>
        <el-form label-width="120px">
          <el-form-item label="目标摄像头">
            <el-select v-model="copyTargetIds" multiple filterable collapse-tags collapse-tags-tooltip style="width: 100%">
              <el-option v-for="camera in copyTargetCameras" :key="camera.id" :label="camera.name" :value="camera.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" plain :icon="CopyDocument" :disabled="!copyTargetIds.length" :loading="copying" @click="copyRule">
              复制到选中摄像头
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="rules-main">
      <div class="card">
        <div class="card-title">停机判断</div>
        <el-form label-width="150px" class="rule-form">
          <el-form-item label="运动阈值">
            <div class="number-line">
              <el-input-number v-model="rulePayload.rule.motion_threshold" :min="0" :max="999" :step="0.5" :precision="1" />
              <span class="small-muted">超过阈值判定为运行</span>
            </div>
          </el-form-item>
          <el-form-item label="停机持续时间">
            <div class="number-line">
              <el-input-number v-model="rulePayload.rule.stop_seconds" :min="1" :max="3600" :step="1" />
              <span class="small-muted">秒</span>
            </div>
          </el-form-item>
          <el-form-item label="丢失宽限时间">
            <div class="number-line">
              <el-input-number v-model="rulePayload.rule.unknown_seconds" :min="0" :max="600" :step="1" />
              <span class="small-muted">秒</span>
            </div>
          </el-form-item>
          <el-form-item label="连续确认帧数">
            <el-input-number v-model="rulePayload.rule.confirm_frames" :min="1" :max="120" :step="1" />
          </el-form-item>
          <el-form-item label="状态保持时间">
            <div class="number-line">
              <el-input-number v-model="rulePayload.rule.status_hold_seconds" :min="0" :max="600" :step="0.5" :precision="1" />
              <span class="small-muted">秒</span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <div class="card">
        <div class="card-title">Tracker 参数</div>
        <el-form label-width="150px" class="rule-form">
          <el-form-item label="运动分数">
            <el-select v-model="rulePayload.tracker.movement_score" style="width: 100%">
              <el-option v-for="option in movementScoreOptions" :key="option.value" :label="option.label" :value="option.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="统计窗口">
            <div class="number-line">
              <el-input-number v-model="rulePayload.tracker.window_seconds" :min="1" :max="3600" :step="1" />
              <span class="small-muted">秒</span>
            </div>
          </el-form-item>
          <el-form-item label="最小步长">
            <div class="number-line">
              <el-input-number v-model="rulePayload.tracker.min_step_px" :min="0" :max="100" :step="0.1" :precision="1" />
              <span class="small-muted">px</span>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="card">
      <div class="template-head">
        <div>
          <div class="card-title">规则模板</div>
          <div class="small-muted">{{ selectedTemplate ? selectedTemplate.description || selectedTemplate.name : '暂无模板' }}</div>
        </div>
        <div class="toolbar-actions">
          <el-button :icon="Plus" @click="openCreateTemplate">保存为模板</el-button>
          <el-button :icon="EditPen" :disabled="!selectedTemplate" @click="openUpdateTemplate">更新模板</el-button>
          <el-button type="danger" plain :icon="Delete" :disabled="!selectedTemplate" @click="removeTemplate">删除模板</el-button>
        </div>
      </div>

      <div class="template-grid">
        <el-form label-width="110px">
          <el-form-item label="模板">
            <el-select v-model="selectedTemplateId" :loading="loadingTemplates" filterable style="width: 100%">
              <el-option v-for="template in templates" :key="template.id" :label="template.name" :value="template.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="应用到">
            <el-select v-model="templateApplyIds" multiple filterable collapse-tags collapse-tags-tooltip style="width: 100%">
              <el-option v-for="camera in cameras" :key="camera.id" :label="camera.name" :value="camera.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Collection" :disabled="!selectedTemplate || !templateApplyIds.length" :loading="applyingTemplate" @click="loadTemplateToForm">
              载入表单
            </el-button>
            <el-button type="primary" :icon="Check" :disabled="!selectedTemplate || !templateApplyIds.length" :loading="applyingTemplate" @click="applyTemplate">
              应用模板
            </el-button>
          </el-form-item>
        </el-form>

        <el-table :data="templates" height="220" stripe highlight-current-row @current-change="selectTemplate">
          <el-table-column prop="name" label="模板名称" min-width="180" />
          <el-table-column label="检测器" width="120">
            <template #default="{ row }">{{ detectorText(row.detector_type) }}</template>
          </el-table-column>
          <el-table-column label="阈值" width="90">
            <template #default="{ row }">{{ row.rule.motion_threshold }}</template>
          </el-table-column>
          <el-table-column label="停机时间" width="100">
            <template #default="{ row }">{{ row.rule.stop_seconds }}s</template>
          </el-table-column>
          <el-table-column label="运动分数" min-width="170">
            <template #default="{ row }">{{ movementScoreText(row.tracker.movement_score) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="templateDialogVisible" :title="templateMode === 'create' ? '保存为规则模板' : '更新规则模板'" width="620px">
      <el-form label-width="110px">
        <el-form-item label="模板名称">
          <el-input v-model="templateForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="templateForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="检测器">
          <el-select v-model="templateForm.detector_type" style="width: 100%">
            <el-option label="YOLO Pose" value="yolo_pose" />
            <el-option label="YOLO" value="yolo" />
            <el-option label="ArUco" value="aruco" />
            <el-option label="Motion" value="motion" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingTemplate" @click="submitTemplate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Collection, CopyDocument, Delete, DocumentChecked, EditPen, Plus, Refresh } from '@element-plus/icons-vue'
import type { CameraOption, CameraRulePayload, DetectorType, MovementScore, RobotState, RuleTemplate } from '../types/settings'
import {
  applyRuleTemplate,
  copyCameraRule,
  createRuleTemplate,
  deleteRuleTemplate,
  getCameraRule,
  getCameras,
  getRuleTemplates,
  saveCameraRule,
  updateRuleTemplate
} from '../api/settings'

type TemplateForm = Omit<RuleTemplate, 'id'> & { id?: string | number }

const movementScoreOptions: Array<{ label: string; value: MovementScore }> = [
  { label: '总位移', value: 'total_displacement' },
  { label: '平均速度', value: 'avg_speed' },
  { label: '最大步长', value: 'max_step' },
  { label: '净位移', value: 'net_displacement' },
  { label: '关键点平均步长', value: 'keypoint_mean_step' },
  { label: '关键点最大步长', value: 'keypoint_max_step' },
  { label: '角度变化', value: 'angle_change' },
  { label: '原始分数', value: 'raw' }
]

const cameras = ref<CameraOption[]>([])
const cameraId = ref<string | number>('cam_001')
const rulePayload = ref<CameraRulePayload>()
const templates = ref<RuleTemplate[]>([])
const selectedTemplateId = ref<string | number>('')
const copyTargetIds = ref<Array<string | number>>([])
const templateApplyIds = ref<Array<string | number>>([])
const loadingCameras = ref(false)
const loadingRule = ref(false)
const loadingTemplates = ref(false)
const saving = ref(false)
const copying = ref(false)
const applyingTemplate = ref(false)
const templateDialogVisible = ref(false)
const templateMode = ref<'create' | 'update'>('create')
const savingTemplate = ref(false)
const templateForm = reactive<TemplateForm>({
  name: '',
  description: '',
  detector_type: 'yolo_pose',
  rule: {
    motion_threshold: 4,
    stop_seconds: 30,
    unknown_seconds: 10,
    confirm_frames: 2,
    status_hold_seconds: 1
  },
  tracker: {
    movement_score: 'keypoint_mean_step',
    window_seconds: 30,
    min_step_px: 1.5
  }
})

const selectedCameraLabel = computed(() => cameras.value.find((item) => String(item.id) === String(cameraId.value))?.name || String(cameraId.value))
const copyTargetCameras = computed(() => cameras.value.filter((item) => String(item.id) !== String(cameraId.value)))
const selectedTemplate = computed(() => templates.value.find((item) => String(item.id) === String(selectedTemplateId.value)))

function stateText(state: RobotState) {
  return state === 'RUNNING' ? '运行中' : state === 'IDLE' ? '空闲' : state === 'STOPPED' ? '停机' : state === 'OFFLINE' ? '离线' : '未知'
}

function statusTagType(state: RobotState) {
  return state === 'RUNNING' ? 'success' : state === 'STOPPED' ? 'danger' : state === 'IDLE' ? 'warning' : state === 'OFFLINE' ? 'info' : ''
}

function detectorText(type: DetectorType) {
  return type === 'yolo_pose' ? 'YOLO Pose' : type === 'yolo' ? 'YOLO' : type === 'aruco' ? 'ArUco' : 'Motion'
}

function movementScoreText(value: MovementScore) {
  return movementScoreOptions.find((item) => item.value === value)?.label || value
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '-'
}

function setTemplateForm(payload: TemplateForm) {
  Object.assign(templateForm, {
    id: payload.id,
    name: payload.name,
    description: payload.description,
    detector_type: payload.detector_type,
    rule: structuredClone(payload.rule),
    tracker: structuredClone(payload.tracker)
  })
}

async function loadCameras() {
  loadingCameras.value = true
  try {
    cameras.value = await getCameras()
    if (!cameras.value.some((item) => String(item.id) === String(cameraId.value))) {
      cameraId.value = cameras.value[0]?.id || cameraId.value
    }
    templateApplyIds.value = [cameraId.value]
  } catch {
    ElMessage.error('摄像头列表加载失败')
  } finally {
    loadingCameras.value = false
  }
}

async function loadRule() {
  if (!cameraId.value) return
  loadingRule.value = true
  try {
    rulePayload.value = await getCameraRule(cameraId.value)
    copyTargetIds.value = []
    templateApplyIds.value = [cameraId.value]
  } catch {
    ElMessage.error('摄像头规则加载失败')
  } finally {
    loadingRule.value = false
  }
}

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    templates.value = await getRuleTemplates()
    if (!templates.value.some((item) => String(item.id) === String(selectedTemplateId.value))) {
      selectedTemplateId.value = templates.value[0]?.id || ''
    }
  } catch {
    templates.value = []
    selectedTemplateId.value = ''
    ElMessage.warning('规则模板接口暂不可用')
  } finally {
    loadingTemplates.value = false
  }
}

async function loadAll() {
  await Promise.all([loadCameras(), loadTemplates()])
  await loadRule()
}

async function saveRule() {
  if (!rulePayload.value) return
  saving.value = true
  try {
    rulePayload.value = await saveCameraRule(cameraId.value, rulePayload.value)
    ElMessage.success('规则已保存')
  } finally {
    saving.value = false
  }
}

async function copyRule() {
  if (!copyTargetIds.value.length) return
  await ElMessageBox.confirm(`确认复制当前规则到 ${copyTargetIds.value.length} 个摄像头？`, '复制规则', { type: 'warning' })
  copying.value = true
  try {
    await copyCameraRule(cameraId.value, copyTargetIds.value)
    copyTargetIds.value = []
    ElMessage.success('规则已复制')
  } finally {
    copying.value = false
  }
}

function openCreateTemplate() {
  if (!rulePayload.value) return
  templateMode.value = 'create'
  setTemplateForm({
    name: `${selectedCameraLabel.value} 停机规则`,
    description: '',
    detector_type: rulePayload.value.detector_type,
    rule: rulePayload.value.rule,
    tracker: rulePayload.value.tracker
  })
  templateDialogVisible.value = true
}

function openUpdateTemplate() {
  if (!selectedTemplate.value || !rulePayload.value) return
  templateMode.value = 'update'
  setTemplateForm({
    id: selectedTemplate.value.id,
    name: selectedTemplate.value.name,
    description: selectedTemplate.value.description,
    detector_type: rulePayload.value.detector_type,
    rule: rulePayload.value.rule,
    tracker: rulePayload.value.tracker
  })
  templateDialogVisible.value = true
}

async function submitTemplate() {
  if (!templateForm.name.trim()) {
    ElMessage.error('请填写模板名称')
    return
  }
  savingTemplate.value = true
  try {
    const saved = templateMode.value === 'update' && templateForm.id
      ? await updateRuleTemplate(templateForm.id, templateForm)
      : await createRuleTemplate(templateForm)
    templateDialogVisible.value = false
    await loadTemplates()
    selectedTemplateId.value = saved.id
    ElMessage.success('模板已保存')
  } finally {
    savingTemplate.value = false
  }
}

async function removeTemplate() {
  if (!selectedTemplate.value) return
  await ElMessageBox.confirm(`确认删除模板「${selectedTemplate.value.name}」？`, '删除模板', { type: 'warning' })
  await deleteRuleTemplate(selectedTemplate.value.id)
  await loadTemplates()
  ElMessage.success('模板已删除')
}

function selectTemplate(row: RuleTemplate | null) {
  if (row) selectedTemplateId.value = row.id
}

function loadTemplateToForm() {
  if (!selectedTemplate.value || !rulePayload.value) return
  rulePayload.value.detector_type = selectedTemplate.value.detector_type
  rulePayload.value.rule = structuredClone(selectedTemplate.value.rule)
  rulePayload.value.tracker = structuredClone(selectedTemplate.value.tracker)
  ElMessage.success('模板已载入当前表单')
}

async function applyTemplate() {
  if (!selectedTemplate.value || !templateApplyIds.value.length) return
  await ElMessageBox.confirm(`确认应用模板「${selectedTemplate.value.name}」到 ${templateApplyIds.value.length} 个摄像头？`, '应用模板', { type: 'warning' })
  applyingTemplate.value = true
  try {
    await applyRuleTemplate(selectedTemplate.value.id, templateApplyIds.value)
    if (templateApplyIds.value.some((id) => String(id) === String(cameraId.value))) await loadRule()
    ElMessage.success('模板已应用')
  } finally {
    applyingTemplate.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.rules-layout {
  display: grid;
  grid-template-columns: minmax(520px, 1fr) minmax(420px, .8fr);
  gap: 14px;
}

.rules-main {
  display: grid;
  grid-template-columns: repeat(2, minmax(420px, 1fr));
  gap: 14px;
}

.rule-head,
.template-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.rule-title {
  font-size: 18px;
  font-weight: 800;
}

.rule-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
}

.current-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 1px;
  margin-top: 16px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.current-grid div {
  background: #fff;
  padding: 12px;
  display: grid;
  gap: 4px;
}

.current-grid span {
  color: var(--muted);
  font-size: 12px;
}

.current-grid b {
  font-size: 16px;
}

.rule-form {
  max-width: 620px;
}

.number-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.template-grid {
  display: grid;
  grid-template-columns: minmax(360px, .8fr) minmax(520px, 1.2fr);
  gap: 14px;
  margin-top: 14px;
  align-items: start;
}

@media (max-width: 1280px) {
  .rules-layout,
  .rules-main,
  .template-grid {
    grid-template-columns: 1fr;
  }

  .current-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}
</style>
