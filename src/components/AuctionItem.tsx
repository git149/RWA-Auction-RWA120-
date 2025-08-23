import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { Clock, Gavel, User, DollarSign } from 'lucide-react'
import { 
  useAuctioneer, 
  useItemStatus, 
  useMaxMoney, 
  useItemInformation,
  useAuctionActions 
} from '@/hooks/useAuctionContract'
import { ITEMS, STATUS_MAP } from '@/config/contract'

interface AuctionItemProps {
  itemId: number
}

export function AuctionItem({ itemId }: AuctionItemProps) {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // 读取合约数据
  const { data: auctioneer } = useAuctioneer()
  const { data: status, refetch: refetchStatus } = useItemStatus(itemId)
  const { data: maxMoney, refetch: refetchMaxMoney } = useMaxMoney(itemId)
  const { data: itemInfo, refetch: refetchItemInfo } = useItemInformation(itemId)
  
  // 合约操作
  const { 
    putOnShelves, 
    markUp, 
    closeAuction, 
    getAuctionMoney,
    isPending,
    isConfirming,
    isConfirmed 
  } = useAuctionActions()

  const item = ITEMS.find(i => i.id === itemId)
  const isAuctioneer = address && auctioneer && address.toLowerCase() === auctioneer.toLowerCase()
  const statusText = status ? STATUS_MAP[status as keyof typeof STATUS_MAP] || status : '加载中...'
  
  // 解析商品信息
  const [itemName, auctionTime, startPrice, endTime] = itemInfo || []
  const endTimeNumber = endTime ? Number(endTime) : 0
  const isAuctionActive = status === 'Under auction'

  // 倒计时逻辑
  useEffect(() => {
    if (!isAuctionActive || !endTimeNumber) return

    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = endTimeNumber - now
      setTimeLeft(Math.max(0, remaining))
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [isAuctionActive, endTimeNumber])

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchStatus()
      refetchMaxMoney()
      refetchItemInfo()
    }
  }, [isConfirmed, refetchStatus, refetchMaxMoney, refetchItemInfo])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleBid = () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('请输入有效的出价金额')
      return
    }
    markUp(itemId, bidAmount)
    setBidAmount('')
  }

  const canBid = isAuctionActive && !isAuctioneer && timeLeft > 0
  const canClose = isAuctionActive && isAuctioneer && timeLeft === 0

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Gavel className="w-5 h-5" />
          {item?.name || `商品 ${itemId}`}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'Under auction' ? 'bg-green-500/20 text-green-400' :
          status === 'Successfully Sold' ? 'bg-blue-500/20 text-blue-400' :
          status === 'Flow beat' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <DollarSign className="w-4 h-4" />
          <span>起拍价: {startPrice ? formatEther(startPrice) : '0.0001'} ETH</span>
        </div>
        
        {maxMoney && (
          <div className="flex items-center gap-2 text-gray-300">
            <DollarSign className="w-4 h-4" />
            <span>当前价: {formatEther(maxMoney)} ETH</span>
          </div>
        )}

        {isAuctionActive && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-orange-400">
            <Clock className="w-4 h-4" />
            <span>剩余时间: {formatTime(timeLeft)}</span>
          </div>
        )}

        {isAuctioneer && (
          <div className="flex items-center gap-2 text-purple-400">
            <User className="w-4 h-4" />
            <span>拍卖发起人</span>
          </div>
        )}
      </div>

      {/* 操作按钮区域 */}
      <div className="space-y-3">
        {/* 拍卖发起人操作 */}
        {isAuctioneer && (
          <div className="flex gap-2">
            {status === 'To be auctioned' && (
              <button
                onClick={() => putOnShelves(itemId)}
                disabled={isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '处理中...' : '上架拍卖'}
              </button>
            )}
            
            {canClose && (
              <button
                onClick={() => closeAuction(itemId)}
                disabled={isPending || isConfirming}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '处理中...' : '结束拍卖'}
              </button>
            )}
            
            {status === 'Successfully Sold' && (
              <button
                onClick={() => getAuctionMoney(itemId)}
                disabled={isPending || isConfirming}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '处理中...' : '提取保证金'}
              </button>
            )}
          </div>
        )}

        {/* 买家出价 */}
        {canBid && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.0001"
                placeholder="出价金额 (ETH)"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleBid}
                disabled={isPending || isConfirming || !bidAmount}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '出价中...' : '出价'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              最低出价: {maxMoney ? `${formatEther(maxMoney + 1n)} ETH` : `${formatEther(startPrice || 100n)} ETH`}
            </p>
          </div>
        )}

        {timeLeft === 0 && isAuctionActive && !isAuctioneer && (
          <div className="text-center text-gray-400 py-2">
            拍卖已结束，等待拍卖发起人确认结果
          </div>
        )}
      </div>
    </div>
  )
}
