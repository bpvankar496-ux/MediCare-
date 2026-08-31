// Compiles contracts/HealthRecordRegistry.sol using the solc compiler
// directly - no Hardhat/Truffle/Foundry involved. Writes the ABI + bytecode
// to build/HealthRecordRegistry.json for deploy.js to use.

const fs = require('fs');
const path = require('path');
const solc = require('solc');

const CONTRACT_PATH = path.join(__dirname, 'contracts', 'HealthRecordRegistry.sol');
const BUILD_DIR = path.join(__dirname, 'build');

function compile() {
  const source = fs.readFileSync(CONTRACT_PATH, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'HealthRecordRegistry.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === 'error');
    output.errors.forEach((e) => console.error(e.formattedMessage));
    if (fatal.length > 0) {
      throw new Error('Solidity compilation failed - see errors above.');
    }
  }

  const contract = output.contracts['HealthRecordRegistry.sol']['HealthRecordRegistry'];

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(BUILD_DIR, 'HealthRecordRegistry.json'),
    JSON.stringify(
      {
        abi: contract.abi,
        bytecode: '0x' + contract.evm.bytecode.object,
      },
      null,
      2
    )
  );

  console.log('Compiled OK -> blockchain/build/HealthRecordRegistry.json');
}

compile();
