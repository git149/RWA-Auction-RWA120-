// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "./interfaces/IERC721.sol";
import {IERC721Receiver} from "./interfaces/IERC721Receiver.sol";

/// @title 英式拍卖合约（适配ERC-721 RWA）
/// @notice 支持NFT托管、竞价、退款、结束结算，带重入保护与访问控制
contract Auction is IERC721Receiver {
    // 安全：简易重入锁
    uint256 private _unlocked = 1;
    modifier nonReentrant() {
        require(_unlocked == 1, "reentrant");
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    enum Status { NotStarted, Active, Ended }

    struct AuctionItem {
        address seller;
        address nft;
        uint256 tokenId;
        uint96 minBid;       // 起拍价
        uint64 startTime;
        uint64 endTime;
        address highestBidder;
        uint256 highestBid;
        Status status;
    }

    // 单一拍卖/或多拍卖均可，这里支持多拍卖，id自增
    uint256 public nextAuctionId;
    mapping(uint256 => AuctionItem) public auctions;
    // 竞拍者可提取的退款余额
    mapping(address => uint256) public pendingReturns;
    // 托管登记：记录NFT首次被safeTransfer到本合约时的存入者
    mapping(bytes32 => address) public hostedDepositor; // key = keccak256(abi.encode(nft, tokenId))

    event AuctionCreated(uint256 indexed id, address indexed seller, address indexed nft, uint256 tokenId, uint96 minBid, uint64 startTime, uint64 endTime);
    event BidPlaced(uint256 indexed id, address indexed bidder, uint256 amount, address prevBidder, uint256 prevAmount);
    event AuctionEnded(uint256 indexed id, address winner, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);

    // 创建并托管NFT（需要先在NFT合约中approve或者safeTransfer）
    function createAuction(
        address nft,
        uint256 tokenId,
        uint96 minBid,
        uint64 startTime,
        uint64 endTime
    ) external returns (uint256 id) {
        require(nft != address(0), "nft=0");
        require(endTime > startTime && endTime > block.timestamp, "bad time");
        require(minBid > 0, "minBid=0");

        id = ++nextAuctionId;
        auctions[id] = AuctionItem({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            minBid: minBid,
            startTime: startTime,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            status: Status.NotStarted
        });

        // 将NFT安全转移至本合约托管（需先approve或由safeTransfer触发）
        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(id, msg.sender, nft, tokenId, minBid, startTime, endTime);
    }

    // 由NFT合约safeTransferFrom触发的回调：可携带 data=abi.encode(minBid,startTime,endTime)
    function onERC721Received(address, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4) {
        // 记录托管存入者
        hostedDepositor[keccak256(abi.encode(msg.sender, tokenId))] = from;

        if (data.length == 0) {
            // 无参数时仅接受托管，需后续由卖家调用 createAuctionHosted 注册拍卖
            return IERC721Receiver.onERC721Received.selector;
        }
        // 解码参数
        (uint96 minBid, uint64 startTime, uint64 endTime) = abi.decode(data, (uint96, uint64, uint64));
        require(endTime > startTime && endTime > block.timestamp, "bad time");
        require(minBid > 0, "minBid=0");

        uint256 id = ++nextAuctionId;
        auctions[id] = AuctionItem({
            seller: from,
            nft: msg.sender,
            tokenId: tokenId,
            minBid: minBid,
            startTime: startTime,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            status: Status.NotStarted
        });
        emit AuctionCreated(id, from, msg.sender, tokenId, minBid, startTime, endTime);
        return IERC721Receiver.onERC721Received.selector;
    }

    // 针对已托管NFT（通过safeTransfer），由卖家显式创建拍卖
    function createAuctionHosted(address nft, uint256 tokenId, uint96 minBid, uint64 startTime, uint64 endTime) external returns (uint256 id) {
        require(nft != address(0), "nft=0");
        require(endTime > startTime && endTime > block.timestamp, "bad time");
        require(minBid > 0, "minBid=0");
        // 确认合约已托管该NFT
        require(IERC721(nft).ownerOf(tokenId) == address(this), "not hosted");
        // 只有存入者才能创建
        bytes32 key = keccak256(abi.encode(nft, tokenId));
        require(hostedDepositor[key] == msg.sender, "not depositor");

        id = ++nextAuctionId;
        auctions[id] = AuctionItem({
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            minBid: minBid,
            startTime: startTime,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            status: Status.NotStarted
        });
        emit AuctionCreated(id, msg.sender, nft, tokenId, minBid, startTime, endTime);
    }

    function startAuction(uint256 id) external {
        AuctionItem storage a = auctions[id];
        require(a.seller != address(0), "no auction");
        require(msg.sender == a.seller, "not seller");
        require(a.status == Status.NotStarted, "started");
        require(block.timestamp >= a.startTime, "not time");
        a.status = Status.Active;
        // 清理托管登记，避免后续滥用
        delete hostedDepositor[keccak256(abi.encode(a.nft, a.tokenId))];
    }

    function bid(uint256 id) external payable nonReentrant {
        AuctionItem storage a = auctions[id];
        require(a.status == Status.Active, "not active");
        require(block.timestamp < a.endTime, "ended");
        uint256 amount = msg.value;
        require(amount >= a.minBid && amount > a.highestBid, "low bid");

        // 之前最高出价者退款累加
        if (a.highestBidder != address(0)) {
            pendingReturns[a.highestBidder] += a.highestBid;
        }

        address prevBidder = a.highestBidder;
        uint256 prevAmount = a.highestBid;

        a.highestBidder = msg.sender;
        a.highestBid = amount;

        emit BidPlaced(id, msg.sender, amount, prevBidder, prevAmount);
    }

    function endAuction(uint256 id) external nonReentrant {
        AuctionItem storage a = auctions[id];
        require(a.status == Status.Active, "not active");
        require(block.timestamp >= a.endTime, "not end");
        a.status = Status.Ended;

        // 如果有赢家，转NFT并将资金计入待提取
        if (a.highestBidder != address(0)) {
            IERC721(a.nft).safeTransferFrom(address(this), a.highestBidder, a.tokenId);
            pendingReturns[a.seller] += a.highestBid;
        } else {
            // 无人出价，归还NFT
            IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);
        }

        emit AuctionEnded(id, a.highestBidder, a.highestBid);
    }

    // 提取资金（卖家提取成交价、被超越的竞拍者提取退款）
    function withdraw() external nonReentrant {
        uint256 bal = pendingReturns[msg.sender];
        require(bal > 0, "no fund");
        pendingReturns[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "xfer fail");
        emit FundsWithdrawn(msg.sender, bal);
    }

    // 只读视图
    function getAuction(uint256 id) external view returns (AuctionItem memory) {
        return auctions[id];
    }

    // 拒绝直接转账，避免误将ETH发送至合约
    receive() external payable { revert("send to bid"); }
    fallback() external payable { revert("send to bid"); }

}

