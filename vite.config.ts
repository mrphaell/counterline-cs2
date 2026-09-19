import { defineConfig } from 'vite'
export default defineConfig({server:{proxy:{'/api':{target:'https://api.csapi.de',changeOrigin:true,rewrite:path=>path.replace(/^\/api/,'')}}}})
