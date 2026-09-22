import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource-variable/dm-sans'

import App from '@/App.vue'
import { i18n } from '@/i18n'
import router from '@/router'
import '@/assets/main.css'

createApp(App).use(createPinia()).use(i18n).use(router).mount('#app')
