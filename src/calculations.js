const fs = require('fs');
const mongoose = require('mongoose');
const Transaction = require('./schemas/Transaction');

mongoose.connect('mongodb://localhost:27017/transactions', { useNewUrlParser: true });
const STORE_FUNCTIONS = ['deposit', 'withdraw', 'borrow', 'repay'];
const N_SEGMENTS = 4;
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
    for await (let agg of data) {
      if (agg.txCount > 10) {
        const diff = Math.round((agg.max - agg.min) / N_SEGMENTS);

        for await (let segment of [...Array(N_SEGMENTS + 1).keys()]) {
          const surp = diff * segment;
          const max = agg.min + surp;
          const results = await Transaction.find({ asset: agg._id, gasLimit: { $lte: max } }).limit(10);
          if (!TxResult.calculations[agg._id]) TxResult.calculations[agg._id] = {};
          TxResult.calculations[agg._id][max] = results.map(res => res.amount);

        }
      } else {
        const results = await Transaction.find({ asset: agg._id }).limit(10);
        if (!TxResult.calculations[agg._id]) TxResult.calculations[agg._id] = {};
        TxResult.calculations[agg._id][agg.max] = results.map(res => res.amount);
      }
    }
    await fs.writeFileSync(`./calcs/${name}.json`, JSON.stringify(TxResult));
  };

  for await (let name of STORE_FUNCTIONS) {
    await generateCalculations(name);
  }
  // Close 
  mongoose.connection.close();
})();