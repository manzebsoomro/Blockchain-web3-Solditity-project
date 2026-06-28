const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const ownerWallet = "0x5F3B3FC51BD17F845763B1519778Cee30a2E496c"; // From specification

  // Deploy MintToken
  const MintToken = await hre.ethers.getContractFactory("MintToken");
  const mintToken = await MintToken.deploy();
  await mintToken.waitForDeployment();
  const mintTokenAddress = await mintToken.getAddress();
  console.log("MintToken deployed to:", mintTokenAddress);

  // Deploy MintMaster
  const MintMaster = await hre.ethers.getContractFactory("MintMaster");
  const mintMaster = await MintMaster.deploy(mintTokenAddress, ownerWallet);
  await mintMaster.waitForDeployment();
  const mintMasterAddress = await mintMaster.getAddress();
  console.log("MintMaster deployed to:", mintMasterAddress);

  // Transfer all tokens from deployer to MintMaster for distribution
  const totalSupply = await mintToken.totalSupply();
  await mintToken.transfer(mintMasterAddress, totalSupply);
  console.log("Transferred total supply to MintMaster");

  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log("MintToken:", mintTokenAddress);
  console.log("MintMaster:", mintMasterAddress);
  console.log("Owner Wallet:", ownerWallet);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
