import { Address } from 'viem'
import rwa120ABI from '../../contract/test/interfaces/rwa120ABI.json'

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as Address
export const CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '11155111')

export const RWA120_ABI = rwa120ABI as const

// 商品信息（从合约构造函数中获取）
export const ITEMS = [
  { id: 0, name: 'xuperchain Lamborghini' },
  { id: 1, name: 'xuperchain Benz' },
  { id: 2, name: 'xuperchain BMW' },
] as const

// 状态映射
export const STATUS_MAP = {
  'To be auctioned': '待拍卖',
  'Under auction': '拍卖中',
  'Successfully Sold': '成功出售',
  'Flow beat': '流拍',
} as const

// 起拍价（Wei）
export const START_PRICE = 100n

// 拍卖时长（秒）
export const AUCTION_TIME = 10 * 60 // 10分钟
