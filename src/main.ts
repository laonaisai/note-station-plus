import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';
import { logger } from './services/logger';

const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error Handler]', err, info);
  logger.error('system', 'vue_error', `Vue渲染异常: ${info}`, err, { info });
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Unhandled Rejection]', event.reason);
    logger.error('system', 'unhandled_rejection', '未处理的Promise拒绝异常', event.reason);
  });
}

app.use(pinia);
app.mount('#app');

