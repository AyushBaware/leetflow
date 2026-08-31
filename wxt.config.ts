import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    options_page: 'options.html',
    action: {
      default_title: 'LeetFlow',
    },
  },
});