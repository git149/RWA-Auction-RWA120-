// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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