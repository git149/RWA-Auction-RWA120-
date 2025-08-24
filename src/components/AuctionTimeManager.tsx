import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Clock, Settings } from 'lucide-react'
import { 
  useAuctioneer, 
  useAuctionTime,
  useAuctionActions 
} from '@/hooks/useAuctionContract'

export function AuctionTimeManager() {
  const { address } = useAccount()
  const [newAuctionTime, setNewAuctionTime] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // 查询数据
  const { data: auctioneer } = useAuctioneer()
  const { data: currentAuctionTime, refetch: refetchAuctionTime } = useAuctionTime()

  // 合约操作
  const { 
    setAuctionTime,
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
      refetchAuctionTime()
      setNewAuctionTime('')
      setShowSettings(false)
    }
  }, [isConfirmed, refetchAuctionTime])

  const handleSetAuctionTime = () => {
    const timeInSeconds = parseInt(newAuctionTime)
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
      alert('请输入有效的时间（秒）')
      return
    }
    if (timeInSeconds > 86400) { // 24小时
      alert('拍卖时间不能超过24小时')
      return
    }
    setAuctionTime(timeInSeconds)
  }

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '无时间限制'
    if (seconds < 60) return `${seconds}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`
  }

  const presetTimes = [
    { label: '无限制', value: 0 },
    { label: '5分钟', value: 300 },
    { label: '10分钟', value: 600 },
    { label: '30分钟', value: 1800 },
    { label: '1小时', value: 3600 },
    { label: '2小时', value: 7200 },
  ]

  if (!isAuctioneer) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>只有拍卖发起人可以设置拍卖时间</p>
          <p className="text-sm mt-2">
            当前拍卖时长: {currentAuctionTime ? formatTime(Number(currentAuctionTime)) : '加载中...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-xl font-bold text-white">拍卖时间管理</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 当前设置显示 */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">当前拍卖时长:</span>
          <span className="text-white font-medium">
            {currentAuctionTime ? formatTime(Number(currentAuctionTime)) : '加载中...'}
          </span>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              ⚠️ 只能在没有拍卖进行时修改拍卖时长
            </p>
          </div>

          {/* 预设时间选择 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              快速设置
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presetTimes.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setNewAuctionTime(preset.value.toString())}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义时间输入 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              自定义时间（秒）
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="86400"
                placeholder="输入秒数（0=无限制）"
                value={newAuctionTime}
                onChange={(e) => setNewAuctionTime(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSetAuctionTime}
                disabled={isPending || isConfirming || !newAuctionTime}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isPending || isConfirming ? '设置中...' : '设置'}
              </button>
            </div>
            {newAuctionTime && (
              <p className="text-xs text-gray-400">
                预览: {formatTime(parseInt(newAuctionTime) || 0)}
              </p>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">
                设置失败: {error.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
