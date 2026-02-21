
const mongoose = require("mongoose");

const flaggedDownSchema = new mongoose.Schema({
    email: {type: String, required: true},
    transactionId: {type: String, required: true},
    verified: {type: Boolean, required: true}
});

const FlaggedDown = mongoose.model("flagged_down_transactions", flaggedDownSchema);

module.exports = FlaggedDown;