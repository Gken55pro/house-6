const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    title: {type: String, required: true},
    icon: {type: String, required: true},
    message: {type: String, required: true},
    seen: {type: Boolean, required: true},
    date: {type: String, required: true},
});

const Message = mongoose.model("messages", messageSchema);

module.exports = Message;