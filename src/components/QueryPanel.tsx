import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther, isAddress } from 'viem'
import { Search, Info, Clock, User, DollarSign, List } from 'lucide-react'
import { 
  useAuctioneer, 
  useItemStatus, 
  useMaxMoney, 
  useItemInformation,
  useItemBelong,
  useAuctionRecords
} from '@/hooks/useAuctionContract'
import { ITEMS } from '@/config/contract'

export function QueryPanel() {
  const { address } = useAccount()
  const [selectedItem, setSelectedItem] = useState<number>(0)
  const [showRecords, setShowRecords] = useState(false)

  // 查询数据
  const { data: auctioneer } = useAuctioneer()
  const { data: status } = useItemStatus(selectedItem)
  const { data: maxMoney } = useMaxMoney(selectedItem)
  const { data: itemInfo } = useItemInformation(selectedItem)
  const { data: belong } = useItemBelong(selectedItem)
  const { data: records } = useAuctionRecords(selectedItem)

  const isAuctioneer = address && auctioneer && 
    address.toLowerCase() === auctioneer.toLowerCase()

  // 解析商品信息
  const [itemName, auctionTime, startPrice, endTime] = itemInfo || []
  const endTimeNumber = endTime ? Number(endTime) : 0
  const endTimeDate = endTimeNumber > 0 ? new Date(endTimeNumber * 1000) : null

  const formatAddress = (addr: string) => {
    if (!addr || !isAddress(addr)) return '无效地址'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatTimestamp = (timestamp: bigint | number) => {
    const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
    if (ts === 0) return '未设置'
    return new Date(ts * 1000).toLocaleString('zh-CN')
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-white">合约信息查询</h3>
      </div>

      {/* 商品选择器 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          选择查询商品
        </label>
        <select
          value={selectedItem}
          onChange={(e) => setSelectedItem(Number(e.target.value))}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          {ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              商品 {item.id}: {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4" />
            基本信息
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">拍卖发起人:</span>
              <span className="text-white font-mono">
                {auctioneer ? formatAddress(auctioneer) : '加载中...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">商品名称:</span>
              <span className="text-white">
                {itemName || '加载中...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">当前状态:</span>
              <span className={`font-medium ${
                status === 'Under auction' ? 'text-green-400' :
                status === 'Successfully Sold' ? 'text-blue-400' :
                status === 'Flow beat' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {status || '加载中...'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">当前归属:</span>
              <span className="text-white font-mono">
                {belong ? formatAddress(belong) : '加载中...'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            价格信息
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">起拍价:</span>
              <span className="text-white">
                {startPrice ? `${formatEther(startPrice)} ETH` : '0.0001 ETH'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">当前最高价:</span>
              <span className="text-white">
                {maxMoney ? `${formatEther(maxMoney)} ETH` : '暂无出价'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">拍卖时长:</span>
              <span className="text-white">
                {auctionTime ? `${Number(auctionTime) / 60} 分钟` : '10 分钟'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">结束时间:</span>
              <span className="text-white">
                {endTimeDate ? endTimeDate.toLocaleString('zh-CN') : '未开始'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 权限信息 */}
      <div className="p-3 bg-gray-700 rounded-lg">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
          <User className="w-4 h-4" />
          当前用户权限
        </h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">当前地址:</span>
            <span className="text-white font-mono">
              {address ? formatAddress(address) : '未连接'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">身份:</span>
            <span className={`font-medium ${isAuctioneer ? 'text-purple-400' : 'text-blue-400'}`}>
              {isAuctioneer ? '拍卖发起人' : '普通用户'}
            </span>
          </div>
        </div>
      </div>

      {/* 出价记录查询 */}
      {isAuctioneer && (
        <div className="space-y-3">
          <button
            onClick={() => setShowRecords(!showRecords)}
            className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
          >
            <List className="w-4 h-4" />
            <span>{showRecords ? '隐藏' : '查看'}出价记录</span>
          </button>

          {showRecords && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">出价记录</h4>
              {records && records.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {records.map((record, index) => (
                    <div key={index} className="bg-gray-600 rounded p-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <span className="text-gray-400">出价者: </span>
                          <span className="text-white font-mono">
                            {formatAddress(record.addr)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">金额: </span>
                          <span className="text-green-400 font-medium">
                            {formatEther(record.amount)} ETH
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">时间: </span>
                          <span className="text-white">
                            {formatTimestamp(record.bidAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  暂无出价记录
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="flex justify-center">
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          刷新数据
        </button>
      </div>
    </div>
  )
}
