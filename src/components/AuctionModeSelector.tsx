import { useState } from 'react'
import { Users, User, Info } from 'lucide-react'

interface AuctionModeSelectorProps {
  onModeSelect: (mode: number) => void
  disabled?: boolean
}

export function AuctionModeSelector({ onModeSelect, disabled = false }: AuctionModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<number>(0)
  const [showInfo, setShowInfo] = useState(false)

  const modes = [
    {
      id: 0,
      name: '单一所有权',
      icon: User,
      description: '传统拍卖模式，最高出价者获得商品',
      features: [
        '最高出价者获得100%所有权',
        '其他出价者资金会被退还',
        '适合高价值独占性资产'
      ],
      color: 'blue'
    },
    {
      id: 1,
      name: '多人共有',
      icon: Users,
      description: '所有出价者按比例共同持有商品',
      features: [
        '所有出价都有效，不退还资金',
        '按出价金额比例分配份额',
        '降低参与门槛，风险共担'
      ],
      color: 'green'
    }
  ]

  const handleModeChange = (mode: number) => {
    setSelectedMode(mode)
  }

  const handleConfirm = () => {
    onModeSelect(selectedMode)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-white">选择拍卖模式</h4>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showInfo && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            💡 选择拍卖模式将决定商品的所有权分配方式。单一所有权适合独占性资产，多人共有适合降低参与门槛的投资。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const IconComponent = mode.icon
          const isSelected = selectedMode === mode.id
          
          return (
            <div
              key={mode.id}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? mode.color === 'blue'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-green-500 bg-green-500/10'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && handleModeChange(mode.id)}
            >
              {isSelected && (
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                  mode.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
              )}
              
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  isSelected
                    ? mode.color === 'blue' ? 'bg-blue-500/20' : 'bg-green-500/20'
                    : 'bg-gray-600'
                }`}>
                  <IconComponent className={`w-5 h-5 ${
                    isSelected
                      ? mode.color === 'blue' ? 'text-blue-400' : 'text-green-400'
                      : 'text-gray-300'
                  }`} />
                </div>
                <div>
                  <h5 className="font-semibold text-white">{mode.name}</h5>
                  <p className="text-sm text-gray-400">{mode.description}</p>
                </div>
              </div>

              <ul className="space-y-1">
                {mode.features.map((feature, index) => (
                  <li key={index} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${
                      isSelected
                        ? mode.color === 'blue' ? 'bg-blue-400' : 'bg-green-400'
                        : 'bg-gray-500'
                    }`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMode === 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {disabled ? '处理中...' : `以${modes[selectedMode].name}模式上架`}
        </button>
      </div>

      {selectedMode === 1 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            ⚠️ 多人共有模式下，所有出价都将被视为有效购买，资金不会退还。请确保参与者了解此规则。
          </p>
        </div>
      )}
    </div>
  )
}
