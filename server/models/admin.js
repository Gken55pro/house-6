const mongoose = require("mongoose");
const bycrpt = require("bcrypt");

// user schema defined
const adminSchema = new mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    image: {type: String, required: true},
    address: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    birthDate: {type: String, required: true},
    state: {type: String, required: true},
    country: {type: String, required: true},
    date: {type: String, required: true}
});

// static login function
adminSchema.statics.login = async (adminEmail, adminPassword)=>{
    const admin = await Admin.findOne({email: adminEmail});
    if(admin){
        
        const { password } = admin;
        const auth = await bycrpt.compare(adminPassword, password);

        if(auth){

            const { _id } = admin;
            return({ _id });

        }else throw Error("invalid password");   

    }else throw Error("invalid email");
};

// admin model
const Admin = mongoose.model("admins", adminSchema);

module.exports = Admin; 