import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { Users, PieChart, Eye, EyeOff } from 'lucide-react'
import { 
  useUserShare,
  useTotalShares,
  useSharePercentage,
  useAllShareholders,
  useShareholderCount
} from '@/hooks/useAuctionContract'

interface SharesDisplayProps {
  itemId: number
  isMultiAuction: boolean
  auctionStatus: string
}

export function SharesDisplay({ itemId, isMultiAuction, auctionStatus }: SharesDisplayProps) {
  const { address } = useAccount()
  const [showAllShareholders, setShowAllShareholders] = useState(false)

  // 查询份额数据
  const { data: userShare } = useUserShare(itemId, address || '')
  const { data: totalShares } = useTotalShares(itemId)
  const { data: userPercentage } = useSharePercentage(itemId, address || '')
  const { data: allShareholders } = useAllShareholders(itemId)
  const { data: shareholderCount } = useShareholderCount(itemId)

  if (!isMultiAuction) {
    return null
  }

  const hasShares = userShare && Number(userShare) > 0
  const isCompleted = auctionStatus === 'Successfully Sold'
  const totalSharesNumber = totalShares ? Number(totalShares) : 0
  const shareholderCountNumber = shareholderCount ? Number(shareholderCount) : 0

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatPercentage = (percentage: bigint | number) => {
    const num = typeof percentage === 'bigint' ? Number(percentage) : percentage
    return (num / 100).toFixed(2)
  }

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-green-400" />
        <h4 className="font-semibold text-white">多人共有份额</h4>
        {isCompleted && (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            已确认
          </span>
        )}
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">总投资金额</div>
          <div className="text-lg font-semibold text-white">
            {totalSharesNumber > 0 ? `${formatEther(totalShares!)} ETH` : '0 ETH'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">股东数量</div>
          <div className="text-lg font-semibold text-white">
            {shareholderCountNumber} 人
          </div>
        </div>
      </div>

      {/* 用户份额 */}
      {address && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-white">我的份额</div>
            {hasShares && (
              <div className="flex items-center gap-1">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-semibold">
                  {userPercentage ? formatPercentage(userPercentage) : '0'}%
                </span>
              </div>
            )}
          </div>
          
          {hasShares ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">投资金额:</span>
                <span className="text-white font-medium">
                  {formatEther(userShare!)} ETH
                </span>
              </div>
              {totalSharesNumber > 0 && (
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${userPercentage ? Number(userPercentage) / 100 : 0}%` 
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              您还没有参与此商品的投资
            </div>
          )}
        </div>
      )}

      {/* 股东列表 */}
      {shareholderCountNumber > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAllShareholders(!showAllShareholders)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showAllShareholders ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAllShareholders ? '隐藏' : '查看'}所有股东
          </button>

          {showAllShareholders && allShareholders && (
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">
                股东列表 ({shareholderCountNumber} 人)
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {allShareholders.map((shareholder, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className={`${
                      address && shareholder.toLowerCase() === address.toLowerCase()
                        ? 'text-blue-400 font-medium'
                        : 'text-gray-400'
                    }`}>
                      {formatAddress(shareholder)}
                      {address && shareholder.toLowerCase() === address.toLowerCase() && ' (我)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 说明信息 */}
      {!isCompleted && totalSharesNumber > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-blue-400 text-xs">
            💡 拍卖结束后，份额比例将最终确定。当前显示的是实时份额分配情况。
          </p>
        </div>
      )}

      {isCompleted && totalSharesNumber > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-green-400 text-xs">
            ✅ 拍卖已完成，份额分配已确认。您现在拥有该商品 {userPercentage ? formatPercentage(userPercentage) : '0'}% 的所有权。
          </p>
        </div>
      )}
    </div>
  )
}
