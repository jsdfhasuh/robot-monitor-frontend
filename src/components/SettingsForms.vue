<template>
  <div class="form-grid">
    <div class="card">
      <div class="card-title">检测参数</div>
      <el-form label-width="128px" size="default">
        <el-form-item label="检测模式"><el-select v-model="model.detect.detector_type"><el-option label="YOLO Pose" value="yolo_pose" /><el-option label="YOLO 目标检测" value="yolo" /><el-option label="ArUco" value="aruco" /><el-option label="帧差检测" value="motion" /></el-select></el-form-item>
        <el-form-item label="连续停机时间"><el-input-number v-model="model.detect.stop_duration_seconds" :min="1" /></el-form-item>
        <el-form-item label="运动阈值(px)"><el-input-number v-model="model.detect.motion_threshold_px" :min="1" /></el-form-item>
        <el-form-item label="最低置信度"><el-input-number v-model="model.detect.keypoint_conf_threshold" :min="0" :max="1" :step="0.05" /></el-form-item>
        <el-form-item label="投票模式"><el-select v-model="model.detect.keypoint_vote_mode"><el-option label="均值" value="mean" /><el-option label="最大值" value="max" /><el-option label="多数投票" value="majority" /></el-select></el-form-item>
      </el-form>
    </div>
    <div class="card">
      <div class="card-title">视频参数</div>
      <el-form label-width="110px">
        <el-form-item label="分辨率"><el-select :model-value="`${model.video.frame_width}x${model.video.frame_height}`" @change="onResolution"><el-option label="1920 x 1080" value="1920x1080" /><el-option label="1280 x 720" value="1280x720" /></el-select></el-form-item>
        <el-form-item label="FPS"><el-input-number v-model="model.video.target_fps" :min="1" :max="60" /></el-form-item>
        <el-form-item label="码率(kbps)"><el-input-number v-model="model.video.bitrate_kbps" :min="256" /></el-form-item>
        <el-form-item label="I帧间隔"><el-input-number v-model="model.video.i_frame_interval" :min="1" /></el-form-item>
        <el-form-item label="编码"><el-select v-model="model.video.codec"><el-option label="H.264" value="H.264" /><el-option label="H.265" value="H.265" /></el-select></el-form-item>
      </el-form>
    </div>
    <div class="card">
      <div class="card-title">告警参数</div>
      <el-form label-width="110px">
        <el-form-item label="启用告警"><el-switch v-model="model.alarm.alarm_enabled" /></el-form-item>
        <el-form-item label="告警级别"><el-select v-model="model.alarm.alarm_level"><el-option label="普通" value="info" /><el-option label="中" value="warning" /><el-option label="严重" value="critical" /></el-select></el-form-item>
        <el-form-item label="告警延迟"><el-input-number v-model="model.alarm.alarm_delay_seconds" :min="0" /></el-form-item>
        <el-form-item label="保持时间"><el-input-number v-model="model.alarm.alarm_hold_seconds" :min="1" /></el-form-item>
        <el-form-item label="声音告警"><el-switch v-model="model.alarm.sound_enabled" /></el-form-item>
      </el-form>
    </div>
    <div class="card">
      <div class="card-title">日志参数</div>
      <el-form label-width="130px">
        <el-form-item label="日志级别"><el-select v-model="model.log.log_level"><el-option label="DEBUG" value="DEBUG" /><el-option label="INFO" value="INFO" /><el-option label="WARNING" value="WARNING" /><el-option label="ERROR" value="ERROR" /></el-select></el-form-item>
        <el-form-item label="保留天数"><el-input-number v-model="model.log.retention_days" :min="1" /></el-form-item>
        <el-form-item label="最大文件(MB)"><el-input-number v-model="model.log.max_file_size_mb" :min="1" /></el-form-item>
        <el-form-item label="是否压缩"><el-switch v-model="model.log.compress_enabled" /></el-form-item>
      </el-form>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { AppSettings } from '../types/settings'
const model = defineModel<AppSettings>({ required: true })
function onResolution(v: string) { const [w, h] = v.split('x').map(Number); model.value.video.frame_width = w; model.value.video.frame_height = h }
</script>
