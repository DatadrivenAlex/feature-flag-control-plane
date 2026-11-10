import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',workers:1,use:{baseURL:'http://127.0.0.1:3099',viewport:{width:1440,height:1100}},webServer:{command:'rm -f data/e2e-state.json && ADMIN_TOKEN=local-test-token-123 STATE_FILE=data/e2e-state.json PORT=3099 node --import tsx src/server.ts',url:'http://127.0.0.1:3099/api/health',reuseExistingServer:false}});
