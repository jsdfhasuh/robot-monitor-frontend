import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CamerasView from '../views/CamerasView.vue'
import TasksView from '../views/TasksView.vue'
import AlarmsView from '../views/AlarmsView.vue'
import ConfigVersionsView from '../views/ConfigVersionsView.vue'
import SettingsView from '../views/SettingsView.vue'
import DebugView from '../views/DebugView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: DashboardView },
    { path: '/debug/keypoints', component: DebugView },
    { path: '/cameras', component: CamerasView },
    { path: '/tasks', component: TasksView },
    { path: '/alarms', component: AlarmsView },
    { path: '/config-versions', component: ConfigVersionsView },
    { path: '/settings', component: SettingsView }
  ]
})
