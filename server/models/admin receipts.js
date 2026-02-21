const mongoose = require("mongoose");

const adminReceiptSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    userReceiptId: {type: String, required: true},
    email: {type: String, required: true},
    issuedBy: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    amount: {type: Number, required: true},
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

const AdminReceipt = mongoose.model("admin_receipts", adminReceiptSchema);

module.exports = AdminReceipt;