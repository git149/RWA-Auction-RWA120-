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

// 新增：动态商品管理相关的 hooks
export function useAllItemIds() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getAllItemIds',
  })
}

export function useTotalItems() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getTotalItems',
  })
}

export function useItemExists(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'itemExistsCheck',
    args: [itemId],
  })
}

export function useItemDetails(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getItemDetails',
    args: [itemId],
  })
}

export function useAuctionTime() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getAuctionTime',
  })
}

// 多人拍卖相关的 hooks
export function useIsMultiAuction(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'isMultiAuction',
    args: [itemId],
  })
}

export function useUserShare(itemId: number, userAddress: string) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getUserShare',
    args: [itemId, userAddress],
  })
}

export function useTotalShares(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getTotalShares',
    args: [itemId],
  })
}

export function useSharePercentage(itemId: number, userAddress: string) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getSharePercentage',
    args: [itemId, userAddress],
  })
}

export function useAllShareholders(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getAllShareholders',
    args: [itemId],
  })
}

export function useShareholderCount(itemId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'getShareholderCount',
    args: [itemId],
  })
}

export function useNextItemId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: RWA120_ABI,
    functionName: 'nextItemId',
  })
}

// 写入合约的 hooks
export function useAuctionActions() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const putOnShelves = (itemId: number, mode: number = 0) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'PutOnShelves',
      args: [itemId, mode],
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

  const stopAuction = (itemId: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'stopAuction',
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

  const addNewItem = (itemName: string) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'addNewItem',
      args: [itemName],
    })
  }

  const removeItem = (itemId: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'removeItem',
      args: [itemId],
    })
  }

  const setAuctionTime = (auctionTime: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: RWA120_ABI,
      functionName: 'setAuctionTime',
      args: [auctionTime],
    })
  }

  return {
    putOnShelves,
    markUp,
    closeAuction,
    stopAuction,
    getAuctionMoney,
    destroy,
    addNewItem,
    removeItem,
    setAuctionTime,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
  }
}
