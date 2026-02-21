const mongoose = require("mongoose");

const adminBookingSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    userBookingId: {type: String, required: true},
    // add transaction and receipt id prop later
    roomId: {type: String, required: true},
    checkIn: {type: String, required: true},
    checkOut: {type: String, required: true},
    persons: {type: Number, required: true},
    specialServices: {type: Boolean, required: true},
    expired: {type: Boolean, required: true},
    status: {type: String, required: true},
    seen: {type: Boolean, required: true},
    date: {type: String, required: true}
});

const AdminBooking = mongoose.model("admin_bookings", adminBookingSchema);

module.exports = AdminBooking;