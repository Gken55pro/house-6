const mongoose = require("mongoose");
const bycrpt = require("bcrypt");
const status = require("statuses");

// user schema defined
const userSchema = new mongoose.Schema({
    name: {type: String, unique: true, required: [true, "name is required"]},
    email: {type: String, unique: true, required: [true, "email is required"]},
    password: {type: String, minlength: [7, "password must have a minimum length of 7 characters"], required: [true, "password is required"]},
    image: {type: String, required: true},
    address: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    wishList: [
        {
            roomId: {type: String, required: true}
        }
    ],
    cart: [
        {
            roomId: {type: String, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            specialServices: {type: Boolean, required: true}
        }
    ],
    pendingCart: [
        {
            roomId: {type: String, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            specialServices: {type: Boolean, required: true}
        }
    ],
    bookings: [
        {
            roomId: {type: String, required: true},
            checkIn: {type: String, required: true},
            checkOut: {type: String, required: true},
            persons: {type: Number, required: true},
            specialServices: {type: Boolean, required: true},
            status: {type: String, required: true},
            expired: {type: Boolean, required: true},
            seen: {type: Boolean, required: true},
            date: {type: String, required: true}
        }
    ],
    transactions: [
        {
            email: {type: String, required: true},
            issuedBy: {type: String, required: true},
            state: {type: String, required: true},
            country: {type: String, required: true},
            phoneNumber: {type: String, required: true},
            amount: {type: Number, required: true},
            status: {type: String, required: true},
            reference: {type: String, required: true},
            rooms: {type: Number, required: true},
            seen: {type: Boolean, required: true},
            date: {type: String, required: true}
        }
    ],
    receipts: [
        {
            userId: {type: String, required: true},
            email: {type: String, required: true},
            issuedBy: {type: String, required: true},
            state: {type: String, required: true},
            country: {type: String, required: true},
            phoneNumber: {type: String, required: true},
            amount: {type: Number, required: true},
            rooms: [
                {
                    roomId: {type: String, required: true},
                    checkIn: {type: String, required: true},
                    checkOut: {type: String, required: true},
                    persons: {type: Number, required: true},
                    specialServices: {type: Boolean, required: true},
                    price: {type: Number, required: true}
                }
            ],
            seen: {type: Boolean, required: true},
            date: {type: String, required: true}
        }
    ],
    messages: [
        {
            icon: {type: String, required: true},
            title: {type: String, required: true},
            message: {type: String, required: true},
            seen: {type: Boolean, required: true},
            date: {type: String, required: true}
        }
    ],
    dateOfCreation: {type: String, required: true},
    terms: {type: Boolean, required: true}
});



// hash password using bycrpt before anything else
userSchema.pre("save", async function(next){
    const salt = await bycrpt.genSalt();
    const hashedPassword = await bycrpt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
});

// static login function
userSchema.statics.login = async (userEmail, userPassword)=>{
    const user = await User.findOne({email: userEmail});
    if(user){
        
        const { password } = user;
        const auth = await bycrpt.compare(userPassword, password);

        if(auth){

            const { _id } = user;
            return({ _id });

        }else throw Error("invalid password");   

    }else throw Error("invalid email");
};

// user model
const User = mongoose.model("users", userSchema);




module.exports = User;