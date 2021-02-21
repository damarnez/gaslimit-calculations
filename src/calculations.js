const fs = require('fs');
const BigNumber = require('bignumber.js');
const mongoose = require('mongoose');
const Transaction = require('./schemas/Transaction');

mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true });
const STORE_FUNCTIONS = ['deposit', 'withdraw', 'borrow', 'repay'];
const N_SEGMENTS = 4;
const MAX_INT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const bn10 = new BigNumber(10);
function valueToBigNumber(value) {
  return new BigNumber(value);
}
function normalize(n, decimals) {
  return valueToBigNumber(n).dividedBy(bn10.pow(decimals)).toString(10);
}

function reverse(n, decimals) {
  return valueToBigNumber(n).multipliedBy(bn10.pow(decimals)).toString(10);
}

(async () => {

  const getMaxMin = async (name) => {
    return await Transaction.aggregate(
      [
        { "$match": { "name": name } },
        { "$sort": { "date": 1 } },
        {
          "$group": {
            "_id": "$asset",
            max: { $max: "$gasLimit" },
            min: { $min: "$gasLimit" },
            txCount: { $sum: 1 }
          }
        }
      ],
    );
  };

  const generateCalculations = async (name) => {

    const TxResult = {};
    const data = await getMaxMin(name);
    TxResult.summary = data;
    TxResult.calculations = {};
    for (let agg of data) {

      const diff = Math.round((agg.max - agg.min) / N_SEGMENTS);
      let lastQuery = 0;
      // we split in 5 categories
      for (let segment of [...Array(N_SEGMENTS + 1).keys()]) {
        const surp = diff * segment;
        const max = agg.min + surp;
        let summatory = new BigNumber(0);
        let counter = 0;
        const Query = (agg.txCount > 10) ? Transaction.find({ asset: agg._id, gasLimit: { $lte: max, $gt: lastQuery } }) : Transaction.find({ asset: agg._id });
        // Get all the documents
        for await (let doc of Query) {
          if (doc && doc.amount !== MAX_INT) {
            counter = counter + 1;
            summatory = summatory.plus(normalize(doc.amount, 22));
          }
        }
        summatory = summatory.dividedBy(counter);
        if (!TxResult.calculations[agg._id]) TxResult.calculations[agg._id] = {};
        // get this limit
        lastQuery = max;
        TxResult.calculations[agg._id][max] = reverse(summatory, 22);
      }
    }
    await fs.writeFileSync(`./calcs/${name}.json`, JSON.stringify(TxResult));
  };

  for (let name of STORE_FUNCTIONS) {
    try {
      await generateCalculations(name);
    } catch (error) {
      console.log('ERROR: ', error);
    }
  }
  // Close 
  mongoose.connection.close();
})();