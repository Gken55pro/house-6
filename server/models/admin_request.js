const mongoose = require("mongoose");
const bycrpt = require("bcrypt");

// user schema defined
const adminRequestSchema = new mongoose.Schema({
    name: {type: String, unique: true, required: [true, "name is required"]},
    email: {type: String, unique: true, required: [true, "email is required"]},
    password: {type: String, minlength: [7, "password must have a minimum length of 7 characters"], required: [true, "password is required"]},
    image: {type: String, required: true},
    address: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    birthDate: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    date: {type: String, required: true}
});

// hash password using bycrpt before anything else
adminRequestSchema.pre("save", async function(next){
    const salt = await bycrpt.genSalt();
    const hashedPassword = await bycrpt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
});


const AdminRequest = mongoose.model("admin_request", adminRequestSchema);

module.exports = AdminRequest;