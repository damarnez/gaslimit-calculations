const ethers = require('ethers');
const fs = require('fs');

const mongoose = require('mongoose');
const Transaction = require('./schemas/Transaction');
const { nextTick } = require('process');
mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true });

const LENDING_POOL_MAINNET = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
const STORE_FUNCTIONS = ['deposit', 'withdraw', 'borrow', 'repay']

const BLOCK_CREATION = 11361678;
const BLOCK_NOW = 11896212;
const GRUP_BLOCK = 1000;
const N_ITERATIONS = Math.round((BLOCK_NOW - BLOCK_CREATION) / GRUP_BLOCK);
console.log('IT: ', N_ITERATIONS)

const loadTx = async () => {
  const ABI = await fs.readFileSync('./ABI.json')
  const etherscanProvider = new ethers.providers.EtherscanProvider("homestead", process.env.TOKEN_ETHERSCAN);
  const inter = new ethers.utils.Interface(JSON.parse(ABI));
  for await (let count of [...Array(N_ITERATIONS).keys()]) {
    const startBlock = BLOCK_CREATION + (count * GRUP_BLOCK);
    const endBlock = startBlock + GRUP_BLOCK;
    try {
      const history = await etherscanProvider.getHistory(LENDING_POOL_MAINNET, startBlock, endBlock);
      console.log('>> Transactions -> ', startBlock, endBlock, history.length);
      for await (let tx of history) {
        try {
          const decodedInput = inter.parseTransaction({ data: tx.data });
          // console.log(decodedInput);
          if (STORE_FUNCTIONS.includes(decodedInput.name)) {
            // console.log(decodedInput.args.amount)

            const newTx = new Transaction({
              name: decodedInput.name,
              from: tx.from,
              gasLimit: tx.gasLimit.toNumber(),
              gasPrice: tx.gasPrice.toString(),
              asset: decodedInput.args.asset.toString(),
              amount: decodedInput.args.amount.toString(),
              blockNumber: tx.blockNumber
            });
            await newTx.save();
          }
        } catch (error) {
          console.log('Error on parse and save : ', error);
        }
      }
    } catch (error) {
      console.log('ERROR to get the history : ', error)
    }
  }
}


loadTx().catch(console.log);


/**
 * Example TX:
 *  {
    hash: '0x102b3f908fff5529fd8eb9890664573d18f0c8e461485e004071782436bb1c21',
    blockHash: '0xc389580e45854dfb67ad81c591742750188fc6bdb31d2ad50e19800aff78f0c7',
    blockNumber: 11763234,
    transactionIndex: 178,
    confirmations: 138364,
    from: '0xd10Eb5b67DE1F0aBD04235B6d14022196b319E7F',
    gasPrice: BigNumber { _hex: '0x1176592e00', _isBigNumber: true },
    gasLimit: BigNumber { _hex: '0x03ba31', _isBigNumber: true },
    to: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    value: BigNumber { _hex: '0x00', _isBigNumber: true },
    nonce: 468,
    data: '0x573ade81000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000012a05f2000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000d10eb5b67de1f0abd04235b6d14022196b319e7f',
    creates: null,
    chainId: 0,
    timestamp: 1612088803
  },
 */

/**
 * Example
 *
 *
 *
 */


/**
 *
 *
 *
 *
 * {
   "inputs": [
     {
       "internalType": "address",
       "name": "asset",
       "type": "address"
     },
     {
       "internalType": "uint256",
       "name": "amount",
       "type": "uint256"
     },
     {
       "internalType": "uint256",
       "name": "interestRateMode",
       "type": "uint256"
     },
     {
       "internalType": "uint16",
       "name": "referralCode",
       "type": "uint16"
     },
     {
       "internalType": "address",
       "name": "onBehalfOf",
       "type": "address"
     }
   ],
   "name": "borrow",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
 },
 {
   "inputs": [
     {
       "internalType": "address",
       "name": "asset",
       "type": "address"
     },
     {
       "internalType": "uint256",
       "name": "amount",
       "type": "uint256"
     },
     {
       "internalType": "address",
       "name": "onBehalfOf",
       "type": "address"
     },
     {
       "internalType": "uint16",
       "name": "referralCode",
       "type": "uint16"
     }
   ],
   "name": "deposit",
   "outputs": [],
   "stateMutability": "nonpayable",
   "type": "function"
 },
 {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "withdraw",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rateMode",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "onBehalfOf",
        "type": "address"
      }
    ],
    "name": "repay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },

 */