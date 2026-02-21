const mongoose = require("mongoose");

const roomGuardSchema = new mongoose.Schema({

    algoId: {type: String, required: true},
    validBookingSentMessages: [
        {
            bookingId: {type: String, required: true}
        }
    ]

});

const RoomGuardData = mongoose.model("room_guard_datas", roomGuardSchema);

module.exports = RoomGuardData;