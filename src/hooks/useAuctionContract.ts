import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { CONTRACT_ADDRESS, RWA120_ABI } from '@/config/contract'

// 读取合约数据的 hooks
export function useAuctioneer() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'Auctioneer',
  })
}

export function useItemStatus(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getStatus',
    args: [itemId],
  })
}

export function useMaxMoney(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getMaxMoney',
    args: [itemId],
  })
}

export function useItemInformation(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getItemInformation',
    args: [itemId],
  })
}

export function useItemBelong(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getBelong',
    args: [itemId],
  })
}

export function useAuctionRecords(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getRecord',
    args: [itemId],
  })
}

export function useSender() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getSender',
  })
}

// 写入合约的 hooks
export function useAuctionActions() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const putOnShelves = (itemId: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'PutOnShelves',
      args: [itemId],
    })
  }

  const markUp = (itemId: number, bidAmount: string) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'MarkUp',
      args: [itemId],
      value: parseEther(bidAmount),
    })
  }

  const closeAuction = (itemId: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'closeAuction',
      args: [itemId],
    })
  }

  const getAuctionMoney = (itemId: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'getAuctionMoney',
      args: [itemId],
    })
  }

  const destroy = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'destroy',
    })
  }

  return {
    putOnShelves,
    markUp,
    closeAuction,
    getAuctionMoney,
    destroy,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
  }
}
