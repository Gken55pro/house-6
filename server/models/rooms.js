const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name: {type: String, required: true},
    images: [
        {
            src: {type: String, required: true}, 
            status: {type: String, required: true}
        }
    ],
    description: {type: String, required: true},
    price: {
        person: {type: Number, required: true}, 
        amount: {type: Number, required: true}
    },
    services: [
        {
            name: {type: String, required: true}, 
            icon: {type: String, required: true}
        }
    ],
    special_services: [
        {
            name: {type: String, required: true}, 
            icon: {type: String, required: true}
        }
    ],
    video: {
        src: {type: String, required: true}
    },
    booked: {type: Boolean, required: true},
    pendingState: {type: Boolean, required: true},
    booking_count: [
        {
            user_id: {type: String, required: true}, 
            persons: {type: Number, required: true}, 
            check_in: {type: String, required: true}, 
            check_out: {type: String, required: true}, 
            expired: {type: Boolean, required: true},
            special_services: {type: Boolean, required: true},
            date: {type: String, required: true}
        }
    ],
    ratings: [
        {
            user_id: {type: String, required: true}, 
            rating: {type: String, required: true}, 
            date: {type: String, required: true}, 
            comment: {type: String, required: true}
        }
    ],
    booking_requests: [
        {
            user_id: {type: String, required: true}, 
            check_in: {type: String, required: true}, 
            check_out: {type: String, required: true}, 
            date: {type: String, required: true}
        }
    ],
    notifications:  [
        {
            user_id: {type: String, required: true}, 
        }
    ],
    location: {
        name: {type: String, required: true}, 
        map: {
            co_ordinates: {
                latitude: {type: Number, required: true}, 
                longitude: {type: Number, required: true}
            }
        }
    },
    date: {type: String, required: true}
});

const Room = mongoose.model("rooms", roomSchema);

module.exports = Room;