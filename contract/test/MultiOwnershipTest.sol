//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../rwa120_enhanced.sol";

/**
 * @title MultiOwnershipTest
 * @dev 多人共同持有功能的测试合约
 */
contract MultiOwnershipTest {
    auction public auctionContract;
    address public owner;
    
    // 测试用户地址
    address public userA = 0x1234567890123456789012345678901234567890;
    address public userB = 0x2345678901234567890123456789012345678901;
    address public userC = 0x3456789012345678901234567890123456789012345678901;
    
    constructor() {
        owner = msg.sender;
        auctionContract = new auction(owner);
    }
    
    /**
     * @notice 测试多人拍卖完整流程
     */
    function testMultiAuctionFlow() external {
        // 1. 添加新商品
        uint256 itemId = auctionContract.addNewItem("Test RWA Asset");
        
        // 2. 设置拍卖时间（10分钟）
        auctionContract.setAuctionTime(600);
        
        // 3. 以多人模式上架商品
        auctionContract.PutOnShelves(uint8(itemId), auction.AuctionMode.MULTI);
        
        // 验证拍卖模式
        require(auctionContract.isMultiAuction(itemId), "Should be multi auction");
        
        // 4. 模拟多个用户出价（需要在实际测试中使用不同账户）
        // 注意：在实际测试中，需要使用不同的账户调用MarkUp函数
        
        // 5. 结束拍卖
        // auctionContract.closeAuction(uint8(itemId));
        
        // 6. 查询份额信息
        // uint256 totalShares = auctionContract.getTotalShares(itemId);
        // uint256 shareholderCount = auctionContract.getShareholderCount(itemId);
    }
    
    /**
     * @notice 测试单一拍卖模式（确保兼容性）
     */
    function testSingleAuctionFlow() external {
        // 1. 添加新商品
        uint256 itemId = auctionContract.addNewItem("Single Ownership Asset");
        
        // 2. 以单一模式上架商品（默认模式）
        auctionContract.PutOnShelves(uint8(itemId));
        
        // 验证拍卖模式
        require(!auctionContract.isMultiAuction(itemId), "Should be single auction");
        
        // 3. 用户出价（保持原有逻辑）
        // 需要在实际测试中使用不同账户调用
        
        // 4. 结束拍卖
        // auctionContract.closeAuction(uint8(itemId));
    }
    
    /**
     * @notice 获取合约地址
     */
    function getAuctionContract() external view returns (address) {
        return address(auctionContract);
    }
    
    /**
     * @notice 查询商品信息
     */
    function getItemInfo(uint256 itemId) external view returns (
        string memory itemName,
        bool exists,
        bool isMulti,
        uint256 totalShares,
        uint256 shareholderCount
    ) {
        (itemName, exists, , ) = auctionContract.getItemDetails(itemId);
        isMulti = auctionContract.isMultiAuction(itemId);
        totalShares = auctionContract.getTotalShares(itemId);
        shareholderCount = auctionContract.getShareholderCount(itemId);
    }
}

/**
 * @title MultiOwnershipTestScript
 * @dev 用于JavaScript测试的辅助脚本示例
 */

/*
// JavaScript测试示例（使用ethers.js）

async function testMultiOwnership() {
    const [owner, userA, userB, userC] = await ethers.getSigners();
    
    // 部署合约
    const AuctionFactory = await ethers.getContractFactory("auction");
    const auction = await AuctionFactory.deploy(owner.address);
    await auction.deployed();
    
    console.log("合约部署地址:", auction.address);
    
    // 1. 添加新商品
    const tx1 = await auction.addNewItem("Multi-Owner RWA Asset");
    const receipt1 = await tx1.wait();
    const itemId = 3; // 假设是第4个商品
    
    // 2. 设置拍卖时间
    await auction.setAuctionTime(600); // 10分钟
    
    // 3. 以多人模式上架
    await auction.PutOnShelves(itemId, 1); // 1 = MULTI mode
    
    console.log("商品已上架，模式:", await auction.getAuctionMode(itemId));
    
    // 4. 多个用户出价
    const bidAmount1 = ethers.utils.parseEther("0.3");
    const bidAmount2 = ethers.utils.parseEther("0.2");
    const bidAmount3 = ethers.utils.parseEther("0.5");
    
    // 用户A出价
    await auction.connect(userA).MarkUp(itemId, { value: bidAmount1 });
    console.log("用户A出价:", ethers.utils.formatEther(bidAmount1), "ETH");
    
    // 用户B出价
    await auction.connect(userB).MarkUp(itemId, { value: bidAmount2 });
    console.log("用户B出价:", ethers.utils.formatEther(bidAmount2), "ETH");
    
    // 用户C出价
    await auction.connect(userC).MarkUp(itemId, { value: bidAmount3 });
    console.log("用户C出价:", ethers.utils.formatEther(bidAmount3), "ETH");
    
    // 5. 结束拍卖
    await auction.closeAuction(itemId);
    console.log("拍卖已结束");
    
    // 6. 查询份额信息
    const totalShares = await auction.getTotalShares(itemId);
    const shareholderCount = await auction.getShareholderCount(itemId);
    
    console.log("总份额:", ethers.utils.formatEther(totalShares), "ETH");
    console.log("股东数量:", shareholderCount.toString());
    
    // 查询各用户份额
    const shareA = await auction.getUserShare(itemId, userA.address);
    const shareB = await auction.getUserShare(itemId, userB.address);
    const shareC = await auction.getUserShare(itemId, userC.address);
    
    const percentageA = await auction.getSharePercentage(itemId, userA.address);
    const percentageB = await auction.getSharePercentage(itemId, userB.address);
    const percentageC = await auction.getSharePercentage(itemId, userC.address);
    
    console.log("用户A份额:", ethers.utils.formatEther(shareA), "ETH", `(${percentageA/100}%)`);
    console.log("用户B份额:", ethers.utils.formatEther(shareB), "ETH", `(${percentageB/100}%)`);
    console.log("用户C份额:", ethers.utils.formatEther(shareC), "ETH", `(${percentageC/100}%)`);
    
    // 获取所有股东
    const shareholders = await auction.getAllShareholders(itemId);
    console.log("所有股东:", shareholders);
    
    // 获取出价记录
    const bidders = await auction.getMultiBidders(itemId);
    console.log("出价记录:", bidders);
}

// 运行测试
testMultiOwnership()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
*/
