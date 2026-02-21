const mongoose = require("mongoose");

const FAQSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
});


const FAQ = mongoose.model("frequently_asked_questions", FAQSchema);

module.exports =FAQ;