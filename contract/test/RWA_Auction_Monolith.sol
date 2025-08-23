// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/********************
 * Interfaces (单文件内只定义一次，避免重复声明)
 ********************/
interface IERC165 { function supportsInterface(bytes4 interfaceId) external view returns (bool); }

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

/********************
 * RWA721: 轻量ERC-721
 ********************/
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

    // 视图
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

    // 示例 mint：仅部署者
    function mint(address to, uint256 tokenId) external {
        require(msg.sender == _minter, "not minter");
        require(to != address(0), "zero to");
        require(_owners[tokenId] == address(0), "exists");
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
}

/********************
 * Auction: 英式拍卖
 ********************/
contract Auction is IERC721Receiver {
    // 重入保护
    uint256 private _unlocked = 1;
    modifier nonReentrant() { require(_unlocked == 1, "reentrant"); _unlocked = 2; _; _unlocked = 1; }

    enum Status { NotStarted, Active, Ended }

    struct AuctionItem {
        address seller;
        address nft;
        uint256 tokenId;
        uint96 minBid;
        uint64 startTime;
        uint64 endTime;
        address highestBidder;
        uint256 highestBid;
        Status status;
    }

    uint256 public nextAuctionId;
    mapping(uint256 => AuctionItem) public auctions;
    mapping(address => uint256) public pendingReturns;
    mapping(bytes32 => address) public hostedDepositor; // keccak256(nft, tokenId) => 存入者

    event AuctionCreated(uint256 indexed id, address indexed seller, address indexed nft, uint256 tokenId, uint96 minBid, uint64 startTime, uint64 endTime);
    event BidPlaced(uint256 indexed id, address indexed bidder, uint256 amount, address prevBidder, uint256 prevAmount);
    event AuctionEnded(uint256 indexed id, address winner, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);

    // 方式一：先 approve 再创建（内部会拉取 NFT 托管）
    function createAuction(address nft, uint256 tokenId, uint96 minBid, uint64 startTime, uint64 endTime) external returns (uint256 id) {
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

        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);
        emit AuctionCreated(id, msg.sender, nft, tokenId, minBid, startTime, endTime);
    }

    // 方式二：safeTransfer + data 自动登记
    function onERC721Received(address, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4) {
        hostedDepositor[keccak256(abi.encode(msg.sender, tokenId))] = from;
        if (data.length == 0) return IERC721Receiver.onERC721Received.selector;

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

    // 针对无 data 的 safeTransfer 场景
    function createAuctionHosted(address nft, uint256 tokenId, uint96 minBid, uint64 startTime, uint64 endTime) external returns (uint256 id) {
        require(nft != address(0), "nft=0");
        require(endTime > startTime && endTime > block.timestamp, "bad time");
        require(minBid > 0, "minBid=0");
        require(IERC721(nft).ownerOf(tokenId) == address(this), "not hosted");
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
        delete hostedDepositor[keccak256(abi.encode(a.nft, a.tokenId))];
    }

    function bid(uint256 id) external payable nonReentrant {
        AuctionItem storage a = auctions[id];
        require(a.status == Status.Active, "not active");
        require(block.timestamp < a.endTime, "ended");
        uint256 amount = msg.value;
        require(amount >= a.minBid && amount > a.highestBid, "low bid");

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

        if (a.highestBidder != address(0)) {
            IERC721(a.nft).safeTransferFrom(address(this), a.highestBidder, a.tokenId);
            pendingReturns[a.seller] += a.highestBid;
        } else {
            IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);
        }
        emit AuctionEnded(id, a.highestBidder, a.highestBid);
    }

    function withdraw() external nonReentrant {
        uint256 bal = pendingReturns[msg.sender];
        require(bal > 0, "no fund");
        pendingReturns[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok, "xfer fail");
        emit FundsWithdrawn(msg.sender, bal);
    }

    // 拒绝直接转账，避免误将ETH发送至合约
    receive() external payable { revert("send to bid"); }
    fallback() external payable { revert("send to bid"); }
}

