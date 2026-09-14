import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import SensorView from './views/SensorView.vue';
import MusicView from './views/MusicView.vue';
import StageView from './views/StageView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/sensor', name: 'sensor', component: SensorView },
    { path: '/sensor/:sessionId', name: 'sensor-session', component: SensorView },
    { path: '/stage', name: 'stage', component: StageView },
    { path: '/stage/:sessionId', name: 'stage-session', component: StageView },
    { path: '/music', name: 'music', component: MusicView },
    { path: '/music/:sessionId', name: 'music-session', component: MusicView },
  ],
});
