import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error Handler]', err, info);
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Unhandled Rejection]', event.reason);
  });
}

app.use(pinia);
app.mount('#app');

