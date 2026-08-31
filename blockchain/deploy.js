// Deploys the compiled HealthRecordRegistry contract to Ethereum Sepolia
// using plain ethers.js - a real transaction against a real public test
// network, sent straight from this script (no framework in between).
//
// Run `npm run compile` first (or this script will do it for you if the
// build artifact is missing).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const BUILD_PATH = path.join(__dirname, 'build', 'HealthRecordRegistry.json');

async function main() {
  const { SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY } = process.env;

  if (!SEPOLIA_RPC_URL || !SEPOLIA_PRIVATE_KEY) {
    throw new Error(
      'Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY. Copy .env.example to .env and fill them in first.'
    );
  }

  if (!fs.existsSync(BUILD_PATH)) {
    console.log('No build artifact found, compiling first...');
    require('./compile.js');
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(BUILD_PATH, 'utf8'));

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(SEPOLIA_PRIVATE_KEY, provider);

  console.log('Deploying from wallet:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.warn(
      '\nWARNING: this wallet has 0 Sepolia ETH. Get free testnet ETH from a faucet ' +
        '(e.g. https://www.alchemy.com/faucets/ethereum-sepolia) before deploying.\n'
    );
  }

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log('Sending deployment transaction to Sepolia...');
  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log('Transaction sent:', deployTx.hash);
  console.log('Waiting for it to be mined...');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\nHealthRecordRegistry deployed to:', address);
  console.log('Deployment tx on Sepolia Etherscan: https://sepolia.etherscan.io/tx/' + deployTx.hash);
  console.log('Contract on Sepolia Etherscan:      https://sepolia.etherscan.io/address/' + address);
  console.log('\nNext step: put this address in server/.env as CONTRACT_ADDRESS=' + address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
