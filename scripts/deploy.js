const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying MotionNFT to Sepolia...");

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${(await deployer.provider.getBalance(deployer.address)) / 1e18} ETH`);

  // Deploy contract
  const MotionNFT = await hre.ethers.getContractFactory("MotionNFT");
  const motionNFT = await MotionNFT.deploy();
  await motionNFT.waitForDeployment();

  const contractAddress = await motionNFT.getAddress();
  console.log(`✓ MotionNFT deployed to: ${contractAddress}`);

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deployerAddress: deployer.address,
    network: "sepolia",
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✓ Deployment info saved to: ${deploymentPath}`);

  // Verify on block explorer
  console.log(`\nVerify on Etherscan:`);
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
