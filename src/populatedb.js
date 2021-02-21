const ethers = require('ethers');
const fs = require('fs');
const path = require('path')
const mongoose = require('mongoose');
const Transaction = require('./schemas/Transaction');

mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true, useUnifiedTopology: true });

const LENDING_POOL_MAINNET = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
const STORE_FUNCTIONS = ['deposit', 'withdraw', 'borrow', 'repay'];

const BLOCK_CREATION = 11361678;
const BLOCK_NOW = 11896212;
const GRUP_BLOCK = 1000;

const N_ITERATIONS = Math.round((BLOCK_NOW - BLOCK_CREATION) / GRUP_BLOCK);
console.log('IT: ', N_ITERATIONS);

(async () => {
  const ABI = await fs.readFileSync(path.join(__dirname, '/ABI.json'));
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

  mongoose.connection.close()


})();