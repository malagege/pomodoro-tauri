import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: MainView },
    { path: '/reminder', component: () => import('@/components/ReminderView.vue') },
  ],
})
