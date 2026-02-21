const mongoose = require("mongoose");


const preTransactionRefundSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    userTransactionId: {type: String, required: true},
    receiptId: {type: String, required: true},
    refund_request_id: {type: String, required: true},
    email: {type: String, required: true},
    issuedBy: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    amount: {type: Number, required: true},
    status: {type: String, required: true},
    reference: {type: String, required: true},
    rooms: [
        {
            roomId: {type: String, required: true},
            specialServices: {type: Boolean, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            price: {type: Number, required: true}
        }
    ],
    seen: {type: Boolean, required: true},
    date: {type: String, required: true}
});

const PreTransactionRefund = mongoose.model("pre_transaction_refunds", preTransactionRefundSchema);

module.exports = PreTransactionRefund;