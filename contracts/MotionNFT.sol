// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MotionNFT is ERC721 {
    uint256 private _tokenId = 0;
    mapping(uint256 => string) public tokenMetadata;

    constructor() ERC721("MotionNFT", "MOTION") {}

    function mint(address to, string memory metadata) public returns (uint256) {
        uint256 id = _tokenId++;
        _safeMint(to, id);
        tokenMetadata[id] = metadata;
        return id;
    }
}
