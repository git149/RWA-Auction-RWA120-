import { useAccount } from 'wagmi'
import { WalletConnection } from '@/components/WalletConnection'
import { AuctionItem } from '@/components/AuctionItem'
import { QueryPanel } from '@/components/QueryPanel'
import { ContractDebugger } from '@/components/ContractDebugger'
import { ItemManager } from '@/components/ItemManager'
import { AuctionTimeManager } from '@/components/AuctionTimeManager'
import { MultiAuctionManager } from '@/components/MultiAuctionManager'
import { useAllItemIds } from '@/hooks/useAuctionContract'
import { ITEMS, CONTRACT_ADDRESS } from '@/config/contract'

function App() {
  const { isConnected } = useAccount()
  const { data: allItemIds } = useAllItemIds()

  // 使用动态商品列表，如果没有则回退到默认商品
  const displayItems = allItemIds && allItemIds.length > 0
    ? allItemIds.map(id => ({ id: Number(id), name: `商品 ${id}` }))
    : ITEMS

  return (
    <div className="min-h-screen w-full bg-gray-900 py-4 sm:py-8">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            RWA120 拍卖平台
          </h1>
          <p className="text-gray-400 mb-4">
            基于以太坊智能合约的去中心化拍卖系统
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>合约地址: {CONTRACT_ADDRESS}</p>
            <p>网络: Sepolia 测试网</p>
          </div>
        </div>

        {/* 钱包连接 */}
        <div className="mb-8">
          <WalletConnection />
        </div>

        {/* 拍卖商品列表 */}
        {isConnected ? (
          <div className="space-y-8">
            {/* 管理面板 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ItemManager />
              <AuctionTimeManager />
            </div>

            {/* 信息查询面板 */}
            <QueryPanel />

            {/* 多人拍卖管理面板 */}
            <MultiAuctionManager />

            <h2 className="text-2xl font-bold text-white text-center mb-6">
              拍卖商品
            </h2>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {displayItems.map((item) => (
                <AuctionItem key={item.id} itemId={item.id} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              请先连接钱包以开始使用拍卖平台
            </p>
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-12 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">使用说明</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">拍卖发起人操作：</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>设置拍卖时间：配置拍卖持续时长</li>
                <li>上架商品：将商品设置为拍卖状态</li>
                <li>结束拍卖：拍卖时间结束后确认结果</li>
                <li>提取保证金：成功出售后提取最高出价</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">买家操作：</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>查看商品：实时查看拍卖状态和当前价格</li>
                <li>参与竞拍：在拍卖时间内出价竞拍</li>
                <li>价格要求：出价必须高于当前最高价</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ 注意：这是测试网环境，请使用测试 ETH 进行交易。拍卖发起人需要先设置拍卖时长，然后才能上架商品。
            </p>
          </div>
        </div>

        {/* 合约调试器 */}
        <ContractDebugger />
      </div>
    </div>
  )
}

export default App
