const mongoose = require("mongoose");

const webReviewSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    rating: { type: String, required: true },
    comment: { type: String, required: true },
    hidden: { type: Boolean, required: true },
    date: { type: String, required: true }
});


const webReview = mongoose.model("web_reviews", webReviewSchema);

module.exports = webReview;