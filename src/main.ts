import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import '@fontsource-variable/dm-sans'

import App from '@/App.vue'
import { registerGlobalErrorHandler } from '@/errors/globalErrorHandler'
import { i18n } from '@/i18n'
import router from '@/router'
import '@/assets/main.css'

const app = createApp(App)
registerGlobalErrorHandler(app)
app.use(createPinia()).use(i18n).use(router).mount('#app')
