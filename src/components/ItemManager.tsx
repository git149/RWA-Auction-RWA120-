import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Plus, Trash2, Package, Calendar, User } from 'lucide-react'
import { 
  useAuctioneer, 
  useAllItemIds,
  useTotalItems,
  useItemDetails,
  useNextItemId,
  useAuctionActions 
} from '@/hooks/useAuctionContract'

export function ItemManager() {
  const { address } = useAccount()
  const [newItemName, setNewItemName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // 查询数据
  const { data: auctioneer } = useAuctioneer()
  const { data: allItemIds, refetch: refetchItemIds } = useAllItemIds()
  const { data: totalItems, refetch: refetchTotalItems } = useTotalItems()
  const { data: nextItemId } = useNextItemId()

  // 合约操作
  const { 
    addNewItem, 
    removeItem,
    isPending,
    isConfirming,
    isConfirmed,
    error 
  } = useAuctionActions()

  const isAuctioneer = address && auctioneer && 
    address.toLowerCase() === auctioneer.toLowerCase()

  // 交易确认后刷新数据
  useEffect(() => {
    if (isConfirmed) {
      refetchItemIds()
      refetchTotalItems()
      setNewItemName('')
      setShowAddForm(false)
    }
  }, [isConfirmed, refetchItemIds, refetchTotalItems])

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      alert('请输入商品名称')
      return
    }
    if (newItemName.length > 100) {
      alert('商品名称过长（最多100字符）')
      return
    }
    addNewItem(newItemName.trim())
  }

  const handleRemoveItem = (itemId: number) => {
    if (itemId < 3) {
      alert('不能删除默认商品')
      return
    }
    if (confirm(`确定要删除商品 ID ${itemId} 吗？此操作不可撤销。`)) {
      removeItem(itemId)
    }
  }

  if (!isAuctioneer) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>只有拍卖发起人可以管理商品</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-bold text-white">商品管理</h3>
        </div>
        <div className="text-sm text-gray-400">
          总商品数: {totalItems?.toString() || '0'} | 下个ID: {nextItemId?.toString() || '3'}
        </div>
      </div>

      {/* 添加新商品 */}
      <div className="space-y-3">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加新商品
          </button>
        ) : (
          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Plus className="w-4 h-4" />
              添加新的 RWA 商品
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="输入商品名称（如：Tesla Model S、上海豪宅等）"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                maxLength={100}
                className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <div className="text-xs text-gray-400">
                {newItemName.length}/100 字符
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                disabled={isPending || isConfirming || !newItemName.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '添加中...' : '确认添加'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewItemName('')
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 商品列表 */}
      <div className="space-y-3">
        <h4 className="font-semibold text-white">现有商品列表</h4>
        
        {allItemIds && allItemIds.length > 0 ? (
          <div className="space-y-2">
            {allItemIds.map((itemId) => (
              <ItemCard 
                key={itemId.toString()} 
                itemId={Number(itemId)} 
                onRemove={handleRemoveItem}
                isRemoving={isPending || isConfirming}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无商品</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">
            操作失败: {error.message}
          </p>
        </div>
      )}
    </div>
  )
}

// 商品卡片组件
function ItemCard({ 
  itemId, 
  onRemove, 
  isRemoving 
}: { 
  itemId: number
  onRemove: (itemId: number) => void
  isRemoving: boolean
}) {
  const { data: itemDetails } = useItemDetails(itemId)
  
  if (!itemDetails) return null
  
  const [itemName, exists, createdAt, creator] = itemDetails
  
  if (!exists) return null
  
  const isDefaultItem = itemId < 3
  const createdDate = createdAt ? new Date(Number(createdAt) * 1000) : null

  return (
    <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">ID {itemId}: {itemName}</span>
          {isDefaultItem && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              默认商品
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {createdDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{createdDate.toLocaleDateString('zh-CN')}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{creator?.slice(0, 6)}...{creator?.slice(-4)}</span>
          </div>
        </div>
      </div>
      
      {!isDefaultItem && (
        <button
          onClick={() => onRemove(itemId)}
          disabled={isRemoving}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          title="删除商品"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
