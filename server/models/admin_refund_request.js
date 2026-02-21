const mongoose = require("mongoose");

const adminRefundRequestSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    userTransactionId: {type: String, required: true},
    receiptId: {type: String, required: true},
    email: {type: String, required: true},
    issuedBy: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    amount: {type: Number, required: true},
    status: {type: String, required: true},
    processing: {type: Boolean, required: true},
    reference: {type: String, required: true},
    preTransactionRooms: [
        {
            roomId: {type: String, required: true},
            specialServices: {type: Boolean, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            price: {type: Number, required: true}
        }
    ],
    trackingArray: [
        {
            roomId: {type: String, required: true},
            specialServices: {type: Boolean, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            price: {type: Number, required: true},
            refundAmount: {type: Number, required: true}
        }
    ],
    rooms: {type: Number, required: true},
    type: {type: String, required: true},
    seen: {type: Boolean, required: true},
    date: {type: String, required: true}
});

const AdminRefundRequest = mongoose.model("admin_refund_requests", adminRefundRequestSchema);

module.exports = AdminRefundRequest;