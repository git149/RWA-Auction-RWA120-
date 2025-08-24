/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  // 在这里添加更多环境变量类型定义
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
