const { ethers } = require("ethers");

const mnemonic = process.argv[2];
const index = parseInt(process.argv[3], 10);

if (!mnemonic || isNaN(index)) {
  console.log("Usage: node derive-key.js \"your mnemonic phrase\" <index>");
  process.exit(1);
}

const wallet = ethers.HDNodeWallet.fromMnemonic(
  ethers.Mnemonic.fromPhrase(mnemonic),
  `m/44'/60'/0'/0/${index}`
);

console.log("Address:      ", wallet.address);
console.log("Private Key:  ", wallet.privateKey);