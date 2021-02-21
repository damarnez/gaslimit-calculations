const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
  name: String,
  from: String,
  gasLimit: Number,
  gasPrice: String,
  asset: String,
  amount: Number,
  blockNumber: Number

});

module.exports = mongoose.model('Transaction', transactionSchema);