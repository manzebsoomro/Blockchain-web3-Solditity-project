const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const wallet = ethers.Wallet.createRandom();
  console.log("New Wallet Generated:");
  console.log("Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("Mnemonic:", wallet.mnemonic.phrase);

  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const newEnvContent = envContent + `\nPRIVATE_KEY=${wallet.privateKey}\nDEPLOYER_ADDRESS=${wallet.address}\n`;
  fs.writeFileSync(envPath, newEnvContent);
  console.log("\nPrivate key saved to .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
