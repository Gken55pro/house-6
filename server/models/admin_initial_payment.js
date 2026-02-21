const mongoose = require("mongoose");

const adminInitialPaymentSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    userTransactionId: {type: String, required: true},
    email: {type: String, required: true},
    issuedBy: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    amount: {type: Number, required: true},
    status: {type: String, required: true},
    reference: {type: String, required: true},
    rooms: {type: Number, required: true},
    seen: {type: Boolean, required: true},
    date: {type: String, required: true}
});

const AdminInitialPayment = mongoose.model("admin_initial_refund_payments", adminInitialPaymentSchema);

module.exports = AdminInitialPayment;