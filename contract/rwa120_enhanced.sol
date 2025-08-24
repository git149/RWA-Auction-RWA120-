//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
 
//定义合约名为auction
contract auction{
 
    //定义拍卖行
    address payable public Auctioneer;
 
    //定义商品基本信息
    mapping(uint256 => string) commodity;
 
    //定义商品处于的状态
    mapping(uint256 => string) state;
 
    //状态池
    mapping(uint256 => uint256) Astate;
 
    //定义商品的归属人
    mapping(uint256 => address) belong;
 
    //定义买方交易金额的买方地址
    mapping(uint256 => address payable) maxAdd;
 
    //定义买方支付的交易金额
    mapping(uint256 => uint256) bond;
 
    //定义拍卖开始时间
    uint256 timeStamp;
 
    //定义拍卖结束时间
    uint256 endtime;
 
    //定义起拍价
    uint256 StartPrice;
 
    //定义拍卖时长
    uint256 AuctionTime;

    // ===== 新增：动态商品管理相关变量 =====
    
    //商品ID计数器，从3开始（0,1,2已被默认商品占用）
    uint256 public nextItemId = 3;
    
    //记录商品是否存在
    mapping(uint256 => bool) public itemExists;
    
    //记录所有存在的商品ID列表
    uint256[] public allItemIds;
    
    //记录每个商品的创建时间
    mapping(uint256 => uint256) public itemCreatedAt;
    
    //记录每个商品的创建者（可能与Auctioneer不同，用于扩展）
    mapping(uint256 => address) public itemCreator;

    // ===== 事件定义 =====

    event ItemAdded(uint256 indexed itemId, string itemName, address indexed creator, uint256 createdAt);
    event ItemRemoved(uint256 indexed itemId, string itemName);
    event AuctionStopped(uint256 indexed itemId, string itemName, address indexed highestBidder, uint256 refundAmount, uint256 stoppedAt);
 
    //定义出价记录的结构体
    struct Bidder {
        address addr; //出价者地址
        uint256 amount; //出价金额
        uint256 bidAt; //出价时间
    }
 
    //定义映射，用于记录不同编号商品对应的出价记录
    mapping(uint256 => Bidder[]) record;
 
    //单个出价记录
    Bidder bidder;
 
    //出价记录数组
    Bidder[] bidders;
 
    //变量初始化
    constructor (address _owner){
        //拍卖发起人(拍卖行)
        Auctioneer = payable(_owner);
 
        //商品信息初始化（保持不变）
        commodity[0] = "xuperchain Lamborghini";
        commodity[1] = "xuperchain Benz";
        commodity[2] = "xuperchain BMW";
 
        //商品的状态初始化
        state[0] = "To be auctioned";          //定义待拍卖状态
        state[1] = "Under auction";            //定义拍卖中状态
        state[2] = "Successfully Sold";        //定义成功出售状态
        state[3] = "Flow beat";                //定义流拍状态
        
        //拍卖时长初始化
        AuctionTime = 0 minutes;
        
        //商品价格初始化
        StartPrice = 100;

        // ===== 新增：初始化默认商品的存在性记录 =====
        itemExists[0] = true;
        itemExists[1] = true;
        itemExists[2] = true;
        
        allItemIds.push(0);
        allItemIds.push(1);
        allItemIds.push(2);
        
        // 记录默认商品的创建信息
        itemCreatedAt[0] = block.timestamp;
        itemCreatedAt[1] = block.timestamp;
        itemCreatedAt[2] = block.timestamp;
        
        itemCreator[0] = _owner;
        itemCreator[1] = _owner;
        itemCreator[2] = _owner;
    }
 
    //定义 Authentication 函数修饰器，用于在执行函数时，用于判断是否为合约发起人
    modifier Authentication{
        require (Auctioneer == msg.sender, "You're not an auction promoter");
        _;
    }

    // ===== 新增：拍卖时间管理函数 =====

    /*
    @notice 设置拍卖时长
    @dev 只有拍卖发起人可以调用，且只能在没有拍卖进行时设置
    @param _auctionTime 拍卖时长（以秒为单位）
    */
    function setAuctionTime(uint256 _auctionTime) external Authentication {
        require(timeStamp == 0 && endtime == 0, "Cannot change auction time while auction is active");
        AuctionTime = _auctionTime;
    }

    /*
    @notice 获取当前拍卖时长设置
    @return uint256 拍卖时长（以秒为单位）
    */
    function getAuctionTime() external view returns (uint256) {
        return AuctionTime;
    }

    // ===== 新增：动态商品管理函数 =====
    
    /*
    @notice 添加新的RWA商品
    @dev 只有拍卖发起人可以调用，商品ID自动递增
    @param itemName 商品名称
    @return uint256 新商品的ID
    */
    function addNewItem(string memory itemName) external Authentication returns (uint256) {
        require(bytes(itemName).length > 0, "Item name cannot be empty");
        require(bytes(itemName).length <= 100, "Item name too long");
        
        // 确保当前没有拍卖在进行
        require(timeStamp == 0 && endtime == 0, "Cannot add item while auction is active");
        
        uint256 newItemId = nextItemId;
        
        // 设置商品信息
        commodity[newItemId] = itemName;
        Astate[newItemId] = 0; // 待拍卖状态
        itemExists[newItemId] = true;
        allItemIds.push(newItemId);
        itemCreatedAt[newItemId] = block.timestamp;
        itemCreator[newItemId] = msg.sender;
        
        // 递增商品ID计数器
        nextItemId++;
        
        emit ItemAdded(newItemId, itemName, msg.sender, block.timestamp);
        
        return newItemId;
    }
    
    /*
    @notice 移除商品（仅限未拍卖或已结束的商品）
    @dev 只有拍卖发起人可以调用
    @param itemId 要移除的商品ID
    */
    function removeItem(uint256 itemId) external Authentication {
        require(itemExists[itemId], "Item does not exist");
        require(itemId >= 3, "Cannot remove default items");
        require(Astate[itemId] != 1, "Cannot remove item under auction");
        require(bond[itemId] == 0, "Cannot remove item with pending funds");
        
        string memory itemName = commodity[itemId];
        
        // 清除商品信息
        delete commodity[itemId];
        delete Astate[itemId];
        delete belong[itemId];
        delete itemExists[itemId];
        delete itemCreatedAt[itemId];
        delete itemCreator[itemId];
        
        // 从allItemIds数组中移除
        for (uint256 i = 0; i < allItemIds.length; i++) {
            if (allItemIds[i] == itemId) {
                allItemIds[i] = allItemIds[allItemIds.length - 1];
                allItemIds.pop();
                break;
            }
        }
        
        emit ItemRemoved(itemId, itemName);
    }
    
    /*
    @notice 获取所有商品ID列表
    @return uint256[] 所有存在的商品ID数组
    */
    function getAllItemIds() external view returns (uint256[] memory) {
        return allItemIds;
    }
    
    /*
    @notice 获取商品总数
    @return uint256 当前存在的商品总数
    */
    function getTotalItems() external view returns (uint256) {
        return allItemIds.length;
    }
    
    /*
    @notice 检查商品是否存在
    @param itemId 商品ID
    @return bool 商品是否存在
    */
    function itemExistsCheck(uint256 itemId) external view returns (bool) {
        return itemExists[itemId];
    }
    
    /*
    @notice 获取商品的详细信息
    @param itemId 商品ID
    @return itemName 商品名称
    @return exists 是否存在
    @return createdAt 创建时间
    @return creator 创建者地址
    */
    function getItemDetails(uint256 itemId) external view returns (
        string memory itemName,
        bool exists,
        uint256 createdAt,
        address creator
    ) {
        return (
            commodity[itemId],
            itemExists[itemId],
            itemCreatedAt[itemId],
            itemCreator[itemId]
        );
    }

    // ===== 修改现有函数以支持动态商品 =====
    
    /*
    @notice 将商品上架（修改版本，支持动态商品）
    @dev 商品状态必须为 "To be auctioned"
    @param numb 商品编号
    */
    function PutOnShelves(uint8 numb) public Authentication{
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");
        
        //使用require对商品状态进行判断，当商品状态不为0时，说明我们的商品已经上架过并进行了其他操作
        require (Astate[numb] == 0, "The goods are under auction or have been sold");
 
        //使用require判断目前是否还有其他的商品正在进行拍卖
        require (timeStamp == 0 && endtime == 0, "Currently, there are goods under auction");
 
        //修改商品状态
        Astate[numb] = 1;
 
        //定义商品开始拍卖时间
        timeStamp= block.timestamp;

        //定义结束时间，使用AuctionTime变量
        endtime = block.timestamp + AuctionTime;
 
        //商品归属者转移
        belong[numb] = Auctioneer;
    }

    /*
    @notice 实现买方对拍卖中的商品进行加价（修改版本，支持动态商品）
    @dev 在 msg.value 中设置的加价的金额应该大于默认值 100
    @param numb 商品编号
    */
    function MarkUp (uint8 numb) public payable {
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");

        //使用require对加价者身份进行判断，拍卖方无法对已上架的商品进行加价
        require(msg.sender != Auctioneer ,"The product is already in the auction, you cannot increase the price");

        //使用require判断当前时间是否在拍卖时间内
        //特殊处理：当AuctionTime为0时，只要拍卖已开始就允许出价
        if (AuctionTime > 0) {
            require(block.timestamp < endtime && block.timestamp >= timeStamp,"It'numb not auction time yet");
        } else {
            //当AuctionTime为0时，只要拍卖已开始就可以出价
            require(block.timestamp >= timeStamp, "Auction not started yet");
        }

        //使用require对当前商品的状态进行判断，加价的商品需要是正在拍卖的商品
        require(Astate[numb] == 1, "The current commodity auction has ended");

        //对加价判断是否为第一次出价
        if(bond[numb] == 0){

            //使用require判断第一次加价的金额不能低于起拍价
            require(msg.value > StartPrice,"Your bid amount must be greater than the starting price");
        }

        //使用require对加价金额判断不能低于上一次出价
        require(msg.value > bond[numb], "Your bid amount must be greater than the current price");

        //调用AmoutRollback函数，将上一个出价者的交易金额退回，并收取当前出价者的交易金额
        AmountRollback(numb);

        //调用AddTransaction函数，保存商品的出价记录
        AddTransaction(numb);

        //满足以上条件则说明买方的价格满足加价的要求，将当前的商品归属转移至此买方的地址
        belong[numb] = msg.sender;
    }

    /*
    @notice 实现将买方支付的保证金退回
    @param numb 商品编号
    */
    function AmountRollback(uint8 numb) internal {

        //将上一个支付交易金额退回
        maxAdd[numb].transfer(bond[numb]);

        //收取当前出价者的交易金额
        bond[numb] = msg.value;

        //记录出价者的地址
        maxAdd[numb] = payable(msg.sender);
    }

    /*
    @notice 实现记录商品的交易记录
    @param numb 商品编号
    */
    function AddTransaction(uint8 numb) internal {

        //将出价者的地址，金额，出价时间戳，添加进bidder
        bidder = Bidder(msg.sender,msg.value,block.timestamp);
        bidders.push(bidder);
        record[numb] = bidders;
    }

    /*
    @notice 实现修改商品的状态为  "成功出售状态" 或 "流拍状态"（修改版本，支持动态商品）
    @param numb 商品编号
    */
    function closeAuction(uint8 numb) public Authentication{
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");

        //使用require对当前时间跟拍卖发起时间进行比较，判断当前是否处于拍卖结束
        //特殊处理：如果AuctionTime为0，则允许立即关闭拍卖
        if (AuctionTime > 0) {
            require(block.timestamp > endtime, "Auction in progress");
        } else {
            //当AuctionTime为0时，只要拍卖已开始就可以关闭
            require(timeStamp > 0, "Auction not started");
        }

        //通过if语句进行判断，当前商品的归属是否是拍卖发起人
        if (belong[numb] == Auctioneer){

            //修改状态为流拍
            Astate[numb] = 3;
        }else{

            //将商品状态修改为成功拍卖
            Astate[numb] = 2;
        }

        //重置商品起拍时间
        timeStamp = 0;

        //重置商品结束拍卖时间
        endtime = 0;
    }

    /*
    @notice 提前停止正在进行的拍卖
    @dev 只有拍卖发起人可以调用，会退还最高出价给出价者
    @param numb 商品编号
    */
    function stopAuction(uint8 numb) public Authentication {
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");

        //检查商品是否正在拍卖中
        require(Astate[numb] == 1, "Item is not under auction");

        //检查是否确实有拍卖在进行（通过全局时间变量验证）
        require(timeStamp > 0 && endtime > 0, "No active auction found");

        //检查当前时间是否在拍卖期间内（确保不是自然结束）
        require(block.timestamp < endtime, "Auction has already ended naturally");

        // 记录停止前的信息用于事件
        string memory itemName = commodity[numb];
        address highestBidder = maxAdd[numb];
        uint256 refundAmount = bond[numb];

        // 处理资金退还（如果有出价者）
        if (bond[numb] > 0 && maxAdd[numb] != address(0)) {
            // 安全转账：退还最高出价给出价者
            address payable refundBidder = maxAdd[numb];
            uint256 refundAmountToTransfer = bond[numb];

            // 先重置状态，防止重入攻击
            bond[numb] = 0;
            maxAdd[numb] = payable(address(0));

            // 执行转账
            refundBidder.transfer(refundAmountToTransfer);
        }

        // 更新商品状态为流拍
        Astate[numb] = 3;

        // 商品归属权回归拍卖发起人
        belong[numb] = Auctioneer;

        // 重置全局拍卖时间变量
        timeStamp = 0;
        endtime = 0;

        // 清空出价记录（可选，保持与closeAuction一致）
        delete record[numb];

        // 发出停止拍卖事件
        emit AuctionStopped(numb, itemName, highestBidder, refundAmount, block.timestamp);
    }

    /*
    @notice 实现获取商品归属者（修改版本，支持动态商品）
    @param numb 商品编号
    @return address 商品拥有者的地址
    */
    function getBelong(uint8 numb) public view Authentication returns(address){
        require(itemExists[numb], "Item does not exist");
        return belong[numb];
    }

    /*
    @notice 实现获取当前地址
    */
    function getSender() public view returns(address){
        return msg.sender;
    }

    /*
    @notice 实现获取对应商品的最高叫价（修改版本，支持动态商品）
    @param numb 商品编号
    @return uint256 商品最高叫价
    */
    function getMaxMoney(uint8 numb)public view returns(uint256){
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");

        //使用require对商品的状态进行判断，需要对在拍卖的商品才能查询当前最高叫价
        require (Astate[numb] == 1 ,"The current product is not available");

        //没有买方出价，则返回商品初始价格
        if(bond[numb] == 0){
            return StartPrice;
        }else{
            return bond[numb];
        }

    }
    /*
    @notice 实现获取对应商品的状态（修改版本，支持动态商品）
    @param numb 商品编号
    @return string 商品状态
    */
    function getStatus(uint8 numb)public view returns(string memory){
        require(itemExists[numb], "Item does not exist");
        return state[Astate[numb]];
    }

    /*
    @notice 实现获取对应编号的商品信息（修改版本，支持动态商品）
    @parma numb 商品编号
    @return string 商品的名称
            uint256 拍卖时长
            uint256 起拍价格
            uint256 拍卖结束时间
    */
    function getItemInformation(uint8 numb)public view returns(string memory,uint256,uint256,uint256){
        require(itemExists[numb], "Item does not exist");
        return (commodity[numb],AuctionTime,StartPrice,endtime);
    }

    /*
    @notice 实现获取对应编号的拍卖记录（修改版本，支持动态商品）
    @dev 该方法只能有交易发起者调用
    @param numb 商品编号
    @return Bidder[] 交易记录的数组
    */
    function getRecord(uint8 numb) public view Authentication returns (Bidder[] memory){
        require(itemExists[numb], "Item does not exist");
        return record[numb];
    }

     /*
    @notice 实现拍卖发起人提取保证金（修改版本，支持动态商品）
    @dev 该方法只能有交易发起者调用
    @param numb 商品编号
    */
    function getAuctionMoney(uint8 numb) public payable Authentication{
        //检查商品是否存在
        require(itemExists[numb], "Item does not exist");

        //使用require判断商品拍卖是否结束
        require(block.timestamp > endtime, "The current auction is not over yet. You can't extract");

        //使用require判断商品是否成功出售
        require(Astate[numb] == 2 ,"Your product was not successfully sold");

        //使用require判断保证金内是否还有余额
        require(bond[numb] != 0, "You have initiated transaction amount withdrawal");

        //拍卖发起人提取保证金
        payable(msg.sender).transfer(bond[numb]);

        //重置保证金为0
        bond[numb] = 0;
    }

    /*
    @notice 销毁合约（修改版本，支持动态商品）
    @dev 该方法只能由合约发起者调用，并且该方法只有在拍卖全部结束后才能调用，调用后合约将被销毁
    */
    function destroy() public virtual Authentication{
        // 检查所有存在的商品
        for (uint256 i = 0; i < allItemIds.length; i++) {
            uint256 itemId = allItemIds[i];
            require(Astate[itemId] != 1 && bond[itemId] == 0, "Some goods are still in auction or funds not withdrawn");
        }

        // 销毁合约
        selfdestruct(Auctioneer);
    }
}
