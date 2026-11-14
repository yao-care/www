// 載入主機設定（2026-11-14 新增）。用法：import { secretPath, requireEnv } from './lib/host-env.mjs';
//
// 主機專屬的值不放 repo，集中在主機的 /etc/yaocare/www.env（KEY=VALUE）。import 本檔即載入，
// 已存在的環境變數優先（不覆蓋）。欄位說明見 docs/HOST-CONFIG.md。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const HOST_ENV_FILE = process.env.YAOCARE_HOST_ENV || '/etc/yaocare/www.env';

if (existsSync(HOST_ENV_FILE)) {
  for (const line of readFileSync(HOST_ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

/** 取主機設定；沒有就丟錯並說明去哪裡設 */
export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`缺主機設定 ${name}：請在 ${HOST_ENV_FILE} 設定（欄位說明見 docs/HOST-CONFIG.md）`);
  return v;
}

/** 金鑰檔路徑：$YAOCARE_SECRETS_DIR/<檔名> */
export const secretPath = (file) => join(requireEnv('YAOCARE_SECRETS_DIR'), file);
