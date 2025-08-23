import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export function WalletConnection() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  
  const isCorrectNetwork = chainId === sepolia.id

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white">钱包连接</h2>
      
      <ConnectButton />
      
      {isConnected && !isCorrectNetwork && (
        <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">
            ⚠️ 请切换到 Sepolia 测试网络
          </p>
        </div>
      )}
      
      {isConnected && isCorrectNetwork && (
        <div className="p-3 bg-green-500/20 border border-green-500 rounded-lg">
          <p className="text-green-400 text-sm">
            ✅ 已连接到 Sepolia 网络
          </p>
        </div>
      )}
    </div>
  )
}
