import { ethers } from "ethers";
import solc from "solc";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia";
const OWNER_WALLET = "0x5F3B3FC51BD17F845763B1519778Cee30a2E496c";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log("Deploying with account:", wallet.address);

    const contractsDir = path.resolve("src");
    const openzeppelinDir = path.resolve("node_modules/@openzeppelin/contracts");

    function findImports(importPath) {
        if (importPath.startsWith("@openzeppelin/contracts/")) {
            const actualPath = path.join(path.resolve("node_modules"), importPath);
            return { contents: fs.readFileSync(actualPath, "utf8") };
        } else {
            const actualPath = path.join(contractsDir, importPath);
            if (fs.existsSync(actualPath)) {
                return { contents: fs.readFileSync(actualPath, "utf8") };
            }
        }
        return { error: "File not found" };
    }

    function compile(fileName, contractName) {
        const source = fs.readFileSync(path.join(contractsDir, fileName), "utf8");
        const input = {
            language: "Solidity",
            sources: { [fileName]: { content: source } },
            settings: { outputSelection: { "*": { "*": ["*"] } } },
        };
        const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
        if (output.errors) {
            output.errors.forEach(err => console.error(err.formattedMessage));
            if (output.errors.some(err => err.severity === "error")) throw new Error("Compilation failed");
        }
        return output.contracts[fileName][contractName];
    }

    console.log("Compiling MintToken...");
    const mintTokenData = compile("MintToken.sol", "MintToken");
    const MintTokenFactory = new ethers.ContractFactory(mintTokenData.abi, mintTokenData.evm.bytecode.object, wallet);
    
    console.log("Deploying MintToken...");
    const mintToken = await MintTokenFactory.deploy();
    await mintToken.waitForDeployment();
    const mintTokenAddress = await mintToken.getAddress();
    console.log("MintToken deployed to:", mintTokenAddress);

    console.log("Compiling MintMaster...");
    const mintMasterData = compile("MintMaster.sol", "MintMaster");
    const MintMasterFactory = new ethers.ContractFactory(mintMasterData.abi, mintMasterData.evm.bytecode.object, wallet);
    
    console.log("Deploying MintMaster...");
    const mintMaster = await MintMasterFactory.deploy(mintTokenAddress, OWNER_WALLET);
    await mintMaster.waitForDeployment();
    const mintMasterAddress = await mintMaster.getAddress();
    console.log("MintMaster deployed to:", mintMasterAddress);

    console.log("Transferring tokens to MintMaster...");
    const totalSupply = await mintToken.totalSupply();
    const tx = await mintToken.transfer(mintMasterAddress, totalSupply);
    await tx.wait();
    console.log("Tokens transferred.");

    console.log("\nDeployment Summary:");
    console.log("MintToken:", mintTokenAddress);
    console.log("MintMaster:", mintMasterAddress);
    console.log("Owner Wallet:", OWNER_WALLET);
}

main().catch(console.error);
