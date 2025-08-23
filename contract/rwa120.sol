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
 
        //商品信息初始化
        commodity[0] = "xuperchain Lamborghini";
        commodity[1] = "xuperchain Benz";
        commodity[2] = "xuperchain BMW";
 
        //商品的状态初始化
        state[0] = "To be auctioned";          //定义待拍卖状态
        state[1] = "Under auction";            //定义拍卖中状态
        state[2] = "Successfully Sold";        //定义成功出售状态
        state[3] = "Flow beat";                //定义流拍状态
        
        //拍卖时长初始化
        AuctionTime = 10 minutes;
        
        //商品价格初始化
        StartPrice = 100;
    }
 
   
 
    //定义 Authentication 函数修饰器，用于在执行函数时，用于判断是否为合约发起人
    modifier Authentication{
        require (Auctioneer == msg.sender, "You're not an auction promoter");
        _;
    }
 
    /*
    @notice 将商品上架
    @dev 商品状态必须为 "To be auctioned"
    @param uint8 numb -商品编号
    */
    function PutOnShelves(uint8 numb) public Authentication{
 
        //使用require对商品状态进行判断，当商品状态不为0时，说明我们的商品已经上架过并进行了其他操作
        require (Astate[numb] == 0, "The goods are under auction or have been sold");
 
        //使用require判断目前是否还有其他的商品正在进行拍卖
        require (timeStamp == 0 && endtime == 0, "Currently, there are goods under auction");
 
        //使用require判断当前商品是否存在
        require(bytes(commodity[numb]).length != 0,"The current product does not exist");
 
        //修改商品状态
        Astate[numb] = 1;
 
        //定义商品开始拍卖时间
        timeStamp= block.timestamp;
 
        //定义结束时间，为开始拍卖的十分钟后
        endtime = block.timestamp + 10 minutes;
 
        //商品归属者转移
        belong[numb] = Auctioneer;
    }
    
    /*
    @notice 实现买方对拍卖中的商品进行加价
    @dev 在 msg.value 中设置的加价的金额应该大于默认值 100
    @param uint8 numb -商品编号
    */
    function MarkUp (uint8 numb) public payable {
 
        //使用require对加价者身份进行判断，拍卖方无法对已上架的商品进行加价
        require(msg.sender != Auctioneer ,"The product is already in the auction, you cannot increase the price");
 
        //使用require判断当前时间是否在拍卖时间内
        require(block.timestamp < endtime && block.timestamp > timeStamp,"It'numb not auction time yet");
 
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
    @param uint8 numb -商品编号
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
    @param uint8 numb -商品编号
    */
    function AddTransaction(uint8 numb) internal {
 
        //将出价者的地址，金额，出价时间戳，添加进bidder
        bidder = Bidder(msg.sender,msg.value,block.timestamp);
        bidders.push(bidder);
        record[numb] = bidders;
    }
 
    /*
    @notice 实现修改商品的状态为  ”成功出售状态“ 或 ”流拍状态“
    @param uint8 numb -商品编号
    */
    function closeAuction(uint8 numb) public Authentication{
 
        //使用require对当前时间跟拍卖发起时间进行比较，判断当前是否处于拍卖结束
        require(block.timestamp > endtime, "Auction in progress");
 
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
    @notice 实现获取商品归属者
    @param uint8 numb -商品编号
    @return address -商品拥有者的地址
    */
    function getBelong(uint8 numb) public view Authentication returns(address){
        return belong[numb];
    }
 
    /*
    @notice 实现获取当前地址
    */
    function getSender() public view returns(address){
        return msg.sender;
    }
 
    /*
    @notice 实现获取对应商品的最高叫价
    @param uint8 numb -商品编号
    @return uint256 -商品最高叫价
    */
    function getMaxMoney(uint8 numb)public view returns(uint256){
 
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
    @notice 实现获取对应商品的状态
    @param uint8 numb -商品编号
    @return string -商品状态
    */
    function getStatus(uint8 numb)public view returns(string memory){
        return state[Astate[numb]];
    }
 
    /*
    @notice 实现获取对应编号的商品信息
    @parma uint8 numb -商品编号
    @return string -商品的名称
            uint256 -拍卖时长
            uint256 -起拍价格
            uint256 -拍卖结束时间
    */
    function getItemInformation(uint8 numb)public view returns(string memory,uint256,uint256,uint256){
 
        return (commodity[numb],AuctionTime,StartPrice,endtime);
    }
 
    /*
    @notice 实现获取对应编号的拍卖记录
    @dev 该方法只能有交易发起者调用
    @param uint8 numb -商品编号
    @return Bidder[] -交易记录的数组
    */
    function getRecord(uint8 numb) public view Authentication returns (Bidder[] memory){
        return record[numb];
    }
 
     /*
    @notice 实现拍卖发起人提取保证金
    @dev 该方法只能有交易发起者调用
    @param uint8 numb -商品编号
    */
    function getAuctionMoney(uint8 numb) public payable Authentication{
 
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
    @notice 销毁合约
    @dev 该方法只能由合约发起者调用，并且该方法只有在拍卖全部结束后才能调用，调用后合约将被销毁
    */
    function destroy() public virtual Authentication{
        for (uint256 i;i < 3;i++){
            require(Astate[i] != 1 && bond[i] == 0,"The goods are still in the auction or you haven't withdrawn the amount");
        }
    }
}