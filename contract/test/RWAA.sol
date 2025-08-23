// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);

    function ownerOf(uint256 tokenId) external view returns (address owner);

    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    function transferFrom(address from, address to, uint256 tokenId) external;

    function approve(address to, uint256 tokenId) external;

    function getApproved(uint256 tokenId) external view returns (address operator);

    function setApprovalForAll(address operator, bool _approved) external;

    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

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

// 轻量ERC-721实现，仅包含必要功能以支撑拍卖
contract RWA721 is IERC721 {
    string public name;
    string public symbol;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    address private immutable _minter;
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        _minter = msg.sender;
    }

    // IERC165
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC721).interfaceId;
    }

    // 基础视图
    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "zero addr");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "nonexistent");
        return owner;
    }

    // 授权
    function approve(address to, uint256 tokenId) external override {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "not approved");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_owners[tokenId] != address(0), "nonexistent");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // 转移
    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "not owner nor approved");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "receiver reject");
    }

    // 内部
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "wrong from");
        require(to != address(0), "zero to");

        // 清空授权
        _tokenApprovals[tokenId] = address(0);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length == 0) return true;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }

    // 简易mint，仅合约部署者可调用（示例用途）
    function mint(address to, uint256 tokenId) external {
        require(msg.sender == _minter, "not minter");
        require(to != address(0), "zero to");
        require(_owners[tokenId] == address(0), "exists");
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
}


contract ArtRegistry {
    // 优化点1：移除冗余存储
    mapping(string => address) public artworkOwner; // ISBN => 所有者地址（减少存储槽）
    
    // 优化点2：添加事件通知
    event ArtRegistered(string indexed isbn, address indexed owner);
    event OwnershipTransferred(string indexed isbn, address indexed oldOwner, address indexed newOwner);

    // 优化点3：增强输入验证
    function registerArt(string calldata _isbn) external { // calldata更省gas
        require(bytes(_isbn).length > 0, "Invalid ISBN");         // 验证输入有效性[10]
        require(artworkOwner[_isbn] == address(0), "Artwork exists");
        
        artworkOwner[_isbn] = msg.sender;
        emit ArtRegistered(_isbn, msg.sender);
    }

    // 优化点4：防止无效地址转移
    function transferOwnership(string calldata _isbn, address _newOwner) external {
        require(_newOwner != address(0), "Invalid address");      // 避免零地址[5]
        require(artworkOwner[_isbn] == msg.sender, "Not owner");
        
        emit OwnershipTransferred(_isbn, msg.sender, _newOwner);
        artworkOwner[_isbn] = _newOwner; // 操作移到最后（重入风险防护）
    }

    // 优化点5：添加辅助视图函数
    function getOwner(string calldata _isbn) external view returns (address) {
        return artworkOwner[_isbn];
    }
}


