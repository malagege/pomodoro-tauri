// CI 專用：把日期時間版號寫入 tauri.conf.json（不寫回 repo）。
// 版號格式沿用舊 Electron 專案：YY.M.D-當日UTC分鐘數，例如 26.7.12-853
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-\d+)?$/.test(version)) {
  console.error(`版號格式不正確: ${String(version)}（預期如 26.7.12-853）`)
  process.exit(1)
}

const confPath = new URL('../src-tauri/tauri.conf.json', import.meta.url)
const conf = JSON.parse(readFileSync(confPath, 'utf8'))
conf.version = version
writeFileSync(confPath, `${JSON.stringify(conf, null, 2)}\n`)
console.log(`tauri.conf.json version -> ${version}`)
