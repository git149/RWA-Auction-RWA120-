import { useState } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { Users, PieChart, TrendingUp, Eye } from 'lucide-react'
import { 
  useAllItemIds,
  useIsMultiAuction,
  useItemStatus,
  useTotalShares,
  useShareholderCount,
  useUserShare,
  useSharePercentage
} from '@/hooks/useAuctionContract'

export function MultiAuctionManager() {
  const { address } = useAccount()
  const [selectedItem, setSelectedItem] = useState<number | null>(null)
  
  const { data: allItemIds } = useAllItemIds()

  // 过滤出多人拍卖商品
  const multiAuctionItems = allItemIds?.filter(itemId => {
    // 这里需要为每个商品检查是否为多人拍卖
    // 由于hooks的限制，我们需要在组件中处理
    return true // 临时返回所有商品，在渲染时过滤
  }) || []

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-green-400" />
        <h3 className="text-xl font-bold text-white">多人共有拍卖管理</h3>
      </div>

      <div className="text-sm text-gray-400">
        查看和管理所有多人共有模式的拍卖商品
      </div>

      {/* 商品列表 */}
      <div className="space-y-4">
        {multiAuctionItems.length > 0 ? (
          multiAuctionItems.map((itemId) => (
            <MultiAuctionItemCard 
              key={itemId.toString()} 
              itemId={Number(itemId)}
              userAddress={address || ''}
              isSelected={selectedItem === Number(itemId)}
              onSelect={() => setSelectedItem(
                selectedItem === Number(itemId) ? null : Number(itemId)
              )}
            />
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无多人共有拍卖商品</p>
          </div>
        )}
      </div>
    </div>
  )
}

// 多人拍卖商品卡片组件
function MultiAuctionItemCard({ 
  itemId, 
  userAddress, 
  isSelected, 
  onSelect 
}: { 
  itemId: number
  userAddress: string
  isSelected: boolean
  onSelect: () => void
}) {
  const { data: isMultiAuction } = useIsMultiAuction(itemId)
  const { data: status } = useItemStatus(itemId)
  const { data: totalShares } = useTotalShares(itemId)
  const { data: shareholderCount } = useShareholderCount(itemId)
  const { data: userShare } = useUserShare(itemId, userAddress)
  const { data: userPercentage } = useSharePercentage(itemId, userAddress)

  // 如果不是多人拍卖，不显示
  if (!isMultiAuction) {
    return null
  }

  const totalSharesNumber = totalShares ? Number(totalShares) : 0
  const shareholderCountNumber = shareholderCount ? Number(shareholderCount) : 0
  const hasUserShares = userShare && Number(userShare) > 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under auction':
        return 'text-green-400 bg-green-500/20'
      case 'Successfully Sold':
        return 'text-blue-400 bg-blue-500/20'
      case 'Flow beat':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const formatPercentage = (percentage: bigint | number) => {
    const num = typeof percentage === 'bigint' ? Number(percentage) : percentage
    return (num / 100).toFixed(2)
  }

  return (
    <div className={`border rounded-lg p-4 transition-all cursor-pointer ${
      isSelected ? 'border-green-500 bg-green-500/5' : 'border-gray-600 hover:border-gray-500'
    }`}>
      <div className="flex items-center justify-between mb-3" onClick={onSelect}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white">商品 {itemId}</h4>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status || '')}`}>
                {status === 'Under auction' ? '拍卖中' :
                 status === 'Successfully Sold' ? '已完成' :
                 status === 'Flow beat' ? '流拍' : '待拍卖'}
              </span>
              {hasUserShares && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  已参与
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-white">
            {totalSharesNumber > 0 ? `${formatEther(totalShares!)} ETH` : '0 ETH'}
          </div>
          <div className="text-xs text-gray-400">
            {shareholderCountNumber} 位股东
          </div>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isSelected && (
        <div className="border-t border-gray-600 pt-4 space-y-4">
          {/* 总体统计 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-white">
                {formatEther(totalShares || 0n)}
              </div>
              <div className="text-xs text-gray-400">总投资 (ETH)</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-white">
                {shareholderCountNumber}
              </div>
              <div className="text-xs text-gray-400">股东数量</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-white">
                {hasUserShares ? `${formatPercentage(userPercentage || 0)}%` : '0%'}
              </div>
              <div className="text-xs text-gray-400">我的份额</div>
            </div>
          </div>

          {/* 用户参与情况 */}
          {hasUserShares ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">您的投资详情</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">投资金额:</span>
                  <span className="text-white ml-2 font-medium">
                    {formatEther(userShare!)} ETH
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">持有比例:</span>
                  <span className="text-blue-400 ml-2 font-medium">
                    {formatPercentage(userPercentage || 0)}%
                  </span>
                </div>
              </div>
              
              {/* 份额进度条 */}
              <div className="mt-3">
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${userPercentage ? Number(userPercentage) / 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">
                您还未参与此商品的投资
              </div>
              {status === 'Under auction' && (
                <div className="text-xs text-gray-500 mt-1">
                  可以在商品卡片中参与出价
                </div>
              )}
            </div>
          )}

          {/* 状态说明 */}
          {status === 'Successfully Sold' && totalSharesNumber > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">
                  拍卖成功完成
                </span>
              </div>
              <p className="text-green-400 text-xs mt-1">
                份额分配已确认，您现在拥有该商品的部分所有权
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
