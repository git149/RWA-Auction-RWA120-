import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { Clock, Gavel, User, DollarSign, Users } from 'lucide-react'
import {
  useAuctioneer,
  useItemStatus,
  useMaxMoney,
  useItemInformation,
  useAuctionActions,
  useAuctionTime,
  useIsMultiAuction,
  useTotalShares
} from '@/hooks/useAuctionContract'
import { ITEMS, STATUS_MAP } from '@/config/contract'
import { AuctionModeSelector } from './AuctionModeSelector'
import { SharesDisplay } from './SharesDisplay'

interface AuctionItemProps {
  itemId: number
}

export function AuctionItem({ itemId }: AuctionItemProps) {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [showModeSelector, setShowModeSelector] = useState(false)

  // 读取合约数据
  const { data: auctioneer } = useAuctioneer()
  const { data: status, refetch: refetchStatus } = useItemStatus(itemId)
  const { data: maxMoney, refetch: refetchMaxMoney } = useMaxMoney(itemId)
  const { data: itemInfo, refetch: refetchItemInfo } = useItemInformation(itemId)
  const { data: contractAuctionTime } = useAuctionTime()
  const { data: isMultiAuction } = useIsMultiAuction(itemId)
  const { data: totalShares } = useTotalShares(itemId)
  
  // 合约操作
  const {
    putOnShelves,
    markUp,
    closeAuction,
    stopAuction,
    getAuctionMoney,
    setAuctionTime,
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
  const contractAuctionTimeNumber = contractAuctionTime ? Number(contractAuctionTime) : 0

  // 改进的拍卖状态判断逻辑
  const isAuctionActive = status === 'Under auction'
  const now = Math.floor(Date.now() / 1000)
  const isTimeExpired = contractAuctionTimeNumber > 0 && endTimeNumber > 0 && now >= endTimeNumber
  const isReallyActive = isAuctionActive && !isTimeExpired

  // 倒计时逻辑
  useEffect(() => {
    if (!isAuctionActive || !endTimeNumber || contractAuctionTimeNumber === 0) return

    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = endTimeNumber - now
      setTimeLeft(Math.max(0, remaining))
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [isAuctionActive, endTimeNumber, contractAuctionTimeNumber])

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

  const handleModeSelect = (mode: number) => {
    putOnShelves(itemId, mode)
    setShowModeSelector(false)
  }

  const canBid = isReallyActive && !isAuctioneer && (contractAuctionTimeNumber === 0 || timeLeft > 0)
  const canClose = isAuctionActive && isAuctioneer && (contractAuctionTimeNumber === 0 || timeLeft === 0)
  const canStop = isReallyActive && isAuctioneer && (contractAuctionTimeNumber === 0 || timeLeft > 0)

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          {isMultiAuction ? <Users className="w-5 h-5" /> : <Gavel className="w-5 h-5" />}
          {item?.name || `商品 ${itemId}`}
          {isMultiAuction && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              多人共有
            </span>
          )}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isReallyActive ? 'bg-green-500/20 text-green-400' :
          isTimeExpired ? 'bg-orange-500/20 text-orange-400' :
          status === 'Successfully Sold' ? 'bg-blue-500/20 text-blue-400' :
          status === 'Flow beat' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {isTimeExpired ? '等待确认' : statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <DollarSign className="w-4 h-4" />
          <span>起拍价: {startPrice ? formatEther(startPrice) : '0.0001'} ETH</span>
        </div>
        
        {isMultiAuction ? (
          totalShares && Number(totalShares) > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign className="w-4 h-4" />
              <span>总投资: {formatEther(totalShares)} ETH</span>
            </div>
          )
        ) : (
          maxMoney && (
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign className="w-4 h-4" />
              <span>当前价: {formatEther(maxMoney)} ETH</span>
            </div>
          )
        )}

        {isReallyActive && contractAuctionTimeNumber > 0 && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-orange-400">
            <Clock className="w-4 h-4" />
            <span>剩余时间: {formatTime(timeLeft)}</span>
          </div>
        )}

        {contractAuctionTimeNumber === 0 && isAuctionActive && (
          <div className="flex items-center gap-2 text-blue-400">
            <Clock className="w-4 h-4" />
            <span>无时间限制</span>
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
                onClick={() => setShowModeSelector(true)}
                disabled={isPending || isConfirming}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '处理中...' : '上架拍卖'}
              </button>
            )}
            
            {canStop && (
              <button
                onClick={() => {
                  if (confirm('确定要提前停止拍卖吗？这将退还当前最高出价给出价者。')) {
                    stopAuction(itemId)
                  }
                }}
                disabled={isPending || isConfirming}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '停止中...' : '停止拍卖'}
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
              {isMultiAuction
                ? `最低出价: ${formatEther(startPrice || 100n)} ETH（多人模式：所有出价都有效）`
                : `最低出价: ${maxMoney ? `${formatEther(maxMoney + 1n)} ETH` : `${formatEther(startPrice || 100n)} ETH`}`
              }
            </p>
          </div>
        )}

        {isTimeExpired && !isAuctioneer && (
          <div className="text-center text-orange-400 py-2">
            拍卖时间已到期，等待拍卖发起人确认结果
          </div>
        )}

        {!canBid && !isAuctioneer && isAuctionActive && !isTimeExpired && (
          <div className="text-center text-gray-400 py-2">
            当前无法参与拍卖
          </div>
        )}

        {/* 多人拍卖份额显示 */}
        {isMultiAuction && (
          <SharesDisplay
            itemId={itemId}
            isMultiAuction={true}
            auctionStatus={status || ''}
          />
        )}

        {/* 拍卖模式选择弹窗 */}
        {showModeSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">选择拍卖模式</h3>
                <button
                  onClick={() => setShowModeSelector(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              <AuctionModeSelector
                onModeSelect={handleModeSelect}
                disabled={isPending || isConfirming}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
