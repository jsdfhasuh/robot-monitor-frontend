import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CamerasView from '../views/CamerasView.vue'
import TasksView from '../views/TasksView.vue'
import AlarmsView from '../views/AlarmsView.vue'
import ConfigVersionsView from '../views/ConfigVersionsView.vue'
import SettingsView from '../views/SettingsView.vue'
import DebugView from '../views/DebugView.vue'
import ModelsView from '../views/ModelsView.vue'
import SystemView from '../views/SystemView.vue'
import RulesView from '../views/RulesView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: DashboardView },
    { path: '/debug/keypoints', component: DebugView },
    { path: '/rules', component: RulesView },
    { path: '/cameras', component: CamerasView },
    { path: '/tasks', component: TasksView },
    { path: '/alarms', component: AlarmsView },
    { path: '/models', component: ModelsView },
    { path: '/config-versions', component: ConfigVersionsView },
    { path: '/system', component: SystemView },
    { path: '/settings', component: SettingsView }
  ]
})
