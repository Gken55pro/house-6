const mongoose = require("mongoose");

const preTransactionSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    address: {type: String, required: true},
    phone_number: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
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

const preTransaction = mongoose.model("pre_transactions", preTransactionSchema);

module.exports = preTransaction;