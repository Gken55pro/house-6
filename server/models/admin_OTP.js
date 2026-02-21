const mongoose = require("mongoose");
const bycrpt = require("bcrypt");
const status = require("statuses");


// otp schema defined
const adminOtpSchema = new mongoose.Schema({
    email: {type: String, unique: true, required: [true, "OTP email is required"]},
    code: {type: String, required: true},
    status: {type: String, required: true}
});

// hash otp code using bycrpt before anything else
adminOtpSchema.pre("save", async function(next){
    const salt = await bycrpt.genSalt();
    const hashedCode = await bycrpt.hash(this.code, salt);
    this.code = hashedCode;
    next();
});

// verify otp
adminOtpSchema.statics.authenticate = async(email, OTPCode)=>{
    const otp = await AdminOTP.findOne({email: email});

    if(otp){
        const auth = await bycrpt.compare(OTPCode, otp.code);
        if(auth){
            await AdminOTP.updateOne({email: email}, {status: "verified"});
            return true;
        }throw Error("invalid OTP code");
    }else throw Error(`OTP expired`);
};


const AdminOTP = mongoose.model("admin_OTPs", adminOtpSchema);

module.exports = AdminOTP;
