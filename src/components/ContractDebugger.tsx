import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, parseEther, isAddress } from 'viem'
import { Terminal, Play, Eye, Edit } from 'lucide-react'
import { CONTRACT_ADDRESS, RWA120_ABI } from '@/config/contract'

export function ContractDebugger() {
  const { address } = useAccount()
  const [selectedMethod, setSelectedMethod] = useState('')
  const [methodParams, setMethodParams] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, any>>({})
  const [showDebugger, setShowDebugger] = useState(false)

  const { writeContract, isPending } = useWriteContract()

  // 所有可用的方法
  const readMethods = [
    { name: 'Auctioneer', params: [], description: '获取拍卖发起人地址' },
    { name: 'getStatus', params: ['numb'], description: '获取商品状态' },
    { name: 'getMaxMoney', params: ['numb'], description: '获取当前最高价' },
    { name: 'getItemInformation', params: ['numb'], description: '获取商品详细信息' },
    { name: 'getBelong', params: ['numb'], description: '获取商品归属者' },
    { name: 'getRecord', params: ['numb'], description: '获取出价记录（仅拍卖发起人）' },
    { name: 'getSender', params: [], description: '获取当前调用者地址' },
  ]

  const writeMethods = [
    { name: 'PutOnShelves', params: ['numb'], description: '上架商品（仅拍卖发起人）' },
    { name: 'MarkUp', params: ['numb', 'value'], description: '出价（需要发送ETH）' },
    { name: 'closeAuction', params: ['numb'], description: '结束拍卖（仅拍卖发起人）' },
    { name: 'getAuctionMoney', params: ['numb'], description: '提取保证金（仅拍卖发起人）' },
    { name: 'destroy', params: [], description: '销毁合约（仅拍卖发起人）' },
  ]

  // 动态读取合约数据
  const { data: readResult, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: selectedMethod as any,
    args: selectedMethod ? getMethodArgs(selectedMethod) : undefined,
    query: {
      enabled: selectedMethod && readMethods.some(m => m.name === selectedMethod),
    }
  })

  function getMethodArgs(methodName: string) {
    const method = [...readMethods, ...writeMethods].find(m => m.name === methodName)
    if (!method) return []
    
    return method.params.map(param => {
      if (param === 'numb') {
        return parseInt(methodParams[param] || '0')
      }
      return methodParams[param] || ''
    })
  }

  const handleReadMethod = async (methodName: string) => {
    setSelectedMethod(methodName)
    setTimeout(() => {
      refetch()
    }, 100)
  }

  const handleWriteMethod = (methodName: string) => {
    const method = writeMethods.find(m => m.name === methodName)
    if (!method) return

    const args = getMethodArgs(methodName)
    const hasValue = method.params.includes('value')
    
    const config: any = {
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: methodName,
      args: args.filter((_, i) => method.params[i] !== 'value'),
    }

    if (hasValue && methodParams.value) {
      config.value = parseEther(methodParams.value)
    }

    writeContract(config)
  }

  const formatResult = (result: any) => {
    if (result === null || result === undefined) return 'null'
    if (typeof result === 'bigint') return `${formatEther(result)} ETH (${result.toString()} wei)`
    if (typeof result === 'string' && result.startsWith('0x') && result.length === 42) {
      return `${result.slice(0, 6)}...${result.slice(-4)} (${result})`
    }
    if (Array.isArray(result)) {
      return result.map((item, index) => (
        <div key={index} className="ml-4 p-2 bg-gray-600 rounded">
          {typeof item === 'object' && item !== null ? (
            Object.entries(item).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-gray-400">{key}:</span> {formatResult(value)}
              </div>
            ))
          ) : (
            formatResult(item)
          )}
        </div>
      ))
    }
    return JSON.stringify(result, null, 2)
  }

  if (!showDebugger) {
    return (
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setShowDebugger(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="打开合约调试器"
        >
          <Terminal className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            合约调试器
          </h3>
          <button
            onClick={() => setShowDebugger(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 读取方法 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4" />
              读取方法 (view/pure)
            </h4>
            
            {readMethods.map((method) => (
              <div key={method.name} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{method.name}</span>
                  <button
                    onClick={() => handleReadMethod(method.name)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    <Play className="w-3 h-3 inline mr-1" />
                    调用
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">{method.description}</p>
                
                {method.params.map((param) => (
                  <input
                    key={param}
                    type={param === 'numb' ? 'number' : 'text'}
                    placeholder={param === 'numb' ? '商品编号 (0-2)' : param}
                    value={methodParams[param] || ''}
                    onChange={(e) => setMethodParams(prev => ({
                      ...prev,
                      [param]: e.target.value
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm mb-2"
                  />
                ))}
                
                {selectedMethod === method.name && readResult !== undefined && (
                  <div className="mt-2 p-2 bg-gray-600 rounded">
                    <div className="text-xs text-gray-400 mb-1">结果:</div>
                    <div className="text-white text-sm font-mono">
                      {formatResult(readResult)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 写入方法 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Edit className="w-4 h-4" />
              写入方法 (需要gas)
            </h4>
            
            {writeMethods.map((method) => (
              <div key={method.name} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{method.name}</span>
                  <button
                    onClick={() => handleWriteMethod(method.name)}
                    disabled={isPending}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                  >
                    <Play className="w-3 h-3 inline mr-1" />
                    {isPending ? '执行中...' : '执行'}
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">{method.description}</p>
                
                {method.params.map((param) => (
                  <input
                    key={param}
                    type={param === 'numb' ? 'number' : param === 'value' ? 'number' : 'text'}
                    step={param === 'value' ? '0.0001' : undefined}
                    placeholder={
                      param === 'numb' ? '商品编号 (0-2)' : 
                      param === 'value' ? '发送金额 (ETH)' : param
                    }
                    value={methodParams[param] || ''}
                    onChange={(e) => setMethodParams(prev => ({
                      ...prev,
                      [param]: e.target.value
                    }))}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm mb-2"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ 调试器直接调用合约方法，写入操作会消耗 gas 并可能改变合约状态。请谨慎使用！
          </p>
        </div>
      </div>
    </div>
  )
}
