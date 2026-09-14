import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import SensorView from './views/SensorView.vue';
import DanceView from './views/DanceView.vue';
import HalloweenView from './views/HalloweenView.vue';
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
    { path: '/dance', name: 'dance', component: DanceView },
    { path: '/dance/:sessionId', name: 'dance-session', component: DanceView },
    { path: '/halloween', name: 'halloween', component: HalloweenView },
    { path: '/halloween/:sessionId', name: 'halloween-session', component: HalloweenView },
  ],
});
