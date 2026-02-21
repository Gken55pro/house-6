// required packeges
require("dotenv").config();
const { ObjectId } = require("mongodb");
const express = require("express");
const mongoose = require("mongoose");
const CORS = require("cors");
const cookieParser = require("cookie-parser"); 
const jwt = require("jsonwebtoken");
const bycrpt = require("bcrypt");
const nodeMailer = require("nodemailer");
const moment = require("moment");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require('crypto');


// import models user
const User = require("./models/user_schema");
const OTP = require("./models/OTP_schema");

// import model admin
const Admin = require("./models/admin");
const AdminOTP = require("./models/admin_OTP");
const AdminRequest = require("./models/admin_request");
const Room = require("./models/rooms");
const PreTransaction = require("./models/pre_transactions");
const AdminBooking = require("./models/admin_bookings");
const AdminReceipt = require("./models/admin receipts");
const AdminTransaction = require("./models/admin_transactions");
const AdminRefundRequest = require("./models/admin_refund_request");
const Message = require("./models/message");
const preTransaction = require("./models/pre_transactions");
const PreTransactionPending = require("./models/pre_transaction_pending");
const PreTransactionFailed = require("./models/pre_transaction_failed");
const PreTransactionRefund = require("./models/pre_transaction_refund");
const AdminInitialPayment = require("./models/admin_initial_payment");
const AdminDebtor = require("./models/admin_debtors_list");
const RoomGuardData = require("./models/room_guard");
const WebReview = require("./models/web_reviews");
const FAQ = require("./models/FAQ.js");
const PendingReceipt = require("./models/pending_receipt.js");
const FlaggedDown = require("./models/flagged_down_transaction.js");












// create app
const app = express();

// app use
app.use(express.json());
app.use(express.static("admin_images"));
app.use(express.static("user_images"));
app.use(express.static("documents"));
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(CORS({credentials: true, origin: true, methods: ["GET", "POST", "PATCH", "DELETE"]}));


// connect to database function
const connectToDb = async()=>{
    const url = process.env.Data_Base_URL;
    const PORT = process.env.PORT
    await mongoose.connect(url, {useCreateIndex: true, useUnifiedTopology: true, useNewUrlParser: true})
    .then(()=>{
        app.listen(PORT, ()=>{
            console.log(`Connected to database and listening at port ${PORT}`);
        });
    })
    .catch((err)=>{
        console.log("Failed to connect to database", err);
    })
};

// invoke function
connectToDb();

// model get request
app.get("/", (req, res)=>{
    res.status(200).json({status: "Okay"})
});



// auth api


// max age
const maxAge = 360 * 24 * 60 * 60;

// token generator
const idGenerator = ()=>{
    var id = "";
    for(i = 0; i <= 20; i++){
        const randomNumber = Math.floor(Math.random() * 9);
        if(id == ""){
            id = `${randomNumber}`;
        }else{
            id += `${randomNumber}`;
        }
    };
    return( id );
};

// create token ---- very important
const createToken = async(id)=>{
    const Token = await jwt.sign({ id }, process.env.JWT_SECRET_STRING, {expiresIn: maxAge});
    return({ Token })
};

// token decoder ---- very important
const tokenDecoder = async(token)=>{
    const extractedId = await jwt.verify(token, process.env.JWT_SECRET_STRING, (err, decodedToken)=>{
        if(!err){
            const { id } = decodedToken;
            return(id);
        };
    });
    return({_id: extractedId});
};

// check user ---- very important
const checkUser = async(request)=>{
    const Token = request.cookies.HOTEL_COOKIES;

    if(Token){
        const { _id } = await tokenDecoder(Token);

        if(_id){
           return({ _id });
        }else{
            return({error: "Error: could not decode token"});
        };
    }else{
        return({error: "Error: cookie not found"});
    };    
};

// check admin ---- very important
const checkAdmin = async(request)=>{
    const Token = request.cookies.HOTEL_ADMIN_COOKIES;
    if(Token){
        const { _id } = await tokenDecoder(Token);
        if(_id){
           return({ _id });
        }else{
            return({error: "Error: could not decod3 token"});
        };
    }else{
        return({error: "Error: cookie not found"});
    };    
};

// duplicate email
const isDuplicateEmail = async (email)=>{
    const duplicate = await User.findOne({email: email});
    if(!duplicate){
        return(false);
    }else{
        return(true);
    };
};

// duplicate email admin
const isDuplicateEmailAdmin = async (email)=>{
    const duplicate = await Admin.findOne({email: email});
    if(!duplicate){
        return(false);
    }else{
        return(true);
    };
};

// generate OTP code
const generateOTPCode = ()=>{
    var code = "";

    for(i = 0; i <= 3; i++){
        const randomNumber = `${Math.floor(Math.random() * 9)}`;

        if(code == ""){
            code = randomNumber;
        }else{
            code += randomNumber;
        };
    };

    return(code);
};

// send email ---- very important
const sendEmail = async(senderEmail, receiverEmail, subject, message)=>{

    // parameters
    const transport = await nodeMailer.createTransport(
        {
            service: "gmail",
            auth: { user: process.env.APP_EMAIL, pass: process.env.APP_PASSWORD}
        }
    );

    const mail = {
        from: senderEmail,
        to: receiverEmail,
        subject: `${subject}`,
        text: `${message}`
    };
    // end of parameters

    // main function
    const sendEmail = await transport.sendMail(mail)
    .then(()=>{return("Message sent successfully")})
    .catch(()=>{throw Error("Error: could not send message")});
    // end of main function

    // return main function because it's a function in a function else, you would not be able to access the .then and .catch after the intializing the send email function
    return(sendEmail);
};

// hash data
const hashByBycrypt = async(data)=>{
    if(data){
        const salt = await bycrpt.genSalt();
        const hasedData = await bycrpt.hash(data, salt);
        return(hasedData);
    }else throw Error("hash error");
};

// handle error ---- very important
function HandleError(err, duplicateError){

    const errors = { name: "default", email: "default", password: "default" };

    if(err.message === "invalid email"){
        errors.email = "invalid email";
    };

    if(err.message === "invalid password"){
        errors.password = "invalid password";
    };

    if(err.message === "password is required"){
        errors.password = "password is required";
    };

    if(duplicateError){
        errors.email = "email is already in use";
    };

    if(err.message === "OTP email missing"){
        errors.email = "Email is required to send OTP code";
    };

    if(err.message === "user does not exist"){
        errors.email = "Invalid email";
    };

    if(err.message === "hash error"){
        errors.password = "password is required";
    };

    if(err.message === "new password short"){
        errors.password = "new password must be at least 7 characters";
    };

    // user instance
    if(err.message.includes('users validation failed')){
        Object.values(err.errors).forEach(({properties})=>{
            errors[properties.path] = properties.message;
        });
    };

    // admin instance
    if(err.message.includes('admin_request validation failed')){
        Object.values(err.errors).forEach(({properties})=>{
            errors[properties.path] = properties.message;
        });
    };

    return({errors});
};


// auth function user

// create user
const createUser = async(request, response)=>{

    // destructure request body
    const { name, email, password } = request.body;

    // check for email duplicate
    const duplicateEmail = await isDuplicateEmail(email);

    // auth payload
    const authPayload = {_id: null, message: "", errors: {name: "default", email: "default", password: "default"}};
    
    try{

        // create user and extract _id
        const { _id } = await User.create({name, email, password, image: "no_image.png", address: "No address", state: "No state", country: "No country", phoneNumber: "No phone number",  wishList: [], cart: [], bookings: [], pendingCart: [], transactions: [], receipts: [], messages: [], dateOfCreation: `${new Date}`, terms: true});

        // create json web token using _id
        const { Token } = await createToken(_id);

        // create cookie using response
        response.cookie("HOTEL_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});

        // set authpayload _id
        authPayload._id = _id;

        // set  authpayload message
        authPayload.message = "User created successfully";

    }catch(err){

        // handle errors
        const { errors } = HandleError(err, duplicateEmail);

        // set authpayload errors
        authPayload.errors = errors

        // set  authpayload message
        authPayload.message = "Failed to create user";

    };
    
    // return auth payload
    return(authPayload);

};

// const login user
const loginUser = async = async(request, response)=>{

    // auth payload
    const authPayload = {_id: null, message: "", errors: {email: "default", password: "default"}};

    try{
        // extract login info's
        const { email, password } = request.body;

        // login user using static function
        const { _id } = await User.login(email, password);

        // set auth payload _id
        authPayload._id = _id;

        // set auth payload message
        authPayload.message = "User login successful";

        // create json web token using _id
        const { Token } = await createToken(_id);

        // create cookie using response
        response.cookie("HOTEL_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});
    }catch(err){
        const { errors } = HandleError(err);

        // set auth payload errors
        authPayload.errors = errors;

        // set auth payload message
        authPayload.message = "User login failed";
    };

    return(authPayload);
};

// create OTP
const createOTP = async(request, response)=>{

    // auth payload
    const authPayload = {message: "", errors: {email: "default"}};

    try{

        // extract OTP info
        const { email } = request.body;

        if(email){
            // delete any previous OTP in existence
            await OTP.deleteOne({email: email});
            
            // check if user exist
            const findUser = await User.findOne({email: email});

            if(findUser){
                // generate otp
                const OTPCode = generateOTPCode();

                console.log(OTPCode);

                // create OTP code
                const { _id } = await OTP.create({email, code: OTPCode, status: "not verified"});

                // create json web token using _id
                const { Token } = await createToken(_id);

                // create cookie using response
                response.cookie("HOTEL_OTP_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});

                // send otp code
                await sendEmail(process.env.APP_EMAIL, email, "Hotel project OTP Code request", `Dear user${email}, your OTP code is ${OTPCode}, please do not share it with anyone.`)
                .then(()=>{
                    return(true);
                })
                .catch((err)=>{
                    throw Error("Failed to send OTP code");
                }); 

                // update authpayload message 
                authPayload.message = "OTP sent successfully";

            }else throw Error("user does not exist");

        }else throw Error("OTP email missing");

    }catch(err){

        console.log(err)

        const { errors } = HandleError(err);

        // update authpayload error object 
        authPayload.errors.email = errors.email;

        // update authpayload message
        authPayload.message = err.message;
    };

    return(authPayload);
};

// verify OTP
const verifyOTP = async(request)=>{

    // auth payload
    const authPayload = {message: ""};

    // extract otp info
    const { code } = request.body;

    // token
    const token = request.cookies.HOTEL_OTP_COOKIES;
    
    // decode token
    const { _id } = await tokenDecoder(token);

    const { email } = await OTP.findOne({_id: new ObjectId(_id)});;

    try{

        // cheeck if otp code is valid static function
        await OTP.authenticate(email, code);

        // update auth payload message
        authPayload.message = "OTP verified successfully";

    }catch(err){

        // update auth payload message
        authPayload.message = err.message;
    };

    return(authPayload);
};

// verify OTP
const resetPassword = async(request, response)=>{

    // auth payload
    const authPayload = {message: "", errors: {password: "default"}};

    // extract otp info
    const { password } = request.body;

    // token
    const token = request.cookies.HOTEL_OTP_COOKIES;
    
    // decode token
    const { _id } = await tokenDecoder(token);

    // extract otp info's
    const { email, status } = await OTP.findOne({_id: new ObjectId(_id)});;

    try{
        // check if otp was found
        if(status){

            // check if otp status was verified
            if(status === "verified"){

                // update user
                const hashedPassword = await hashByBycrypt(password);

                // update user
                await User.updateOne({email: email}, {$set: {password: hashedPassword}});

                // update auth payload message
                authPayload.message = "reset password successfully";

                // delete OTP from data base
                await OTP.deleteOne({_id: new ObjectId(_id)});

                // delete otp cookie
                response.cookie("HOTEL_OTP_COOKIES", "", {httpOnly: true, secure: true, sameSite: "none", maxAge: 1000});

            }else throw Error("OTP was never verfied");
        }else throw Error("could not reset password");

    }catch(err){
        
        // handle errors
        const { errors } = HandleError(err);

        // update auth payload message
        authPayload.message = err.message;

        // update auth payload message
        authPayload.errors.password = errors.password;

        if(err.message == "new password short"){
            authPayload.message = "reset password failed";
        };

        if(err.message == "hash error"){
            authPayload.message = "reset password failed";
        };
    };

    return(authPayload);
};

// end of auth function user



// auth function admin

// create admin
const createAdminRequest = async(request, response)=>{

    const currentDate = moment().toISOString();

    // destructure request body
    const { name, email, password } = request.body;

    // delete any previous admin request
    await AdminRequest.deleteOne({email: email});

    // check for email duplicate
    const duplicateEmail = await isDuplicateEmailAdmin(email);

    // auth payload
    const authPayload = {_id: null, message: "", redirectAuth: false, errors: {name: "default", email: "default", password: "default"}};
    
    try{

        // check email for manager
        if(email != process.env.MANAGER_EMAIL){

            // create admin request if not manager

            // create user and extract _id
            const { _id } = await AdminRequest.create({name, email, password, image: "no_image.png", address: "No address", phoneNumber: "No phone number", birthDate: "No birth date", state: "No state", country: "No country", date: currentDate});

            // set authpayload _id
            authPayload._id = _id;

            // set  authpayload message
            authPayload.message = "admin request successful";

            // send notification email
            await sendEmail(email, process.env.APP_EMAIL, "New admin request", `User ${email} has made a new admin request.`)
            .then(()=>{
                return(true);
            })
            .catch((err)=>{console.log(err)});

        }else{
            // create account if manager

            // if no duplicate email
            if(duplicateEmail == false){

                // define salt
                const salt = await bycrpt.genSalt();

                // define hashed password
                const hashedPassword = await bycrpt.hash(password, salt);

                // create admin
                const newAdmin = await Admin.create({name: name, email: email, password: hashedPassword, image: "no_image.png", address: "No address", phoneNumber: "No phone number", birthDate: "No birth date", state: "No state", country: "No country", date: currentDate});

                // create json web token using _id
                const { Token } = await createToken(newAdmin._id);

                // send notification email
                await sendEmail(process.env.APP_EMAIL, newAdmin.email, "Admin account", `Dear alpha ${newAdmin.email}, your admin account has been created .`)
                .then(()=>{
                    return(true);
                })
                .catch((err)=>{console.log(err)});

                // set  authpayload message
                authPayload.message = "admin created successful";

                // set redirect auth
                authPayload.redirectAuth = true;

                // set auth payload id property
                authPayload._id = newAdmin._id

                // create cookie using response
                // response.cookie("HOTEL_ADMIN_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});
            };

        };

    }catch(err){

        // handle errors
        const { errors } = HandleError(err, duplicateEmail);

        // set authpayload errors
        authPayload.errors = errors

        // set  authpayload message
        authPayload.message = "Failed to make admin request";

    };
    
    // return auth payload
    return(authPayload);

};

// create admin
const createAdmin = async(request, response)=>{

    // destructure request body
    const { id } = request.params;

    // auth payload
    const authPayload = { message: "" };
    
    try{

        // find admin requset
        const adminRequest = await AdminRequest.findOne({_id: new ObjectId(id)});

        // create admin
        const newAdmin = await Admin.create({name: adminRequest.name, email: adminRequest.email, password: adminRequest.password, image: adminRequest.image, address: adminRequest.address, phoneNumber: adminRequest.phoneNumber, birthDate: adminRequest.birthDate, state: adminRequest.state, country: adminRequest.country, date: adminRequest.date});

        // create json web token using _id
        const { Token } = await createToken(newAdmin._id);

        // send notification email
        await sendEmail(process.env.APP_EMAIL, newAdmin.email, "Admin request", `Dear admin ${newAdmin.email}, your request have been reviewed and your admin account has been activated .`)
        .then(()=>{
            return(true);
        })
        .catch((err)=>{console.log(err)});

        // delete admin request
        await AdminRequest.deleteOne({_id: new ObjectId(id)});

        // set  authpayload message
        authPayload.message = "admin created successful";

    }catch(err){

        // set authpayload message
        authPayload.message = "Failed to create admin";

    };
    
    // return auth payload
    return(authPayload);

};

// login admin
const loginAdmin = async = async(request, response)=>{

    // auth payload
    const authPayload = {_id: null, message: "", errors: {email: "default", password: "default"}};

    try{
        // extract login info's
        const { email, password } = request.body;

        // login admin using static function
        const { _id } = await Admin.login(email, password);

        // set auth payload _id
        authPayload._id = _id;

        // set auth payload message
        authPayload.message = "admin login successful";

        // create json web token using _id
        const { Token } = await createToken(_id);

        // create cookie using response
        response.cookie("HOTEL_ADMIN_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});
    }catch(err){
        const { errors } = HandleError(err);

        // set auth payload errors
        authPayload.errors = errors;

        // set auth payload message
        authPayload.message = "admin login failed";
    };

    return(authPayload);
};

// create OTP admin
const createOTPAdmin = async(request, response)=>{

    // auth payload
    const authPayload = {message: "", errors: {email: "default"}};

    try{

        // extract OTP info
        const { email } = request.body;

        if(email){
            // delete any previous OTP in existence
            await AdminOTP.deleteOne({email: email});
            
            // check if admin exist
            const findUser = await Admin.findOne({email: email});

            if(findUser){
                // generate otp
                const OTPCode = generateOTPCode();

                console.log(OTPCode);

                // create OTP code admin
                const { _id } = await AdminOTP.create({email, code: OTPCode, status: "not verified"});

                // create json web token using _id
                const { Token } = await createToken(_id);

                // create cookie using response
                response.cookie("HOTEL_ADMIN_OTP_COOKIES", Token, {httpOnly: true, secure: true, sameSite: "none", maxAge: maxAge * 1000});

                // send otp code
                await sendEmail(process.env.APP_EMAIL, email, "Hotel project OTP Code request", `Dear admin${email}, your OTP code is ${OTPCode}, please do not share it with anyone.`)
                .then(()=>{
                    return(true);
                })
                .catch((err)=>{
                    throw Error("Failed to send OTP code");
                }); 

                // update authpayload message 
                authPayload.message = "OTP sent successfully";

            }else throw Error("admin does not exist");

        }else throw Error("OTP email missing");

    }catch(err){

        const { errors } = HandleError(err);

        // update authpayload error object 
        authPayload.errors.email = errors.email;

        // update authpayload message
        authPayload.message = err.message;
    };

    return(authPayload);
};

// verify OTP admin
const verifyOTPAdmin = async(request)=>{

    // auth payload
    const authPayload = {message: ""};

    // extract otp info
    const { code } = request.body;

    // token
    const token = request.cookies.HOTEL_ADMIN_OTP_COOKIES;
    
    // decode token
    const { _id } = await tokenDecoder(token);

    // extract admin OTP email
    const { email } = await AdminOTP.findOne({_id: new ObjectId(_id)});;

    try{

        // cheeck if otp code is valid static function
        await AdminOTP.authenticate(email, code);

        // update auth payload message
        authPayload.message = "OTP verified successfully";

    }catch(err){

        // update auth payload message
        authPayload.message = err.message;
    };

    return(authPayload);
};

// verify OTP admin
const resetPasswordAdmin = async(request, response)=>{

    // auth payload
    const authPayload = {message: "", errors: {password: "default"}};

    // extract otp info
    const { password } = request.body;

    // token
    const token = request.cookies.HOTEL_ADMIN_OTP_COOKIES;
    
    // decode token
    const { _id } = await tokenDecoder(token);

    // extract otp info's
    const { email, status } = await AdminOTP.findOne({_id: new ObjectId(_id)});;

    try{
        // check if otp was found
        if(status){

            // check if otp status was verified
            if(status === "verified"){

                // update admin
                const hashedPassword = await hashByBycrypt(password);

                // update admin
                await Admin.updateOne({email: email}, {$set: {password: hashedPassword}});

                // update auth payload message
                authPayload.message = "reset password successfully";

                // delete OTP from data base
                await AdminOTP.deleteOne({_id: new ObjectId(_id)});

                // delete otp cookie
                response.cookie("HOTEL_ADMIN_OTP_COOKIES", "", {httpOnly: true, secure: true, sameSite: "none", maxAge: 1000});

            }else throw Error("OTP was never verfied");
        }else throw Error("could not reset password");

    }catch(err){
        
        // handle errors
        const { errors } = HandleError(err);

        // update auth payload message
        authPayload.message = err.message;

        // update auth payload message
        authPayload.errors.password = errors.password;

        if(err.message == "new password short"){
            authPayload.message = "reset password failed";
        };

        if(err.message == "hash error"){
            authPayload.message = "reset password failed";
        };
    };

    return(authPayload);
};

// end of auth function admin



// auth user

// auth check
app.get("/auth_check_user", async(req, res)=>{
    try{
        const auth = await checkUser(req);
        // console.log(auth);
        const { _id } = auth;
        
        // find user
        const user = await User.findOne({_id: new ObjectId(_id)});

        if(_id){
            res.status(200).json({ _id, user });
        }else{
            const { error } = auth;
            throw Error(error);
        };
    }catch(err){
        res.status(400).json({error: err.message});
    };
});

// create user
app.post("/auth_create_user", async(req, res)=>{

    // create user and extract info's 
    const { _id, message, errors } = await createUser(req, res);

    try{
        // if user id, send response
        if(_id != null){
            // send success response
            res.status(200).json({ _id, message });
        }else{
            // throw auth error message
            throw Error(message);
        };
    }catch(err){
        // send failed response
        res.status(400).json({error: errors, message: err.message});
    };

});

// create user
app.post("/auth_login_user", async(req, res)=>{

    // call static function login
    const { _id, errors, message } = await loginUser(req, res);

    try{
        // status based on _id
        if(_id != null){
            // send success response
            res.status(200).json({message: message});
        }else throw Error(message);
    }catch(err){
        console.log("triggered")
        // send failed response
        res.status(400).json({error: errors, message: err.message});
    };

});

// request OTP
app.post("/auth_requset_otp", async(req, res)=>{
    // create OTP
    const { message, errors } = await createOTP(req, res);

    try{
        // check message
        if(message === "OTP sent successfully"){
            res.status(200).json({redirectUrl: "/verify_OTP", message: message});
        }else{
            throw Error(message);
        };

    }catch(err){
        res.status(400).json({error: errors, message: message});
    };
});

// verify OTP
app.post("/auth_verify_otp", async(req, res)=>{

    // verify OTP
    const { message } = await verifyOTP(req);

    try{
        // check message
        if(message === "OTP verified successfully"){
            res.status(200).json({redirectUrl: "/reset_password", message: message});
        }else throw Error(message);

    }catch(err){
        res.status(400).json({error: "verification failed", message: message});
    };
});

// reset password
app.post("/auth_reset_password", async(req, res)=>{

    // reset password
     const { message, errors } = await resetPassword(req, res);
    try{
         // check message
        if(message === "reset password successfully"){
            res.status(200).json({redirectUrl: "/login", message: message});
        }else throw Error(message);
    }catch(err){
        res.status(400).json({error: errors, message: message});
    };
});

// logout
app.post("/auth_logout_user", async(req, res)=>{
    try{
        res.cookie("HOTEL_COOKIES", "", {httpOnly: true, secure: true, sameSite: "none", maxAge: 1000}).status(200).json({message: "Logout successful"});
    }catch(err){
        res.status(400).json({error: "Logout failed"});
    };
});

// end of auth user



// auth admin

// auth check
app.get("/auth_check_admin", async(req, res)=>{

    try{
        const auth = await checkAdmin(req);

        const { _id } = auth;

        if(_id){
            // find admin
            const admin = await Admin.findOne({_id: new ObjectId(_id)});

            // extract props
            const { name, email, image, address, phoneNumber, birthDate, state, country, date } = admin;

            // define data
            const data = { _id, name, email, image, address, phoneNumber, birthDate, state, country, status: email == process.env.MANAGER_EMAIL?"alpha":"subject", date };

            // send response
            res.status(200).json({ _id, admin: data });
        }else{
            const { error } = auth;
            throw Error(error);
        };
    }catch(err){
        res.status(400).json({error: err.message});
    };

});

// create admin request
app.post("/auth_create_admin_request", async(req, res)=>{

    // create admin and extract info's 
    const { _id, message, errors, redirectAuth } = await createAdminRequest(req, res);

    try{

        // if admin id, send response
        if(_id != null){
            // send success response
            res.status(200).json({ _id, message, redirectAuth });
        }else{
            // throw auth error message
            throw Error(message);
        };
    }catch(err){
        // send failed response
        res.status(400).json({error: errors, message: err.message});
    };
});

// create admin using admin request
app.get("/auth_create_admin/:id", async(req, res)=>{

    // create user and extract info's 
    const { message } = await createAdmin(req, res);

    try{
        // if user id, send response
        if(message === "admin created successful"){

            // send success response
            res.status(200).json({ message });

        }else{
            // throw auth error message
            throw Error(message);
        };
    }catch(err){
        console.log(err)
        // send failed response
        res.status(400).json({error: "error", message: err.message});
    };

});

// delete admin request
app.delete("/auth_delete_admin_rquest/:id", async(req, res)=>{

    // extract admin request id
    const { id } = req.params;

    try{
        // delete admin request
        await AdminRequest.deleteOne({_id: new ObjectId(id)});

        // send response
        res.status(200).json({message: "Admin request deleted"});
    }catch(err){
        // send failed response
        res.status(400).json({error: "error", message: err.message});
    };

});

// create admin
app.post("/auth_login_admin", async(req, res)=>{

    // call static function login
    const { _id, errors, message } = await loginAdmin(req, res);

    try{
        // status based on _id
        if(_id != null){
            // send success response
            res.status(200).json({message: message});
        }else throw Error(message);
    }catch(err){
        // send failed response
        res.status(400).json({error: errors, message: err.message});
    };

});

// request OTP admin
app.post("/auth_request_otp_admin", async(req, res)=>{
    // create OTP
    const { message, errors } = await createOTPAdmin(req, res);

    try{
       console.log(message)
        // check message
        if(message === "OTP sent successfully"){
            res.status(200).json({redirectUrl: "/verify_OTP_admin", message: message});
        }else{
            throw Error(message);
        };

    }catch(err){
        res.status(400).json({error: errors, message: message});
    };
});

// verify OTP admin
app.post("/auth_verify_otp_admin", async(req, res)=>{

    // verify OTP
    const { message } = await verifyOTPAdmin(req);

    try{
        // check message
        if(message === "OTP verified successfully"){
            res.status(200).json({redirectUrl: "/reset_password_admin", message: message});
        }else throw Error(message);

    }catch(err){
        res.status(400).json({error: "verification failed", message: message});
    };
});

// reset password admin
app.post("/auth_reset_password_admin", async(req, res)=>{

    // reset password
     const { message, errors } = await resetPasswordAdmin(req, res);
    try{
         // check message
        if(message === "reset password successfully"){
            res.status(200).json({redirectUrl: "/login_admin", message: message});
        }else throw Error(message);
    }catch(err){
        res.status(400).json({error: errors, message: message});
    };
});

// logout admin
app.post("/auth_logout_admin", async(req, res)=>{
    try{
        res.cookie("HOTEL_ADMIN_COOKIES", "", {httpOnly: true, secure: true, sameSite: "none", maxAge: 1000}).status(200).json({message: "Logout successful"});
    }catch(err){
        res.status(400).json({error: "Logout failed"});
    };
});

// end of auth admin




// room guards

// room guard comparison
const roomGuardComparison = (currentDate, checkIn, checkOut)=>{

    const status = {state: null, expired: false};

    if(checkIn.isAfter(currentDate) && checkOut.isAfter(currentDate)){
        status.state = "awaiting";
        status.expired = false;
    };

    if(checkIn.isBefore(currentDate) && currentDate.isBefore(checkOut)){
        status.state = "valid";
        status.expired = false;
    };

    if(currentDate.isAfter(checkIn) && currentDate.isAfter(checkOut)){
        status.state = "expired";
        status.expired = true;
    };

    return(status);
};

// room guard notify users
const roomGuardNotifyUsers = async(roomId, array)=>{

    // define status
    var status =  false;

    // definr current date
    const currentDate = moment().toISOString();

    // find room
    const { name } = await Room.findOne({_id: new ObjectId(roomId)});

    // define variable i for while loop
    var i = 0;

    while(i < array.length){
        // extract user
        const { user_id } = array[i];

        // alert user on room free
        await createUserMessage(user_id, "bi bi-door-open", "Room open", `${name} is now opened for booking, secure room now.`, currentDate);
    };

    // if all user's have gotten the alert notification, clear previous notification array
    if(i == (array.length - 1)){
        // clear previous notification array
        await Room.updateOne({_id: new ObjectId(roomId)}, {$set: {notifications: []}});

        // set status to true
        status = true;
    };

    // return status
    return status;
};

// watch all rooms and check for current user booking expired
const RoomGuard = async()=>{

    // rooms array
    const roomsArray = [];

    // push booked rooms to room array
    await Room.find({booked: true}, (err, data)=>{
        if(!err){
            data.forEach((doc)=>{
                roomsArray.push(doc);
            });
        };
    });


    // find current guest
    var i = 0;

    while(i < roomsArray.length){

        const room = roomsArray[i];
        const { booking_count } = room;

        // check for valid guests
        const isValidGuestsIncluded = booking_count.filter((guest)=>{return(guest.expired === false)})[0];

        if(booking_count.length != 0 && isValidGuestsIncluded){
            // detect current guest using the difference in days between the current date and guest check-in date, lowest difference is current guest
            
            // current date
            const currentDate = moment();

            const { _id, difference } = booking_count.filter((guest)=>{return(guest.expired === false)})
            .filter((guest)=>{return(guest.expired === false)})
            .map((guest)=>{
                const { _id } = guest;
                const checkIn = moment(guest.check_in);
                const differenceInDate = currentDate.clone().diff(checkIn);
                const difference = moment(differenceInDate).milliseconds();
                return({_id, difference});
            })
            .sort((a, b) => a.difference - b.difference)[0];

            // filtered bookings expired
            const filteredBookingsExpired = booking_count.filter((guest)=>{return(guest.expired === false)});

            // current guest
            const currentGuest = booking_count.filter((guest)=>{return(guest._id === _id)})[0];

            const checkInDate = moment(currentGuest.check_in);
            const checkOutDate = moment(currentGuest.check_out);

            // check for current guest admin booking status
            const currentGuestAdminBooking = await AdminBooking.findOne({ roomId: room._id, userId: currentGuest.user_id, checkIn: currentGuest.check_in, checkOut: currentGuest.check_out});
            
            // room guard compare dates
            const status = roomGuardComparison(currentDate, checkInDate, checkOutDate);

            // extract state and expired from room comparison
            const { state, expired } = status;

            if(currentGuestAdminBooking && currentGuestAdminBooking.status.toLowerCase() != "cancel request"){

                if(expired == true && state == "expired"){

                    // extract user id from guest
                    const { user_id, check_in, check_out } = currentGuest;
                    
                    // find user
                    const { email, bookings } = await User.findOne({_id: new ObjectId(user_id)});

                    // update user bookings
                    const newBookings = bookings.map((item)=>{
                        if(item.checkIn == check_in && item.checkOut === check_out){
                            const newItem = item;
                            newItem.expired = true;
                            newItem.status = "expired";
                            return(newItem);
                        }else{
                            return(item);
                        };
                    });

                    // update set user bookings
                    await User.updateOne({_id: new ObjectId(user_id)}, {$set: {bookings: newBookings}});

                    // update admin booking single, expired
                    bookings.forEach(async(item)=>{
                        if(item.checkIn == check_in && item.checkOut === check_out){
                            await AdminBooking.updateOne({userBookingId: item._id}, {$set: {expired: true, status: "expired"}});
                        };
                    });

                    // new room booking count
                    const newRoomBookings = room.booking_count.map((item)=>{
                        if(item.check_in == check_in && item.check_out === check_out){
                            const newItem = item;
                            newItem.expired = true;
                            return(newItem);
                        }else{
                            return(item);
                        };
                    });

                    // update room booking count
                    await Room.updateOne({_id: new ObjectId(room._id)}, {$set: {booking_count: newRoomBookings}});

                    // update room booked to false
                    if(filteredBookingsExpired.length == 1){
                        await Room.updateOne({_id: new ObjectId(room._id)}, {$set: {booked: false}});

                        // take all user id in notification array and send the alert message to them
                        const { _id, notifications } = room;

                        // room guard notify users func on room free for booking
                        const status = await roomGuardNotifyUsers(_id, notifications);

                        // create admin message
                        await createMessage("Free room", "bi bi-door-open", `${room.name} is opened for booking`, currentDate);
                    };
                    
                    // create admin message
                    await createMessage("Booking expired", "bi bi-clock", `User ${email} booking for ${room.name} has expired`, currentDate.toISOString());

                    // alert user on booking expired
                    await createUserMessage(user_id, "bi bi-clock", "Booking expired", `Your booking for ${room.name} has expired`, currentDate.toISOString());

                    // increase i by 1 and move on to the next
                    i++;

                }else if(expired == false && state == "valid"){

                    // extract user id from guest
                    const { user_id, check_in, check_out } = currentGuest;
                    
                    // find user
                    const { email, bookings } = await User.findOne({_id: new ObjectId(user_id)});

                    // update user bookings
                    const newBookings = bookings.map((item)=>{
                        if(item.roomId == roomsArray[i]._id && item.checkIn == check_in && item.checkOut === check_out){
                            const newItem = item;
                            if(newItem.status != "cancel request"){
                                newItem.status = "valid";
                                return(newItem);
                            };     
                        }else{
                            return(item);
                        };
                    });

                    // update set user bookings
                    await User.updateOne({_id: new ObjectId(user_id)}, {$set: {bookings: newBookings}});

                    // update admin booking single, valid
                    bookings.forEach(async(item)=>{
                        if(item.roomId == roomsArray[i]._id && item.checkIn == check_in && item.checkOut == check_out && item.status.toLowerCase() != "cancel request"){
                            if(item.status != "canceled"){
                                await AdminBooking.updateOne({userBookingId: item._id}, {$set: {status: "valid"}});
                            };
                        };
                    });

                    // define filtered booking user id
                    const filteredBooking = bookings.filter((item)=>{
                        if(item.roomId == room._id && item.checkIn === check_in && item.checkOut === check_out){
                            return(item);
                        };
                    })[0];
                    
                    // if the filtered booking user id exist
                    if(filteredBooking){

                        const adminBookingUserId = filteredBooking._id;

                        // find admin booking 
                        const adminBooking = await AdminBooking.findOne({userBookingId: adminBookingUserId});

                        // get valid booking message sent from room guard data
                        const { validBookingSentMessages } = await RoomGuardData.findOne({algoId: process.env.ALGO_ID});

                        // check for admin booking id in valid booking sent messages
                        const messageSent = validBookingSentMessages.filter((doc)=>{return(doc.bookingId == adminBooking._id)})[0];

                        // check if room guard have sent the message before to user
                        if(!messageSent){
                            // create admin message
                            await createMessage("Booking now valid", "bi bi-clock", `User ${email} booking for ${room.name} is now valid and will expire in ${moment(check_out).format("MMM DD YYYY")}`, currentDate.toISOString());

                            // alert user on booking expired
                            await createUserMessage(user_id, "bi bi-clock", "Booking now valid", `Your booking for ${room.name} is now valid and will expire in ${moment(check_out).format("MMM DD YYYY")}`, currentDate.toISOString());

                            // update room guard data valid booking sent message
                            await RoomGuardData.updateOne({algoId: process.env.ALGO_ID}, {$push: {validBookingSentMessages: {bookingId: adminBooking._id}}});
                        };

                        // increase i by 1 and move on to the next
                        i++;

                    }else{

                        // console.log(false);

                        // increase i by 1 and move on to the next
                        i++;

                    };

                }else{

                    // increase i by 1 and move on to the next
                    i++;

                };

            }else{
                i++;
            };

        }else if(!isValidGuestsIncluded && room.pendingState != true){

            // would be modified into an array of users later

            // if room booked status is not equal to false and there is no valid guest, set it as false
            await Room.updateOne({_id: new ObjectId(room._id)}, {$set: {booked: false}});
            i++;
        }else if(!isValidGuestsIncluded && room.pendingState == true){
            // if room booked status is not equal to false and there is no valid guest, set it as false
            await Room.updateOne({_id: new ObjectId(room._id)}, {$set: {booked: false, pendingState: false}});

            i++;
        };
    };
};

// invoke room guard in an interval of 5 seconds, pls don't temper with this algorithm unless you know what you're doing thank you
setInterval(()=>{
    try{
        RoomGuard();
    }catch(err){
        console.log("Room guard error", err);
    }
}, 1000);
// end of room guards



// home api
app.get("/home", async(req, res)=>{

    try{

        // define rooms
        const rooms = [];

        // define web reviews
        const webReviews = [];

        // define new web reviews
        const newWebReviews = [];

        // find rooms
        await Room.find({}, ((err, data)=>{
            if(!err){
                data.forEach((doc)=>{rooms.push(doc)});
            };
        }));

        // find web reviews
        await WebReview.find({hidden: false}, ((err, data)=>{
            if(!err){
                data.forEach((doc)=>{webReviews.push(doc)});
            };
        }));

        // define i
        var i = 0;

        // start loop for i and web reviews
        while(i < webReviews.length){

            // extract props
            const { userId, rating, comment, date } = webReviews[i];

            // find user
            const user = await User.findOne({_id: new ObjectId(userId)});

            if(user){

                // extract name and image
                const { name, image } = user;

                // define new data
                const newData = { userId, name, image, rating, comment, date };

                // push new data
                newWebReviews.push(newData);

                // move to next
                i++;

            }else{

                // move to next
                i++;

            };

        };
        
        if(i == webReviews.length){
            // send response
            res.status(200).json({message: "all okay", webReviews: newWebReviews.slice(0, 5), rooms: rooms.slice(0, 3)});
        };

    }catch(err){

        console.log(err);

        // send response
        res.status(400).json({error: "error"});
    };
})


// general frontend api

// sort array amont
function sortArrayAmount(direction, property, array){
    
    // ascending to descending
    if(direction === "a-d"){

        const newArray = array.sort((a, b)=> b[property].amount - a[property].amount);
        return(newArray);

        // descending to ascending
    }else if(direction === "d-a"){
        const newArray = array.sort((a, b)=> a[property].amount - b[property].amount);
        return(newArray);
    };
};

// calc average rating
const calcAverageRating = (ratings)=>{

    const percentage = { oneStar: null, twoStar: null, threeStar: null, fourStar: null, fiveStar: null };

    const oneStar = ratings.filter((rating)=>{return(rating.rating == "1.0")}).length;

    const twoStar = ratings.filter((rating)=>{return(rating.rating == "2.0")}).length;

    const threeStar = ratings.filter((rating)=>{return(rating.rating == "3.0")}).length;

    const fourStar = ratings.filter((rating)=>{return(rating.rating == "4.0")}).length;

    const fiveStar = ratings.filter((rating)=>{return(rating.rating == "5.0")}).length;

    const total = oneStar + twoStar + threeStar + fourStar + fiveStar;

    const averageRating = ((1 * oneStar) + (2 * twoStar) + (3 * threeStar) + (4 * fourStar) + (5 * fiveStar))/total;

    percentage.oneStar = ((100/total) * oneStar).toFixed(1);
    percentage.twoStar = ((100/total) * twoStar).toFixed(1);
    percentage.threeStar = ((100/total) * threeStar).toFixed(1);
    percentage.fourStar = ((100/total) * fourStar).toFixed(1);
    percentage.fiveStar = ((100/total) * fiveStar).toFixed(1);

    return({averageRating, percentage});

}

// get room list
app.get("/import_room_list", async(req, res)=>{

    try{
        // queries
        const { keyword, sliceNum, startpoint, endpoint, filter, location } = req.query;

        // array to upate later
        const preData = [];

        // filtered array
        const filterArray = [];

        // new rooms
        const newRoomsArray = [];

        // key words array
        const keywordsArray = [];

        // find rooms
        await Room.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    // update preData array
                    preData.push(doc);

                    // update keywords array
                    keywordsArray.push(doc.name);

                    // console.log(doc._id)
                });
            };
        });

        
        // search instance
        if(location.toLowerCase() != "default" && location.toLowerCase() != "null"){

            // location search instance
            if(keyword !== "" && filter === "null"){
           
                // key word no filter
                preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))})
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword === "" && filter === "null"){

                // no keyword no filter
                preData
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword !== "" && filter === "price up"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                const sortedArray = sortArrayAmount("a-d", "price", newArray);
                sortedArray
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword !== "" && filter === "price down"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                const sortedArray = sortArrayAmount("d-a", "price", newArray);
                sortedArray
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword !== "" && filter === "open"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                newArray
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .filter((doc)=>{filterArray.push(doc.booked === false)});

            }else if(keyword === "" && filter === "price up"){

                const sortedArray = sortArrayAmount("a-d", "price", preData);
                sortedArray
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword === "" && filter === "price down"){

                const sortedArray = sortArrayAmount("d-a", "price", preData);
                sortedArray
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});
                
            }else if(keyword === "" && filter === "open"){
                preData.filter((doc)=>{return(doc.booked === false)})
                .filter((doc)=>{return(doc.location.name.toLowerCase().includes(location.toLowerCase()))})
                .forEach((doc)=>{filterArray.push(doc)});
            };

        }else{

            // no location search instance
            if(keyword !== "" && filter === "null"){
           
                // key word no filter
                preData.filter((doc)=>{
                    return(doc.name.toLowerCase().includes(keyword.toLowerCase()));
                }).forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword === "" && filter === "null"){

                // no keyword no filter
                preData.forEach((doc)=>{
                    filterArray.push(doc);
                });

            }else if(keyword !== "" && filter === "price up"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                const sortedArray = sortArrayAmount("a-d", "price", newArray);
                sortedArray.forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword !== "" && filter === "price down"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                const sortedArray = sortArrayAmount("d-a", "price", newArray);
                sortedArray.forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword !== "" && filter === "open"){

                const newArray = preData.filter((doc)=>{return(doc.name.toLowerCase().includes(keyword.toLowerCase()))});
                newArray.filter((doc)=>{filterArray.push(doc.booked === false)});

            }else if(keyword === "" && filter === "price up"){

                const sortedArray = sortArrayAmount("a-d", "price", preData);
                sortedArray.forEach((doc)=>{filterArray.push(doc)});

            }else if(keyword === "" && filter === "price down"){

                const sortedArray = sortArrayAmount("d-a", "price", preData);
                sortedArray.forEach((doc)=>{filterArray.push(doc)});
                
            }else if(keyword === "" && filter === "open"){
                preData.filter((doc)=>{return(doc.booked === false)}).forEach((doc)=>{filterArray.push(doc)});
            };

        };

        // total page
        const totalPage = Math.ceil(filterArray.length/sliceNum);

        var i = 0;

        while(i < filterArray.length){
            const { _id, name, images, description, price, special_services, services, video, booked, booking_count, ratings, notifications, location, date } = filterArray[i];

            // calc average ratings
            const averageRating = calcAverageRating(ratings);

            if(averageRating.averageRating){
                // push new data
                const data = { _id, name, images, description, averageRating, price, services, special_services, video, booked, booking_count, ratings, location, date };
                newRoomsArray.push(data);
            }else{
                // push new data
                const data = { _id, name, images, description, averageRating: {averageRating: 0}, price, services, special_services, video, booked, booking_count, ratings, location, date };
                newRoomsArray.push(data);
            };

            // move on to next item
            i++;
        };

        // search results
        const totalSearchResult = filterArray.length;
        
        if(i == filterArray.length){
            res.status(200).json({ message: "import successful", array: newRoomsArray.slice(startpoint, endpoint), totalSearchResult, totalPage, keywordsArray });
        };

    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// 698cf03a460b0a15ec624fac

// import single room
app.post("/import_single_room/:id", async(req, res)=>{

    // extract data
    const { id } = req.params;
    const { userId } = req.body;

    try{
        // find room single
        const data = await Room.findOne({_id: new ObjectId(id)});

        // create rating array
        var ratingsArray = [];

        // destructure room properties
        const { _id, name, images, description, price, services, special_services, video, booked, booking_count, booking_requests, ratings, location, notifications, date } = data;
        
        // assemble room rating with user details
        var i = 0;
        
        // process ratings
        while(i < ratings.length){
            const { user_id, rating, date, comment } = ratings[i];
            const user = await User.findOne({_id: new ObjectId(user_id)});
            if(user){
                // extract props
                const { name, image } = user;
                const newRating = { user_id, name, image, rating, date, comment};
                ratingsArray.push(newRating);
                i++;
            }else{
                i++;
            };
        };

        // create filtered bookings
        const filteredBookings = booking_count.filter((doc)=>{return(doc.expired == false)});

        // create bookings array
        const bookingsArray = [];

        var b = 0;
        
        // process bookings
        while(b < filteredBookings.length){
            // extract data from each bookings
            const { user_id, check_in, check_out } = filteredBookings[b];

            // mumber of days
            const days = moment(check_out).diff(moment(check_in), "days")

            // find user's image
            const user = await User.findOne({_id: new ObjectId(user_id)});

            // if image is found
            if(user){

                // extract props
                const { name, image } = user;

                // define new data
                const newData = { user_id, name, check_in, check_out, image, days };

                // push new data
                bookingsArray.push(newData);

                // move on to next
                b++;
            }else{
                b++;
            };
        };


        // make sure all rating is processed
        if(ratingsArray.length == ratings.length && bookingsArray.length == filteredBookings.length){
            
            // calc average rating
            const {averageRating, percentage} = calcAverageRating(ratings);
            
            if(averageRating && percentage){
                // define payload
                const newData = { _id, name, images, description, price, services, special_services, video, booked, booking_count, booking_requests, validBookings: bookingsArray, ratings: ratingsArray.slice(0, 5), ratingsFiltered: ratingsArray.filter((rating)=>{return(rating.user_id != userId)}).slice(0, 5),  averageRating: `${averageRating.toFixed(1)}`, percentage, location, myReview: null, notifications, date};

                // extract user data and add to ratings array
                if(userId !== null){

                    // filter userReview
                    const userReview = ratings.filter((rating)=>{return(rating.user_id == userId)})[0];

                    if(userReview){
                        // find user review details
                        const userReviewDetails = await User.findOne({_id: new ObjectId(userReview.user_id)});
                        
                        if(userReviewDetails){
                            // new user review
                            const myReview = { user_id: userReview.user_id, name: userReviewDetails.name, image: userReviewDetails.image, rating: userReview.rating, comment: userReview.comment, date: userReview.date };

                            // update payload my review prop
                            newData.myReview = myReview;
                        };
                    };
                };

                res.status(200).json({message: "All okay", data: newData});
            }else{
                // define payload
                const newData = { _id, name, images, description, price, services, special_services, video, booked, booking_count, booking_requests, validBookings: bookingsArray, ratings: ratingsArray.slice(0, 5), ratingsFiltered: ratingsArray.filter((rating)=>{return(rating.user_id != userId)}).slice(0, 5),  averageRating: `0.0`, percentage: { oneStar: null, twoStar: null, threeStar: null, fourStar: null, fiveStar: null }, location, myReview: null, notifications, date};

                // extract user data and add to ratings array
                if(userId !== null){

                    // filter userReview
                    const userReview = ratings.filter((rating)=>{return(rating.user_id == userId)})[0];

                    if(userReview){

                        // find user review details
                        const userReviewDetails = await User.findOne({_id: new ObjectId(userReview.user_id)});

                        if(userReviewDetails){
                            
                            // new user review
                            const myReview = { user_id: userReview.user_id, name: userReviewDetails.name, image: userReviewDetails.image, rating: userReview.rating, comment: userReview.comment, date: userReview.date };

                            // update payload my review prop
                            newData.myReview = myReview;
                        };
                    };
                };

                res.status(200).json({message: "All okay", data: newData});
            };

        }else{
            console.log("error")
        };
    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not fetch room"});
    };
});

// send room image
app.get("/send_room_image/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "room_images", id);
        res.status(200).sendFile(image);
    }catch(err){
        res.status(400).json({error: err.message});
    };
});

// send room video
app.get("/send_room_video/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "room_videos", id);
        res.status(200).sendFile(image);
    }catch(err){
        res.status(400).json({error: err.message});
    };
});

// import room ratings
app.post("/import_single_room_reviews/:id", async(req, res)=>{
    // id
    const { id } = req.params;
    const { userId } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        if(userId != null){
            // find room single
            const data = await Room.findOne({_id: new ObjectId(id)});

            // ratings array
            var ratingsArray = [];

            // destructure data 
            const { _id, name, images, ratings, booking_count } = data;

            // calc average rating
            const {averageRating, percentage} = calcAverageRating(ratings);

            // average rating check
            if(averageRating){
                // extract user data and add to ratings array
                const userReview = ratings.filter((rating)=>{return(rating.user_id == userId)})[0];
                
                if(userReview){

                    // find user review details
                    const userReviewDetails = await User.findOne({_id: new ObjectId(userReview.user_id)});

                    // define my review
                    var myReview = null;

                    if(userReviewDetails){
                        // new user review
                        myReview  = { user_id: userReview.user_id, name: userReviewDetails.name, image: userReviewDetails.image, rating: userReview.rating, comment: userReview.comment, date: userReview.date };
                    };
                    
                    // process the rating
                    var i = 0;
                    while(i < ratings.length){

                        const { user_id, rating, date, comment } = ratings[i];
                        const user = await User.findOne({_id: new ObjectId(user_id)});

                        if(user){

                            // extract props
                            const {name, image} = user;

                            const newRating = { user_id, name, image, rating, date, comment};

                            if(filter == "null"){
                                ratingsArray.push(newRating);
                            }else if(filter == "5"){
                                if(newRating.rating == "5.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "4"){
                                if(newRating.rating == "4.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "3"){
                                if(newRating.rating == "3.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "2"){
                                if(newRating.rating == "2.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "1"){
                                if(newRating.rating == "1.0"){
                                    ratingsArray.push(newRating);
                                };
                            };

                            i++;
                        }else{
                            i++;
                        };           

                    };

                    // total page
                    const totalPage = Math.ceil(ratingsArray.length/sliceNum);

                    // search results
                    const totalSearchResult = ratingsArray.length;

                    // payload
                    const newData = { _id, name, images, ratings: ratings.slice(startpoint, endpoint), ratingsFiltered: ratingsArray.filter((rating)=>{return(rating.user_id !== userId)}).slice(startpoint, endpoint), totalPage, totalSearchResult, myReview, booking_count, averageRating: `${averageRating.toFixed(1)}`, percentage };

                    res.status(200).json({message: "All okay", data: newData});
                }else{
                    // process the rating
                    var i = 0;
                    while(i < ratings.length){

                        const { user_id, rating, date, comment } = ratings[i];
                        const { name, image } = await User.findOne({_id: new ObjectId(user_id)});

                        if(name && image){
                            const newRating = { user_id, name, image, rating, date, comment};

                            if(filter == "null"){
                                ratingsArray.push(newRating);
                            }else if(filter == "5"){
                                if(newRating.rating == "5.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "4"){
                                if(newRating.rating == "4.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "3"){
                                if(newRating.rating == "3.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "2"){
                                if(newRating.rating == "2.0"){
                                    ratingsArray.push(newRating);
                                };
                            }else if(filter == "1"){
                                if(newRating.rating == "1.0"){
                                    ratingsArray.push(newRating);
                                };
                            };

                            i++;
                        };           

                    };

                    // total page
                    const totalPage = Math.ceil(ratingsArray.length/sliceNum);

                    // search results
                    const totalSearchResult = ratingsArray.length;

                    // payload
                    const newData = { _id, name, images, ratings: ratings.slice(startpoint, endpoint), ratingsFiltered: ratingsArray.filter((rating)=>{return(rating.user_id !== userId)}).slice(startpoint, endpoint), totalPage, totalSearchResult, myReview: null, booking_count, averageRating: `${averageRating.toFixed(1)}`, percentage };

                    res.status(200).json({message: "All okay", data: newData});
                };
            }else throw Error("No reviews");
            
        }else{
            // find room single
            const data = await Room.findOne({_id: new ObjectId(id)});

            // ratings array
            var ratingsArray = [];

            // destructure data 
            const { _id, name, images, ratings, booking_count } = data;
            
            // calc average rating
            const {averageRating, percentage} = calcAverageRating(ratings);
            
            // average rating check
            if(averageRating){
                // process the rating
                var i = 0;
                while(i < ratings.length){

                    const { user_id, rating, date, comment } = ratings[i];
                    const user = await User.findOne({_id: new ObjectId(user_id)});

                    if(user){

                        // extract props
                        const {name, image} = user;

                        const newRating = { user_id, name, image, rating, date, comment};

                        if(filter == "null"){
                            ratingsArray.push(newRating);
                        }else if(filter == "5"){
                            if(newRating.rating == "5.0"){
                                ratingsArray.push(newRating);
                            };
                        }else if(filter == "4"){
                            if(newRating.rating == "4.0"){
                                ratingsArray.push(newRating);
                            };
                        }else if(filter == "3"){
                            if(newRating.rating == "3.0"){
                                ratingsArray.push(newRating);
                            };
                        }else if(filter == "2"){
                            if(newRating.rating == "2.0"){
                                ratingsArray.push(newRating);
                            };
                        }else if(filter == "1"){
                            if(newRating.rating == "1.0"){
                                ratingsArray.push(newRating);
                            };
                        };

                        i++;
                    };           

                };

                // total page
                const totalPage = Math.ceil(ratingsArray.length/sliceNum);

                // search results
                const totalSearchResult = ratingsArray.length;

                // payload
                const newData = { _id, name, images, ratings: ratings.slice(startpoint, endpoint), ratingsFiltered: ratingsArray.filter((rating)=>{return(rating.user_id !== userId)}).slice(startpoint, endpoint), totalPage, totalSearchResult, myReview: null, booking_count, averageRating: `${averageRating.toFixed(1)}`, percentage };

                res.status(200).json({message: "All okay", data: newData});
            }else throw Error("No reviews");
        };

    }catch(err){ 
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// add room review
app.post("/add_room_review/:id", async(req, res)=>{

    // extract info's
    const { id } = req.params;
    const data = req.body;

    try{
        // update room ratings
        await Room.updateOne({_id: new ObjectId(id)}, {$push: {ratings: data}});

        // send response
        res.status(200).json({message: "Added review successfully"});
    }catch(err){
        res.status(400).json({error: "Could not add review"});
    };
});

// modify room review
app.post("/modify_room_review/:id", async(req, res)=>{

    // extract info's
    const { id } = req.params;
    const data = req.body;

    try{
        // extract user id
        const { user_id } = data;

        // remove old data
        await Room.updateOne({_id: new ObjectId(id)}, {$pull: {ratings: {user_id: user_id}}});

        // add new data
        await Room.updateOne({_id: new ObjectId(id)}, {$push: {ratings: data}});

        // send response
        res.status(200).json({message: "Updated review successfully"});
    }catch(err){
        res.status(400).json({error: "Could not update review"});
    };
});

// delete room review
app.delete("/delete_room_review/:id", async(req, res)=>{

    // extract info's
    const { id } = req.params;
    const data = req.body;

    try{
        // extract user id
        const { user_id } = data;

        // delete room review
        await Room.updateOne({_id: new ObjectId(id)}, {$pull: {ratings: {user_id: user_id}}});

        // send response
        res.status(200).json({message: "Deleted review successfully"});
    }catch(err){
        res.status(400).json({error: "Could not delete review"});
    };
});

// create cart item
const createCartItems = async(cart)=>{

    const newCartArray = [];

    for(i = 0; i < cart.length; i++){

        const cartItem = cart[i];

        const { roomId, checkIn, checkOut, persons, specialServices } = cartItem;

        const { name, images, price } = await Room.findOne({_id: new ObjectId(roomId)});

        const image = images[0];

        const newCartItem = {name, image, roomId, checkIn, checkOut, persons, specialServices, price };

        newCartArray.push(newCartItem);
    };

    return(newCartArray);
};

// add to cart
app.post("/add_to_cart/:id", async(req, res)=>{

    // this is the room id
    const { id } = req.params;

    // extract prop
    const { userId, persons, specialServices } = req.body;

    // define current time
    const currentTime = moment();

    // define date
    const date = moment(req.body.checkIn); 

    // define updated date
    const updatedDate = date.hour(currentTime.hour()).minute(currentTime.minute()).second(currentTime.second());

    // define new date
    const newDate = moment(updatedDate);

    // define difference in days
    const differenceInDays = moment(req.body.checkOut).startOf("day").diff(newDate.clone().startOf("day"), "days");

    // define check out date
    const newCheckOutDate = newDate.clone().add(differenceInDays, "days");

    // define check in
    const checkIn = newDate.toISOString();

    // define check out
    const checkOut = newCheckOutDate.toISOString();

    try{
        // import user's cart
        const { cart } = await User.findOne({_id: new ObjectId(userId)});

        // check if room is in user's cart
        const isIncluded = cart.filter((doc)=>{return(doc.roomId == id)})[0];

        if(!isIncluded){
            // create new cart item
            const newCartItem = { roomId: id, checkIn, checkOut, persons, specialServices };

            // add cart item to user's cart
            await User.updateOne({_id: new ObjectId(userId)}, {$push: {cart: newCartItem}});
        }else{

            // map through each cart item and modify targeted cart item
            const newCartArray = cart.map((item)=>{
                if(item.roomId == id){
                    const { _id } = item;
                    const newCartItem = { _id, roomId: id, checkIn, checkOut, persons, specialServices};
                    return(newCartItem);
                }else{
                    return item;
                };
            });

            // reset user's cart with new modified array
            await User.updateOne({_id: new ObjectId(userId)}, {$set: {cart: newCartArray}});

        };

        // updated cart
        const updatedCart =  await User.findOne({_id: new ObjectId(userId)});

        // send response
        res.status(200).json({message: "Added to cart succesfully", cart: updatedCart.cart});

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not add to cart"});
    };
});

// remove from cart
app.post("/remove_from_cart/:id", async(req, res)=>{
    const { id } = req.params;
    const { userId } = req.body;
    try{
        await User.updateOne({_id: new ObjectId(userId)}, {$pull: {cart: {roomId: id}}});

        const { cart } = await User.findOne({_id: new ObjectId(userId)});

        const newCartArray = await createCartItems(cart);

        res.status(200).json({message: "Room removed from cart successful", cart: newCartArray });
    }catch(err){
        res.status(400).json({error: "Could not remove room from cart"});
    };
});

// add to wishlist
app.post("/add_to_wishlist/:id", async(req, res)=>{

    const { id } = req.params;

    const { userId } = req.body;

    try{
        // add room to user's wishlist
        await User.updateOne({_id: new ObjectId(userId)}, {$push: {wishList: {roomId: id}}});

        // extract new updated wishlist
        const { wishList } = await User.findOne({_id: new ObjectId(userId)});

        res.status(200).json({message: "Added to wishlist successfully", wishList});
    }catch{
        res.status(400).json({error: "Could not add to wishlist"});
    };
});

// add to wishlist
app.post("/remove_from_wishlist/:id", async(req, res)=>{

    const { id } = req.params;

    const { userId } = req.body;

    try{
        // remove room to user's wishlist
        await User.updateOne({_id: new ObjectId(userId)}, {$pull: {wishList: {roomId: id}}});

        // extract new updated wishlist
        const { wishList } = await User.findOne({_id: new ObjectId(userId)});

        res.status(200).json({message: "Removed from wishlist", wishList});
    }catch{
        res.status(400).json({error: "Could not remove from wishlist"});
    };
});

// get notified rooms
app.post("/get_notified/:id", async(req, res)=>{

    // extract user id
    const { id } = req.params;

    // extract room id
    const { roomId } = req.body;

    try{

        // find room notifications
        const { booking_count, notifications } = await Room.findOne({_id: new ObjectId(roomId)});

        // define is included
        const isIncluded = notifications.filter((doc)=>{return(doc.user_id == id)})[0];

        // define valid booking
        const validBooking = booking_count.filter((doc)=>{return(doc.expired == false)})[0];

        // check for is included
        if(!isIncluded){

            // check for no valid bookings
            if(!validBooking){

                // send response
                res.status(400).json({error: "Room is opened for booking"});

            }else{

                // update room by adding user id to notification array
                await Room.updateOne({_id: new ObjectId(roomId)}, {$push: {notifications: {user_id: id}}});

                // send response
                res.status(200).json({message: "Notification added successfully"});

            };

        }else{

            // update room by removing user id from notification array
            await Room.updateOne({_id: new ObjectId(roomId)}, {$pull: {notifications: {user_id: id}}});

            // send response
            res.status(200).json({message: "Notification removed successfully"});
        };

    }catch(err){

        console.log(err);

        // send response
        res.status(400).json({error: "could not add notification"});
    };
});

// update array child item property
const updateArrayItemStatus = (id, property, value, array)=>{
    const newArray = array.map((doc)=>{
        if(doc._id == id){
            const newItem = doc;
            newItem[property] = value;
            return(newItem);
        }else{
            return(doc);
        };
    });

    return(newArray);
};

// check for valid check-in and check-out date before booking
const isValidBookingDates = async(cart)=>{

    // define new cart array
    const newCart = [];

    // define is valid dates
    var isValidDates = null; 

    // define i
    var i = 0;

    // define is valid error points
    var isValidErrorPoints = 0;

    // define loop completed
    var loopCompleted = false;

    // auth check cart items
    while(i < cart.length){

        // define current cart item
        const item = cart[i];

        // define current date
        const currentDate = moment();

        // define check in date
        const checkIn = moment(item.checkIn);

        // define check out date
        const checkOut = moment(item.checkOut);

        // define room id
        const roomId = item.roomId;
        
        // extract room booked and booking count
        const { booked, booking_count } = await Room.findOne({_id: new ObjectId(roomId)});

        // room booked instance
        if(booked === true){
            
            // make sure booking count is != 0
            if(booking_count.length != 0){

                // filter bookings by expired and arrange them in order of difference between current date and check_in date
                const filteredBookings = booking_count.filter((guest)=>{return(guest.expired === false)})
                .map((guest)=>{
                    const { _id } = guest;
                    const checkIn = moment(guest.check_in);
                    const differenceInDate = currentDate.clone().diff(checkIn);
                    const difference = moment(differenceInDate).milliseconds();
                    return({_id, difference});
                })
                .sort((a, b) => a.difference - b.difference);
                
                // define v
                var v = 0;

                // define error points
                var errorPoints = 0;
                
                // auth check for check-in and check-out dates
                while(v < filteredBookings.length){
                
                    // current guest
                    const currentGuest = booking_count.filter((doc)=>{return(doc._id == filteredBookings[v]._id)})[0];

                    // define days array to contain the days between current guest check-in and check-out date
                    const daysInCurrentGuestBookings = [];

                    // define days array to contain the days between cart item booking check-in and check-out date
                    // const daysInCartItemBookings = [];
                    
                    // define new check in date
                    const newCheckInDate = moment(currentGuest.check_in);

                    // define new check out date
                    const newCheckOutDate = moment(currentGuest.check_out);

                    // define new cart item check in date
                    // const newCartItemCheckInDate = moment(item.checkIn);

                    // define new cart item check out date
                    // const newCartItemCheckOutDate = moment(item.checkOut).subtract(1, "days");
                    
                    // add days between current guest check-in and check-out date to days in current guest booking array
                    while(newCheckInDate.isBefore(newCheckOutDate)){
                        daysInCurrentGuestBookings.push(newCheckInDate.format("MMM DD"));
                        newCheckInDate.add(1, "day");
                    };

                    // add days between cart item check-in and check-out date to days in cart item booking array
                    // while(newCartItemCheckInDate.isBefore(newCartItemCheckOutDate)){
                    //     daysInCurrentGuestBookings.push(newCartItemCheckInDate.format("MMM DD"));
                    //     newCartItemCheckInDate.add(1, "day");
                    // };

                    // const cartItemDaysValid = daysInCartItemBookings.forEach((cartItemDay)=>{
                    //     console.log(cartItemDay);
                    //     // if(daysInCurrentGuestBookings.includes(cartItemDay)){
                    //     //     console.log("included");
                    //     // };
                    // });

                    // if both cart item check-in and check-out date is not included in current guest booking array
                    if(!daysInCurrentGuestBookings.includes(checkIn.format("MMM DD")) && !daysInCurrentGuestBookings.includes(checkOut.format("MMM DD"))){

                        // make sure date is valid
                        if(checkIn.format("MMM DD YYYY") == currentDate.format("MMM DD YYYY") || checkIn.isAfter(currentDate)){

                            // move on to next guest in room
                            v++;

                        }else{
                            // move on to next guest in room
                            v++;

                            // increase error points by one
                            errorPoints++;
                        };

                    }else{

                        // if days are included, increase error points by one
                        errorPoints++;

                        // move on to next guest in room
                        v++;

                    };

                };


                // if the loops for our comparison for our check_in and check_out dates has been completed and there is no error
                if(v == filteredBookings.length && errorPoints == 0){

                    // extract cart item properties
                    const { _id, roomId, persons, checkIn, checkOut, specialServices } = cart[i];

                    // define new cart item
                    const newCartItem = { _id, roomId, persons, checkIn, checkOut, specialServices, isValid: true };

                    // push new cart item to new cart
                    newCart.push(newCartItem);

                    // move on to next item in cart
                    i++;

                }else if(v == filteredBookings.length && errorPoints > 0){
                    
                    // extract cart item properties
                    const { _id, roomId, persons, checkIn, checkOut, specialServices } = cart[i];

                    // define new cart item
                    const newCartItem = { _id, roomId, persons, checkIn, checkOut, specialServices, isValid: false };

                    // push new cart item to new cart
                    newCart.push(newCartItem);

                    // if error was found, increase is valid error points by one
                    isValidErrorPoints++;

                    // move on to next item in cart
                    i++;

                };

            };

        }else if(booked === false){
            // if the room isn't booked at all, move on to next item in cart
            // in this case, there would be no current guest

            // extract cart item properties
            const { _id, roomId, persons, checkIn, checkOut, specialServices } = cart[i];
            
            // get check in date
            const checkInDate = moment(checkIn);
            
            // make sure check in date is valid
            if(checkInDate.format("MMM DD YYYY") == currentDate.format("MMM DD YYYY") || checkInDate.isAfter(currentDate)){

                // define new cart item
                const newCartItem = { _id, roomId, persons, checkIn, checkOut, specialServices, isValid: true };

                // push new cart item to new cart
                newCart.push(newCartItem);

                // move on to next cart item
                i++;

            }else{

                // define new cart item
                const newCartItem = { _id, roomId, persons, checkIn, checkOut, specialServices, isValid: false };

                // push new cart item to new cart
                newCart.push(newCartItem);

                // increase is valid error points by 1
                isValidErrorPoints++;

                // move on to next cart item
                i++;

            };

        };
    };

    // if loop for cart is complete and error points = 0
    if(i == cart.length && isValidErrorPoints == 0){

        // set is valid date = true
        isValidDates = true;

        // set loop completed true
        loopCompleted = true;

    }else if(i == cart.length && isValidErrorPoints > 0){

        // if loop for cart is complete and error points > 0, set us valid date as error message
        isValidDates = "Error, pls modify your cart items to continue";

        // set loop completed true
        loopCompleted = true;

    };

    // return is valid dates
    return { isValid: isValidDates, newCart, loopCompleted };
};

// create pre_transaction data
const createPreTransactionData = async(name, email, address, phone_number, state, country, rooms)=>{
    try{
        // current date
        const currentDate = moment().toISOString();

        // delete any existing pre transaction
        await PreTransaction.deleteOne({email: email});

        // create new pre transaction data
        await PreTransaction.create({name, email, address, phone_number, state, country, reference: "no reference", rooms, seen: false, date: currentDate });

    }catch(err){
        console.log(err);
        throw Error("Failed to create pre_transaction data");
    };
};

// create pre_transaction pending data
const createPreTransactionPendingData = async(name, email, reference, address, phone_number, state, country, rooms)=>{
    try{
        // define current date
        const currentDate = moment().toISOString();

        // create new pre transaction data
        await PreTransactionPending.create({name, email, reference, address, phone_number, state, country, rooms, seen: false, date: currentDate });

        // delete any existing pre transaction
        await PreTransaction.deleteOne({reference: reference});

    }catch(err){
        console.log(err);
        throw Error("Failed to create pre transaction pending data");
    };
};

// create pre_transaction pending data
const createPreTransactionFailedData = async(name, email, reference, address, phone_number, state, country, rooms)=>{
    try{
        // define current date
        const currentDate = moment().toISOString();

        // create new pre transaction failed data
        await PreTransactionFailed.create({name, email, reference, newReference: "null", address, phone_number, state, country, rooms, seen: false, date: currentDate });

        // delete any existing pretransaction  failed
        await PreTransactionPending.deleteOne({reference: reference});

    }catch(err){
        throw Error("Failed to create pre transaction failed data");
    };
};

// initialize transaction function
const initializeTransaction = async(request)=>{

    const { name, email, address, phone_number, state, country } = request.body;

    // find user
    const user = await User.findOne({email: email});

    if(user){

        // extract from cart from user
        const { cart } = user;

        // check if cart item is valid
        const { isValid } = await isValidBookingDates(cart);

        if(typeof(isValid) != "string"){

            // define pretransaction rooms
            const preTransactionRooms = [];

            // sum cart price
            var priceSum = 0;

            var i = 0;

            while(i < cart.length){
                const { roomId, checkIn, checkOut, persons, specialServices } = cart[i];
                const { price } = await Room.findOne({_id: new ObjectId(roomId)});
                
                if(price){

                    const checkInDate = moment(checkIn);
                    const checkOutDate = moment(checkOut);
                    const days = checkOutDate.diff(checkInDate, "days");
                    const sumedPrice = (price.amount * days) * persons;
                    var newPrice = 0;

                    if(specialServices == false){
                        priceSum += sumedPrice;
                        newPrice = sumedPrice;
                    }else if(specialServices == true){
                        const percentage = (sumedPrice/100) * 5;
                        const newSumedPrice = percentage + sumedPrice;
                        priceSum += newSumedPrice;
                        newPrice = newSumedPrice;
                    };

                    const newPreTransactionRoom = { roomId, checkIn, checkOut, persons, specialServices, price: newPrice };

                    preTransactionRooms.push(newPreTransactionRoom);

                    i++;
                }else{
                    // move on to next
                    i++;
                };
                
            };  

            // console.log(priceSum)
            
            // initialize transaction if only we're done summing up price
            if(i == cart.length){
                try{
                    // create pre_transaction data;
                    await createPreTransactionData(name, email, address, phone_number, state, country, preTransactionRooms);

                    return({email, price: priceSum,  action: true});
                }catch(err){
                    return({action: false});
                };
            };

            

        }else{
            throw Error(isValid);
        };  

    }else{
        throw Error("wrong email");
    };

};

// create booking user
const createBookingUser = async(userId, roomId, checkIn, checkOut, persons, specialServices, date)=>{

    // define new booking
    const newBooking = { roomId, checkIn, checkOut, persons, specialServices, expired: false, status: "Awaiting", seen: false, date };

    // update user
    await User.updateOne({_id: new ObjectId(userId)}, {$push: {bookings: newBooking}});

    // extract bookings
    const { bookings } = await User.findOne({_id: new ObjectId(userId)}); 

    // extract booking id
    const { _id } = bookings.filter((doc)=>{return(doc.roomId == roomId && doc.checkIn == checkIn && doc.checkOut == checkOut && doc.date == date)})[0];

    // return id
    return(_id);
};

// create transaction user
const createTransactionUser = async(userId, email, state, country, phoneNumber, amount, issuedBy, status, reference, rooms, date)=>{ 
    const newTransaction = { email, state, country, phoneNumber, amount, issuedBy, status, reference, rooms, seen: false, date };
    await User.updateOne({_id: new ObjectId(userId)}, {$push: {transactions: newTransaction}});
    const { transactions } = await User.findOne({_id: new ObjectId(userId)}); 
    const { _id } = transactions[transactions.length - 1];
    return(_id);
};

// add price to cart item for receipt
const generateReceiptArray = async(array)=>{
    const newArray = [];

    for(i = 0; i < array.length; i++){
        const item = array[i];
        const { roomId, specialServices, checkIn, checkOut, persons } = item;
        const { price } = await Room.findOne({_id: new ObjectId(roomId)});
        const { amount } = price;

        const newItem = { roomId, checkIn, checkOut, persons, specialServices, price: amount };
        newArray.push(newItem);
    };

    return(newArray);
};

// create receipt user
const createReceiptUser = async(userId, email, state, country, phoneNumber, amount, issuedBy, array, date)=>{ 
    const newArray = await generateReceiptArray(array);
    const newReceipt = { userId, email, state, country, phoneNumber, amount, issuedBy, rooms: newArray, seen: false, date };
    const newUpdate = await User.updateOne({_id: new ObjectId(userId)}, {$push: {receipts: newReceipt}});
    const { receipts } = await User.findOne({_id: new ObjectId(userId)}); 
    const { _id } = receipts[receipts.length - 1];
    return(_id);
};

// create new admin booking
const createBookingAdmin = async(userId, userBookingId, roomId, checkIn, checkOut, persons, specialServices, date)=>{
    try{
        const newBooking = { userId: userId, userBookingId: userBookingId, roomId: roomId, checkIn: checkIn, checkOut: checkOut, persons: persons, specialServices: specialServices, expired: false, seen: false, status: "Awaiting", date: date};
        await AdminBooking.create(newBooking);
    }catch(err){
        
        throw Error(err.message);
    };
};

// create new admin transaction
const createTransactionAdmin = async(userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, date)=>{
    const newTransactionAdmin = {userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen: false, date};
    await AdminTransaction.create(newTransactionAdmin);
};

// create new admin debtor
const createDebtorAdmin = async(userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, date)=>{
    const newDebtorAdmin = {userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen: false, date};
    await AdminDebtor.create(newDebtorAdmin);
};

// create new admin receipt
const createReceiptAdmin = async(userId, userReceiptId, email, issuedBy, state, country, phoneNumber, amount, rooms, date)=>{
    const newArray = await generateReceiptArray(rooms);
    const newReceiptAdmin = {userId, userReceiptId, email, issuedBy, state, country, phoneNumber, amount, rooms: newArray, seen: false, date};
    const { _id } =  await AdminReceipt.create(newReceiptAdmin);
    return(_id);
};

// create user message
const createUserMessage = async(userId, icon, title, message, date)=>{
    // create new message
    const newMessage = {icon, title, message, seen: false, date};

    // update user message array
    await User.updateOne({_id: new ObjectId(userId)}, {$push: {messages: newMessage}});
    return true;
};

// create message
const createMessage = async(title, icon, message, date)=>{
    await Message.create({title, icon, message, seen: false, date});
};


// initialize transaction
app.post("/init_transaction", async(Request, Response)=>{
    
    try{

        // initialize transaction
        const { email, price, action } = await initializeTransaction(Request);

        // check if the action is true
        if(action === true){
            const https = require('https')

            const params = JSON.stringify({
            "email": `${email}`,
            "amount": `${price}00`
            })

            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: '/transaction/initialize',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }

            const req = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', async() => {
                const Data = JSON.parse(data);
                
                if(Data){
                    const { reference, authorization_url } = Data.data;
                    
                    if(reference){
                        // update reference pre transaction
                        await PreTransaction.updateOne({email: email}, {$set: {reference: reference}});

                        // send response
                        Response.status(200).json({message: "Initialize transaction successful", authorization_url });
                    }else{
                        throw Error("Error: could not initialize transaction");
                    };
                };
            })
            }).on('error', error => {
                Response.status(400).json({error: "Error: could not initialize transaction"});
                console.log(error);
            })

            req.write(params)
            req.end();
        };

    }catch(err){

        // send error response
        Response.status(400).json({error: err.message});
        console.log(err);

    };
}); 

// repayment successful
const repaymentSuccessful = async(new_reference, original_reference, amount)=>{

    // define current date
    const currentDate = moment().toISOString();

    // find pre transaction using referenece
    const { email, phone_number, state, country, rooms } = await PreTransactionFailed.findOne({reference: original_reference});

    // define phone number
    const phoneNumber = phone_number;

    // find admin transaction
    const adminTransaction = await AdminTransaction.findOne({reference: original_reference});

    // find user
    const user = await User.findOne({email: email});

    // extract user's id
    const { _id } = user;

    // find user transactions
    const { transactions } = user;

    // create user receipt
    const newReceipt = await createReceiptUser(_id, email, state, country, phoneNumber, amount, "House 6", rooms, adminTransaction.date);

    // create admin receipt
    const newAdminReceipt =  await createReceiptAdmin(_id, newReceipt, email, "House 6", state, country, phoneNumber, amount, rooms, adminTransaction.date);

    // update admin transaction reference and new admin receipt id and status
    await AdminTransaction.updateOne({reference: original_reference}, {$set: {reference: new_reference, receiptId: newAdminReceipt, status: "success"}});

    // define new transactions
    const newTransactions = transactions.map((doc)=>{
        if(doc.reference == original_reference){
            // define new doc
            const newDoc = doc;

            // set update new doc reference
            newDoc.reference = new_reference;

            // update transaction status
            newDoc.status = "success";

            // return new doc
            return(newDoc);
        }else{

            // return doc
            return(doc);

        };
    });

    // update user transactions
    await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

    // update user transaction

    // notify admin of repaid payment successful email

    // notify user of repaid payment successful email

    // create admin message
    await createMessage("Repaid payment successful", "bi bi-credit-card-2-front", `User ${email} has repaid the amount of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

    // create user message
    await createUserMessage(_id, "bi bi-credit-card-2-front", "Repaid payment successful", `We have receive your repayment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

    // delete pretransaction 
    await PreTransactionFailed.deleteOne({reference: original_reference});

    // delete debtor if any
    await AdminDebtor.deleteOne({reference: original_reference});

    // create admin message
    await createMessage("Debt cleared", "bi bi-bank", `User ${email} debt of ${amount} naira has been cleared`, currentDate);

    // create user message
    await createUserMessage(_id, "bi bi-bank", "Debt cleared", `Your debt of ${amount} has been cleared`, currentDate);

    // delete flagged down
    await FlaggedDown.deleteOne({transactionId: adminTransaction._id});
};

// repayment pending
const repaymentPending = async(original_reference, amount)=>{

    // define current date
    const currentDate = moment().toISOString();

    // define admin transaction
    const adminTransaction = await AdminTransaction.findOne({reference: original_reference});

    // find pre transaction using referenece
    const { email, rooms } = await PreTransactionFailed.findOne({reference: original_reference});

    // find user
    const user = await User.findOne({email: adminTransaction.email});

    // extract user's id
    const { _id } = user;

    // find user transactions
    const { transactions } = user;

    // update admin transaction reference and new admin receipt id and status
    await AdminTransaction.updateOne({reference: original_reference}, {$set: {status: "pending"}});

    // define new transactions
    const newTransactions = transactions.map((doc)=>{
        if(doc.reference == original_reference){
            // define new doc
            const newDoc = doc;

            // update transaction status
            newDoc.status = "pending";

            // return new doc
            return(newDoc);
        }else{

            // return doc
            return(doc);

        };
    });

    // update user transactions
    await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

    // update flagged down
    await FlaggedDown.updateOne({transactionId: adminTransaction._id}, {$set: {verified: true}});

    // create admin message
    await createMessage("Pending repaid payment", "bi bi-credit-card-2-front", `User ${email} has made a repaid payment which is currently pending for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

    // create user message
    await createUserMessage(_id, "bi bi-credit-card-2-front", "Pending repaid payment", `Your repaid payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} is currently pending, you'll be notified when the transaction is fully processed`, currentDate);

};

// repayment successful
const repaymentFailed = async(original_reference, amount)=>{

    // define current date
    const currentDate = moment().toISOString();

    // define admin transaction
    const adminTransaction = await AdminTransaction.findOne({reference: original_reference});

    // find pre transaction using referenece
    const { email, rooms } = await PreTransactionFailed.findOne({reference: original_reference});

    // find user
    const user = await User.findOne({email: adminTransaction.email});

    // extract user's id
    const { _id, transactions } = user;

    // update admin transaction reference and new admin receipt id and status
    await AdminTransaction.updateOne({reference: original_reference}, {$set: {status: "failed"}});

    // define new transactions
    const newTransactions = transactions.map((doc)=>{
        if(doc.reference == original_reference){
            // define new doc
            const newDoc = doc;

            // update transaction status
            newDoc.status = "failed";

            // return new doc
            return(newDoc);
        }else{

            // return doc
            return(doc);

        };
    });

    // update user transactions
    await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

    // update flagged down
    await FlaggedDown.updateOne({transactionId: adminTransaction._id}, {$set: {verified: true}});

    // create admin message
    await createMessage("Repayment failed", "bi bi-credit-card-2-front", `User ${email} repayment for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

    // create user message
    await createUserMessage(_id, "bi bi-credit-card-2-front", "Repayment failed", `Your repayment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);
};
 
// verify transaction
app.post("/verify_transaction", async(Request, Response)=>{

    // define reference
    const { reference } = Request.body;

    // check for transaction included
    const isIncluded = await AdminTransaction.findOne({reference: reference});

    // define flagged
    const flagged = await PreTransactionFailed.findOne({newReference: reference});

    // check fo transactions
    if(flagged){

        // define flagged id
        const flaggedId = await AdminTransaction.findOne({reference: flagged.reference});

        // check if transaction was a flagged down transactiom
        const flaggedDown = await FlaggedDown.findOne({transactionId: flaggedId._id});

        // handle repayment
        if(flaggedDown && flaggedDown.verified == false){

            console.log("repayment route");

            const https = require('https')

            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: `/transaction/verify/${reference}`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }

            const req = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', async() => {

                const Data = JSON.parse(data);
                const email = Data.data.customer.email;
                const status = Data.data.status;
                // const status = "pending"; 
                const amount = Data.data.amount/100;
                const original_reference = Data.data.metadata.original_reference;
                // define new refrence
                const new_reference = reference;

                // console.log("ref", new_reference, original_reference, amount);

                try{


                    if(status == "success"){

                        // handle repayment successful
                        await repaymentSuccessful(new_reference, original_reference, amount);

                        // send response successful
                        Response.status(200).json({message: `Verified repaid transaction ${status}`, status});
                        
                    }else if(status == "pending" || status == "processing" || status == "queued"){

                        // handle repayment pending
                        await repaymentPending(original_reference, amount);

                        // send response pending
                        Response.status(200).json({message: `Verified repaid transaction pending`, status: "pending"});

                    }else if(status == "failed"){

                        // handle repayment failed
                        await repaymentFailed(original_reference, amount);

                        // send response failed
                        Response.status(200).json({message: `Verified repaid transaction ${status}`, status});
                    };

                }catch(err){
                    console.log(err)
                };
            })
            }).on('error', error => {
                console.error(error)
                Response.status(400).json({error: "Could not verify transaction"});
            })

            req.end();

        }else{
            console.log("already repayment route pending");

            // send response for already verified transaction
            const { status } = flaggedId;
            Response.status(200).json({message: `Verified transaction ${status}`, status});
        };

    }else if(!isIncluded){
    
        console.log("payment route");

        const https = require('https')

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        }

        const req = https.request(options, res => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        });

        res.on('end', async() => {
            const Data = JSON.parse(data);
            const email = Data.data.customer.email;
            const status = Data.data.status;
            // const status = "pending"; 
            const amount = Data.data.amount/100;

            try{

                // define current date
                const currentDate = moment().toISOString();
                
                // find pre transaction using referenece
                const { name, email, address, phone_number, state, country, rooms } = await preTransaction.findOne({reference: reference});

                // define phone number
                const phoneNumber = phone_number;

                // import user's id
                const { _id } = await User.findOne({email: email});

                if(status == "success"){

                    // create user booking and admin booking by pushing each room item to bookings
                    rooms.forEach(async(item)=>{

                        // extract booking props
                        const { roomId, checkIn, checkOut, persons, specialServices } = item;

                        // create user booking
                        const newId = await createBookingUser(_id, roomId, checkIn, checkOut, persons, specialServices, currentDate);

                        // create admin booking
                        await createBookingAdmin(_id, newId, roomId, checkIn, checkOut, persons, specialServices, currentDate);

                        // update room booking count
                        await Room.updateOne({_id: new ObjectId(roomId)}, {$push: {booking_count: {user_id: _id, check_in: checkIn, check_out: checkOut, persons, special_services: specialServices, expired: false, date: currentDate }}});
                        
                        // set room booked
                        await Room.updateOne({_id: new ObjectId(roomId)}, {$set: {booked: true}});

                        // delete user cart item
                        await User.updateOne({_id: new ObjectId(_id)}, {$pull: {cart: { roomId: roomId, checkIn: checkIn, checkOut: checkOut} }})
                    });

                    // create user transaction
                    const newTransaction = await createTransactionUser(_id, email, state, country, phoneNumber, amount, "House 6", status, reference, rooms.length, currentDate);

                    // create user receipt
                    const newReceipt = await createReceiptUser(_id, email, state, country, phoneNumber, amount, "House 6", rooms, currentDate);

                    // create admin receipt
                    const newAdminReceipt =  await createReceiptAdmin(_id, newReceipt, email, "House 6", state, country, phoneNumber, amount, rooms, currentDate);

                    // create admin transaction
                    const newAdminTransaction =  await createTransactionAdmin(_id, newTransaction, newAdminReceipt, email, "House 6", state, country, phoneNumber, amount, status, reference, rooms.length, currentDate);

                    // notify admin of payment successful email

                    // notify user of payment successful email

                    // create admin message
                    await createMessage("New payment", "bi bi-credit-card-2-front", `User ${email} has paid the amount of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

                    // create user message
                    await createUserMessage(_id, "bi bi-credit-card-2-front", "New payment", `We have receive your payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

                    // delete pretransaction 
                    await preTransaction.deleteOne({email: email});

                    // send response successful
                    Response.status(200).json({message: `Verified transaction ${status}`, status});
                    
                }else if(status == "pending" || status == "processing" || status == "queued"){

                    // only create transaction on pending, webhook url will create receipt and booking on verified
                    // book all room in cart

                    // define i
                    var i = 0;
                    
                    // start loop
                    while(i < rooms.length){

                        // define item
                        const item = rooms[i];

                        // extract booking props
                        const { roomId, checkIn, checkOut, persons, specialServices } = item;

                        // define new item
                        const newItem = { roomId, checkIn, checkOut, persons, specialServices, expired: false, status: "awaiting", seen: false, date: currentDate };
                    
                        // update user's bookings and cart
                        await User.updateOne({_id: new ObjectId(_id)}, { $push: {bookings: newItem}, $pull: {cart: { roomId: roomId, checkIn: checkIn, checkOut: checkOut} } });

                        // find user booking id
                        const { bookings } = await User.findOne({ _id: new ObjectId(_id) });

                        // define new booking
                        const newBooking = bookings.filter((doc)=>{return( doc.roomId == roomId && doc.checkIn == checkIn && doc.checkOut == checkOut )})[0];

                        // console.log(_id, newBooking._id, roomId, checkIn, checkOut, persons, specialServices, currentDate)

                        // create admin booking
                        await createBookingAdmin(_id, newBooking._id, roomId, checkIn, checkOut, persons, specialServices, currentDate);

                        // update room booked true and booking count
                        await Room.updateOne({_id: new ObjectId(roomId)}, {$set: {booked: true} , $push: {booking_count: {user_id: _id, check_in: checkIn, check_out: checkOut, persons: persons, special_services: specialServices, expired: false, date: currentDate }}});

                        // move on to next cart item
                        i++;
                    };
                    
                    // make sure the loop is completed
                    if(i == rooms.length){

                        // pre transaction pending
                        await createPreTransactionPendingData(name, email, reference, address, phone_number, state, country, rooms);

                        // create user transaction
                        const newTransaction = await createTransactionUser(_id, email, state, country, phoneNumber, amount, "House 6", "pending", reference, rooms.length, currentDate);

                        // create admin transaction
                        await createTransactionAdmin(_id, newTransaction, "pending", email, "House 6", state, country, phoneNumber, amount, status, reference, rooms.length, currentDate);

                        // notify admin of payment pending email

                        // notify user of payment pending email

                        // create admin message
                        await createMessage("Pending payment", "bi bi-credit-card-2-front", `User ${email} has made a payment which is currently pending for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

                        // create user message
                        await createUserMessage(_id, "bi bi-credit-card-2-front", "Pending payment", `Your payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} is currently pending, you'll be notified when the transaction is fully processed`, currentDate);

                        // delete user cart
                        // await User.updateOne({_id: new ObjectId(_id)}, {$set: {cart: []}});

                        // send response pending
                        Response.status(200).json({message: `Verified transaction pending`, status: "pending"});

                    };

                }else if(status == "failed"){
                    // send response failed
                    Response.status(200).json({message: `Verified transaction ${status}`, status});
                };

            }catch(err){
                console.log(err)
            };
        })
        }).on('error', error => {
            console.error(error)
            Response.status(400).json({error: "Could not verify transaction"});
        })

        req.end();

    }else if(isIncluded){

        console.log("already payment route");

        // send response for already verified transaction
        const { status } = isIncluded;
        Response.status(200).json({message: `Verified transaction ${status}`, status});
    };
});
///////////////////////////////////////////////

// proceed with reservation
app.get("/proceed_with_reservation/:reference", async(req, res)=>{

    // define reference
    const { reference }= req.params;

    try{
        // define current date
        const currentDate = moment().toISOString();
        
        // find pre transaction using referenece
        const { name, email, address, phone_number, state, country, rooms } = await preTransaction.findOne({reference: reference});

        // import user's cart
        const { _id, transactions } = await User.findOne({email: email});

        // find admin transaction
        const foundAdminTransaction = await AdminTransaction.findOne({reference: reference});

        // extract amount
        const { amount } = foundAdminTransaction;

        // create user and admin bookings
        rooms.forEach(async(item)=>{
            // extract booking props
            const { roomId, checkIn, checkOut, persons, specialServices } = item;

            // create user booking
            const newId = await createBookingUser(_id, roomId, checkIn, checkOut, persons, specialServices, currentDate);

            // create admin booking
            await createBookingAdmin(_id, newId, roomId, checkIn, checkOut, persons, specialServices, currentDate);

            // update room booking count
            await Room.updateOne({_id: new ObjectId(roomId)}, {$push: {booking_count: {user_id: _id, check_in: checkIn, check_out: checkOut, persons, special_services: specialServices, expired: false, date: currentDate }}});
            
            // set room booked
            await Room.updateOne({_id: new ObjectId(roomId)}, {$set: {booked: true}});
        });

        // create new transactions array
        const newTransactions = transactions.map((doc)=>{
            if(doc._id == foundAdminTransaction.userTransactionId){
                const { _id, email, issuedBy, country, phoneNumber, state, amount, status, reference, rooms, seen, date } = doc;
                const updatedTransaction = {_id, email, issuedBy, country, phoneNumber, state, amount, status: "failed", reference, rooms, seen, date};      
                return(updatedTransaction);                
            }else{
                return(doc)
            };
        });

        // notem do not create receipt /////////////////////////////////////////////////////////////
        
        // set user transactions and set pending cart to false
        await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

        // update admin transaction based on reference
        await AdminTransaction.updateOne({reference: reference}, {$set: {status: "failed"}});

        // create pre transaction failed data
        await createPreTransactionFailedData(name, email, reference, address, phone_number, state, country, rooms);

        // create admin message
        await createMessage("Payment failed", "bi bi-credit-card-2-front", `User ${email} payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

        // create admin message
        await createMessage("New debtor", "bi bi-bank", `User ${email} is now owing house 6 the sum of ${amount}`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-credit-card-2-front", "Payment failed", `Your pending payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-bank", "New debt", `You're now owing house 6 the sum of ${amount}. If you would like to cancel your booking, please reach out to one of our staffs or cancel it from my account`, currentDate);

        // notify user of failed payment email

        // this should only happen when they decide to proceed to book and pay later

        // create new admin debtor
        await createDebtorAdmin(_id, foundAdminTransaction.userTransactionId, foundAdminTransaction.receiptId, email, "House 6", foundAdminTransaction.state, foundAdminTransaction.country, foundAdminTransaction.phoneNumber, foundAdminTransaction.amount, "debtor", foundAdminTransaction.reference, foundAdminTransaction.rooms, foundAdminTransaction.date);

        // send response
        res.status(200).json({message: "Reservation booked"});
    }catch(err){
        // send response
        res.status(400).json({error: "Could not proceed with booking"});
    };
});

// cancel all reservation
app.get("/cancel_all_reservation/:reference", async(req, res)=>{

    // define reference
    const { reference }= req.params;

    try{
        // define current date
        const currentDate = moment().toISOString();
        
        // find pre transaction using referenece
        const { name, email, address, phone_number, state, country, rooms } = await preTransaction.findOne({reference: reference});

        // import user's cart
        const { _id, transactions } = await User.findOne({email: email});

        // find admin transaction
        const foundAdminTransaction = await AdminTransaction.findOne({reference: reference});

        // update user transaction
        // create new transactions array
        const newTransactions = transactions.map((doc)=>{
            if(doc._id == foundAdminTransaction.userTransactionId){
                const { _id, email, issuedBy, country, phoneNumber, state, amount, status, reference, rooms, seen, date } = doc;
                const updatedTransaction = {_id, email, issuedBy, country, phoneNumber, state, amount, status: "failed", reference, rooms, seen, date};      
                return(updatedTransaction);                
            }else{
                return(doc)
            };
        });
        // set user transactions
        await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

        // update admin transaction based on reference if any
        await AdminTransaction.updateOne({reference: reference}, {$set: {status: "failed"}});

        // delete pre transaction
        await PreTransaction.deleteOne({reference: reference});

        // delete pre transaction pending if any for webhook failed
        await PreTransactionPending.deleteOne({reference: reference});

        // create admin message
        await createMessage("Reservatiom canceled", "bi bi-trash", `User ${email} have canceled their reservation for some rooms`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-trash", "Reservation canceled", `All reservation canceled`, currentDate);

        // send response
        res.status(200).json({message: "Reservation canceled"});
    }catch(err){
        // send response
        res.status(400).json({error: "Could not proceed with booking"});
    };
});

// webhook methods

// webhook transaction pending
const webhookVerifyTransactionPending = async(reference, amount)=>{
    try{
        // define current date
        const currentDate = moment().toISOString();

        // find pre transaction pending using referenece
        const { name, email, address, phone_number, state, country, rooms } = await PreTransactionPending.findOne({reference: reference});

        const phoneNumber = phone_number;

        // import user's transactions
        const { _id, transactions } = await User.findOne({email: email});

        // find admin transaction
        const foundAdminTransaction = await AdminTransaction.findOne({reference: reference});

        // create user receipt
        const newReceipt = await createReceiptUser(_id, email, state, country, phoneNumber, amount, "House 6", rooms, foundAdminTransaction.date);

        // create admin receipt
        const newAdminReceipt =  await createReceiptAdmin(_id, newReceipt, email, "House 6", state, country, phoneNumber, amount, rooms, foundAdminTransaction.date);

        // update user transaction
        // create new transactions array
        const newTransactions = transactions.map((doc)=>{

            // if statement
            if(doc._id == foundAdminTransaction.userTransactionId){

                // extract props
                const { _id, email, issuedBy, country, phoneNumber, state, amount, status, reference, rooms, seen, date } = doc;

                // define updated transaction
                const updatedTransaction = {_id, email, issuedBy, country, phoneNumber, state, amount, status: "success", reference, rooms, seen, date};   
                
                // return updated transaction
                return(updatedTransaction);                
            }else{
                // return doc
                return(doc)
            };
        });
        // set user transactions
        await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

        // update admin transaction receipt id and status
        await AdminTransaction.updateOne({reference: reference}, {$set: {receiptId: newAdminReceipt, status: "success"}});

        // notify admin of payment successful email

        // notify user of payment successful email

        // create admin message
        await createMessage("Pending payment verified", "bi bi-credit-card-2-front", `User ${email} pending payment of ${amount} naira for ${rooms.length > 1?"rooms":"room"} has been fully processed`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-credit-card-2-front", "Pending payment verified", `Your pending payment of ${amount} naira for ${rooms.length > 1?"rooms":"room"} has been fully processed`, currentDate);

        // delete pretransaction 
        await PreTransactionPending.deleteOne({reference: reference});
        
    }catch(err){
        console.log(err);
    };
};
/////////////////////////////////////////////

// webhook transaction failed
const webhookVerifyTransactionFailed = async(reference, amount)=>{

    try{
        // define current date
        const currentDate = moment().toISOString();

        // find pre transaction pending using referenece
        const { name, email, address, phone_number, state, country, rooms } = await PreTransactionPending.findOne({reference: reference});

        // import user's cart
        const { _id, transactions } = await User.findOne({email: email});

        // find admin transaction
        const foundAdminTransaction = await AdminTransaction.findOne({reference: reference});

        // extracr props
        const { issuedBy } = foundAdminTransaction;

        // define user transaction
        const userTransaction = transactions.filter((doc)=>{return(doc.reference == reference)})[0];

        // extract props
        // const { amount } = foundAdminTransaction;

        // update user transaction
        // create new transactions array
        const newTransactions = transactions.map((doc)=>{

            // quick check
            if(doc._id == foundAdminTransaction.userTransactionId){

                // extract props
                const { _id, email, issuedBy, country, phoneNumber, state, amount, status, reference, rooms, seen, date } = doc;
                
                // define updated transactions
                const updatedTransaction = {_id, email, issuedBy, country, phoneNumber, state, amount, status: "failed", reference, rooms, seen, date};
                
                // return updated transaction
                return(updatedTransaction);                
            }else{

                // return doc
                return(doc)
            };
        });
        // set user transactions and set pending cart to false
        await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

        // update admin transaction based on reference
        await AdminTransaction.updateOne({reference: reference}, {$set: {status: "failed"}});

        // delete any pre transaction failed data if any
        await PreTransactionFailed.deleteOne({reference: reference});

        // create pre transaction failed data
        await createPreTransactionFailedData(name, email, reference, address, phone_number, state, country, rooms);

        // create admin message
        await createMessage("Payment failed", "bi bi-credit-card-2-front", `User ${email} payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-credit-card-2-front", "Payment failed", `Your pending payment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

        // create admin message
        await createMessage("New debtor", "bi bi-bank", `User ${email} is now owing House 6 the sum of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}.`, currentDate);

        // create user message
        await createUserMessage(_id, "bi bi-bank", "New debtor", `Your are now owing House 6 the sum of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}.`, currentDate);

        // delete any existing debtor
        await AdminDebtor.deleteOne({reference: reference});

        // create debtor
        await createDebtorAdmin(_id, userTransaction._id, "pending_debtor", email, issuedBy, state, country, phone_number, amount, "debtor", reference, rooms.length, currentDate);

        // delete pretransaction pending
        await PreTransactionPending.deleteOne({reference: reference});

    }catch(err){ 
        console.log(err);
    };
};

// webhook refund processed
// update find refund request by id from paystack metadata /////////////////////
const webhookRefundProcessed = async(reference, refund_request_id, refundedAmount)=>{

    // define current date
    const currentDate = moment().toISOString();

    // define new amount
    var newAmount = null;

    // find pre transaction refund data
    const { userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, rooms, seen, date } = await PreTransactionRefund.findOne({refund_request_id: refund_request_id});

    // find admin transaction
    const adminTransaction = await AdminTransaction.findOne({reference: reference});

    // find admin receipt
    const adminReceipt = await AdminReceipt.findOne({_id: new ObjectId(adminTransaction.receiptId)});

    // find user transactions, bookings, receipts
    const { transactions, receipts } = await User.findOne({_id: new ObjectId(userId)});

    // define reference receipts
    const referenceReceipt = receipts.filter((doc)=>{
        if(doc._id == adminReceipt.userReceiptId){
            return(doc);
        };
    })[0];

    // define new items
    const newReceiptItems = [];

    // create new user receipt array
    var r = 0;
    while(r < referenceReceipt.rooms.length){

        // define reference receipt room
        const referenceReceiptRoom = referenceReceipt.rooms[r];

        // check if room is included in pretransaction array
        const isIncluded = rooms.filter((room)=>{return(referenceReceiptRoom.roomId == room.roomId)})[0];
        
        // if room is not included, push room to new receipt item array
        if(!isIncluded){
            // check if there any valid days in reference receipt room not included before pushing
            const isValidDays = await calcValidDays(moment(referenceReceiptRoom.checkIn), moment(referenceReceiptRoom.checkOut));
            
            // if reference receipt room is still refundable, else do nothing
            if(isValidDays.length != 0){

                // push reference receipt room to new receipt items
                newReceiptItems.push(referenceReceiptRoom);

                // move on to next
                r++;
            }else{
                // move on to next
                r++;
            };

        }else{
            // move on to next
            r++;
        };
    };

    // calc price based new receipt item
    const calcAmount = newReceiptItems.reduce((total, value)=>{
        const checkInDate = moment(value.checkIn);
        const checkOutDate = moment(value.checkOut);
        const days = checkOutDate.diff(checkInDate, "days");
        const calculatedAmount = value.persons * value.price * days;
        var price = null;

        if(value.specialServices != true){
            price = calculatedAmount;
        }else{
            const percentage = (calculatedAmount/100) * 5;
            price = calculatedAmount + percentage;
        };
        return(total + price)
    }, 0);

    //////////////////////////////////////
    // console.log("calc amount", calcAmount);

    // update new amount based on calc amount value
    if(calcAmount > 0){
        // new amount
        newAmount = calcAmount;
    }else{
        // new amount
        newAmount = amount;
    };

    // update or delete receipt and transaction based on if rooms array length
    if(calcAmount > 0){

        // console.log("triggered a")

        // find all refund request with this refernce and check if it only one to update transaction status
        const foundRefundRequests = await AdminRefundRequest.find({reference: reference});

        // check for found request length
        if(foundRefundRequests.length == 1){

            console.log("success")

            // update user transaction status to refunded based on reference
            const newTransactions = transactions.map((doc)=>{
                if(doc.reference == reference){
                    const newDoc = doc;
                    newDoc.status = "success";
                    newDoc.rooms = newReceiptItems.length;
                    newDoc.amount = newAmount;
                    return(newDoc);
                }else{
                    return(doc);
                };
            });

            // update user transaction and receipt
            await User.updateOne({_id: new ObjectId(userId)}, {$set: {transactions: newTransactions}});

            // update admin transaction
            await AdminTransaction.updateOne({_id: new ObjectId(adminTransaction._id)}, {$set: {status: "success", amount: newAmount, rooms: newReceiptItems.length}});
        
        }else{

            // don't touch transaction status
            console.log("don't touch")

            // update user transaction status to refunded based on reference
            const newTransactions = transactions.map((doc)=>{
                if(doc.reference == reference){
                    const newDoc = doc;
                    newDoc.rooms = newReceiptItems.length;
                    newDoc.amount = newAmount;
                    return(newDoc);
                }else{
                    return(doc);
                };
            });

            // update user transaction and receipt
            await User.updateOne({_id: new ObjectId(userId)}, {$set: {transactions: newTransactions}});

            // update admin transaction
            await AdminTransaction.updateOne({_id: new ObjectId(adminTransaction._id)}, {$set: {amount: newAmount, rooms: newReceiptItems.length}});

        };

        // define new receipt user
        const newReceipts = receipts.map((doc)=>{
            if(doc._id == adminReceipt.userReceiptId){
                const newDoc = doc;
                newDoc.amount = newAmount;
                newDoc.rooms = newReceiptItems;
                return(newDoc);
            }else{
                return(doc);
            };
        });

        // update user transaction and receipt
        await User.updateOne({_id: new ObjectId(userId)}, {$set: {receipts: newReceipts}});

        // update admin receipt
        await AdminReceipt.updateOne({_id: new ObjectId(adminTransaction.receiptId)}, {$set: {rooms: newReceiptItems, amount: newAmount}});

    }else{
        console.log("refunded")

        // update user transaction status to refunded based on reference
        const newTransactions = transactions.map((doc)=>{
            if(doc.reference == reference){
                const newDoc = doc;
                newDoc.status = "refunded";
                newDoc.rooms = rooms.length;
                return(newDoc);
            }else{
                return(doc);
            };
        });

        // update user transactions with new array
        await User.updateOne({_id: new ObjectId(userId)}, {$set: {transactions: newTransactions}});

        // update admin transaction status refunded
        await AdminTransaction.updateOne({_id: new ObjectId(adminTransaction._id)}, {$set: {status: "refunded", rooms: rooms.length}});

        // delete user receipt
        await User.updateOne({_id: new ObjectId(userId)}, {$pull: {receipts: {_id: new ObjectId(adminReceipt.userReceiptId)}}});

        // delete admin receipt
        await AdminReceipt.deleteOne({_id: new ObjectId(adminReceipt._id)});

    };

    // create admin initial refund payment
    await AdminInitialPayment.create({userId, userTransactionId, email, issuedBy, state, country, phoneNumber, amount, reference, status: "refunded", rooms: newReceiptItems.length, seen, date});

    // alert admin on refund processed
    await createMessage("Refund processed", "bi bi-credit-card-2-front", `Refund of ${amount} naira for user ${email} has been fully processed`, currentDate);

    // alert user on refund processed
    await createUserMessage(userId, "bi bi-credit-card-2-front", "Refund processed", `Your refund of ${amount} naira for ${rooms.length} rooms has been fully processed`, currentDate);

    // delete pre transaction refund
    await PreTransactionRefund.deleteOne({refund_request_id: refund_request_id}); 

    // delete refund request
    await AdminRefundRequest.deleteOne({_id: new ObjectId(refund_request_id)});

};

// webhook refund failed
const webhookRefundFailed = async(reference, refund_request_id,)=>{

    // define current date
    const currentDate = moment().toISOString();

    // find pre transaction refund data
    const { userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, rooms, seen, date } = await PreTransactionRefund.findOne({refund_request_id: refund_request_id});

    // find user transactions
    const { transactions } = await User.findOne({_id: new ObjectId(userId)});

    // update user transaction status to refunded failed on reference
    const newTransactions = transactions.map((doc)=>{
        if(doc.reference == reference){
            const newDoc = doc;
            newDoc.status = "refund failed";
            return(newDoc);
        }else{
            return(doc);
        };
    });

    // update user transasctions with new array
    await User.updateOne({_id: new ObjectId(userId)}, {$set: {transactions: newTransactions}});

    // update admin transaction
    await AdminTransaction.updateOne({reference: reference}, {$set: {status: "refund failed"}});

    // alert admin on refund processed
    await createMessage("Refund failed", "bi bi-credit-card-2-front", `Refund of ${amount} naira for user ${email} failed, pls refund user manually`, currentDate);

    // alert user on refund processed
    await createUserMessage(userId, "bi bi-credit-card-2-front", "Refund failed", `Your refund of ${amount} naira for ${rooms.length} rooms has failed, pls speak to a house 6 staff`, currentDate);

    // delete pre transaction refund
    await PreTransactionRefund.deleteOne({refund_request_id: refund_request_id});

    // update admin refund request processing status to false
    await AdminRefundRequest.updateOne({_id: new ObjectId(refund_request_id)}, {$set: {processing: false, status: "Refund request"}});

};

// webhook pending transactions
app.post("/webhook_verify_transaction", async(req, res)=>{

    try{
        //validate event
        const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');

        if(hash == req.headers['x-paystack-signature']) {

            // Retrieve the request's body
            const event = req.body;

            // define event reference
            const reference = event.data.reference;

            // define event amount
            const amount = event.data.amount/100;

            // define original reference
            const original_reference = event.data.metadata.original_reference;

            if(!original_reference){

                // Do something with event
                if(event.event == "charge.success"){
                    
                    await webhookVerifyTransactionPending(reference, amount);

                }else if("charge.failed"){

                    await webhookVerifyTransactionFailed(reference, amount);

                }else if(event.event == "refund.processed"){
                    
                    try{
                        // define event metadata refund request id prop
                        const reference = event.data.metadata.refund_request_id;

                        await webhookRefundProcessed(reference, amount);
                    }catch(err){
                        console.log(err);
                    };

                }else if(event.event == "refund.failed"){

                    try{
                        // define event metadata refund request id prop
                        const reference = event.data.metadata.refund_request_id;

                        // initialize webhook refund failed
                        await webhookRefundFailed(reference);
                    }catch(err){
                        console.log(err);
                    };

                };

            }else{

                // find pre transaction using referenece
                const { email, phone_number, newReference, state, country, rooms } = await PreTransactionFailed.findOne({reference: original_reference});

                // define new refrence
                const new_reference = newReference;

                // define phone number
                const phoneNumber = phone_number;

                // import user's id
                const { _id } = await User.findOne({email: email});

                if(event.event == "charge.success"){

                    ///////////////////////////////

                    // define current date
                    const currentDate = moment().toISOString();

                    // define status
                    const status = "success";

                    // find admin transaction
                    const adminTransaction = await AdminTransaction.findOne({reference: original_reference});

                    // find pending receipt
                    // const pendingReceipt = await PendingReceipt.findOne({_id: new ObjectId(adminTransaction.receiptId)});

                    // find user
                    const user = await User.findOne({email: email});

                    // find user transactions
                    const { transactions } = user;

                    // create user receipt
                    const newReceipt = await createReceiptUser(_id, email, state, country, phoneNumber, amount, "House 6", rooms, adminTransaction.date);

                    // create admin receipt
                    const newAdminReceipt =  await createReceiptAdmin(_id, newReceipt, email, "House 6", state, country, phoneNumber, amount, rooms, adminTransaction.date);

                    // update admin transaction reference and new admin receipt id and status
                    await AdminTransaction.updateOne({reference: original_reference}, {$set: {reference: new_reference, receiptId: newAdminReceipt._id, status: "success"}});

                    // define new transactions
                    const newTransactions = transactions.map((doc)=>{
                        if(doc.reference == original_reference){
                            // define new doc
                            const newDoc = doc;

                            // set update new doc reference
                            newDoc.reference = new_reference;

                            // update transaction status
                            newDoc.status = "success";

                            // return new doc
                            return(newDoc);
                        }else{

                            // return doc
                            return(doc);

                        };
                    });

                    // update user transactions
                    await User.updateOne({_id: new ObjectId(_id)}, {$set: {transactions: newTransactions}});

                    // update user transaction

                    // notify admin of repaid payment successful email

                    // notify user of repaid payment successful email

                    // create admin message
                    await createMessage("Verified repayment successful", "bi bi-credit-card-2-front", `User ${email} has repaid the amount of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

                    // create user message
                    await createUserMessage(_id, "bi bi-credit-card-2-front", "Verified repayment successful", `We have receive your repayment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"}`, currentDate);

                    // delete pretransaction 
                    await PreTransactionFailed.deleteOne({reference: original_reference});

                    // delete debtor if any
                    await AdminDebtor.deleteOne({reference: reference});

                    // delete flagged down
                    await FlaggedDown.deleteOne({reference: reference});

                }else if(event.event == "charge.failed"){

                    // define current date
                    const currentDate = moment().toISOString();

                    // define status
                    const status = "failed";

                    // create admin message
                    await createMessage("Verified repayment failed", "bi bi-credit-card-2-front", `User ${email} repayment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

                    // create user message
                    await createUserMessage(_id, "bi bi-credit-card-2-front", "Verified repayment failed", `Your repayment of ${amount} naira for ${rooms.length} ${rooms.length > 1?"rooms":"room"} has failed`, currentDate);

                    // update flagged down
                    await FlaggedDown.updateOne({reference: reference}, {$set: {verified: true}});
                };

            };
        };
        res.send(200);
    }catch(err){
        console.log(err)
    };
});

// intialize refund
app.post("/init_refund", async(Request, Response)=>{

    // extract refund request id and percentage
    const { refundRequestId, percentage } = Request.body;

    // find refund request and extract data
    const refundRequest = await AdminRefundRequest.findOne({_id: new ObjectId(refundRequestId)});

    if(refundRequest){

        // destructure refund request
        const { userId, userTransactionId, receiptId, email, issuedBy, state, phoneNumber, amount, status, reference, rooms, seen, date } = refundRequest;

        // check if refund is eligible
        // calculate refund based on current date and check-in date and check if user is eligible
        const isEligibleRefund = await calcRefundPrice(rooms);

        if(typeof(isEligibleRefund) !== "string"){

            // define new pre transaction refund
            const newPreTransactionRefund = { userId, userTransactionId, receiptId, email, issuedBy, state, phoneNumber, amount, status, reference, rooms, seen, date };

            // delete any pretransaction containing the reference
            await PreTransactionRefund.deleteOne({reference: reference});

            // create new pre transaction refund
            await PreTransactionRefund.create(newPreTransactionRefund);
            

            const https = require('https')

            const params = JSON.stringify({
            "transaction": `${reference}`,
            "amount": `${amount}`
            })

            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: '/refund',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', async() => {
                console.log(JSON.parse(data))

                // define paystack response
                const response = JSON.parse(data);

                // alert user
                await createUserMessage(userId, "bi bi-card", "Refund request", "Your refund request is being processed");

                // update user transactions status with refund to refund processing

                // send response
                Response.status(200).json({message: response.message});
            })
            }).on('error', error => {
                Response.status(400).json({error: "Failed to initialize refund"});
            })

            req.write(params);
            req.end();
        }else{
            Response.status(400).json({error: "User is not eligible for refund"});
        };
    };
});

// update room booking count
const updateRoomBookingCount = async(roomId, userId, checkInDate, checkOutDate)=>{
    // find room booking count
    const { booking_count } = await Room.findOne({_id: new ObjectId(roomId)});

    // create new booking count
    const newBookingCount = booking_count.map((doc)=>{
        if(doc.user_id == userId && doc.check_in == checkInDate && doc.check_out == checkOutDate){
            const newDoc = doc;
            newDoc.expired = true;
            return(newDoc);
        }else{
            return(doc);
        };
    });

    // update room booking count
    await Room.updateOne({_id: new ObjectId(roomId)}, {$set: {booking_count: newBookingCount}});
};

// initialize paystack refund method
const initializeRefundPaystack = async(type, refundRequestIdArray, Response, callback)=>{

    if(type == "single"){

        // define i
        var i = 0;

        // define error points
        var errorPoint = 0;

        // refund all users using the refund request array
        while(i < refundRequestIdArray.length){

            // adminRefundRequestId
            const doc = refundRequestIdArray[i];

            // extract props
            const { adminRefundRequestId, rooms } = doc;
            
            // define refund request id
            const refundRequestIdFromArray = adminRefundRequestId;

            // find refund request and extract data
            const refundRequest = await AdminRefundRequest.findOne({_id: new ObjectId(refundRequestIdFromArray)});
            
            // check for refund request
            if(refundRequest){
                // define current date
                const currentDate = moment().toISOString();

                // destructure refund request
                const { userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, seen, date } = refundRequest;

                // find rooms admin receipt
                // const adminReceipt = await AdminReceipt.findOne({_id: new ObjectId(receiptId)});

                // const filtered rooms
                const filteredRooms = rooms.map((doc)=>{return(doc)});

                // find room names
                const filteredRoomsNames = [];

                // define f
                var f = 0;
                
                // find filtered room names
                while(f < filteredRooms.length){

                    // extract room id
                    const { roomId } = filteredRooms[f];

                    // find name
                    const { name } = await Room.findOne({_id: new ObjectId(roomId)});

                    // push name to filtered rooms names array
                    filteredRoomsNames.push(name);

                    // move on to next
                    f++;
                };

                // define room names
                const roomNames = filteredRoomsNames.map((name)=>{return(name)}).join(", ");

                // define new pre transaction refund
                const newPreTransactionRefund = { userId, userTransactionId, receiptId, refund_request_id: adminRefundRequestId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen, date };

                // delete any pretransaction containing the reference
                // await PreTransactionRefund.deleteOne({reference: reference});

                // create new pre transaction refund
                await PreTransactionRefund.create(newPreTransactionRefund);

                
                // call the refund many function
                await refundMany(reference, adminRefundRequestId, amount)
                .then(async(data)=>{

                    // log data
                    console.log(data);
                
                    // find admin transaction
                    const transaction = await AdminTransaction.findOne({reference: reference});

                    // extract user transaction
                    const { transactions, bookings } = await User.findOne({_id: new ObjectId(userId)});

                    // cancel admin booking - expired and status
                    filteredRooms.map(async(room)=>{
                        // cancel admin booking user
                        await AdminBooking.updateOne({userId: transaction.userId, roomId: room.roomId, checkIn: room.checkIn, checkOut: room.checkOut}, {$set: {status: "canceled", expired: true}});
                    });

                    // update room booking count
                    filteredRooms.map(async(room)=>{
                        // update room booking count
                        await updateRoomBookingCount(room.roomId, transaction.userId, room.checkIn, room.checkOut);
                    });

                    // create new user bookings
                    const newBookings = [];
                    bookings.map((booking)=>{
                        filteredRooms.map((room)=>{
                            if(booking.roomId == room.roomId && booking.checkIn == room.checkIn && booking.checkOut == room.checkOut && booking.expired == false){
                                const newBooking = booking;
                                newBooking.status = "canceled";
                                newBooking.expired = true;

                                // return new room
                                newBookings.push(newBooking);
                            }else{
                                newBookings.push(booking);
                            };
                        });
                    });

                    // update user transaction - status to refund processing
                    const newTransactions = transactions.map((doc)=>{
                        if(doc._id == transaction.userTransactionId){
                            const newDoc = doc;
                            newDoc.status = "Refund processing";
                            return(newDoc);
                        }else{
                            return(doc);
                        };
                    });
                    
                    // update user
                    await User.updateOne({_id: new ObjectId(userId)}, {$set: {transactions: newTransactions, bookings: newBookings}});

                    // update admin transaction - status, rooms and amount
                    await AdminTransaction.updateOne({reference: reference}, {$set: {status: "Refund processing"}});

                    // update admin refund request processing to true
                    await AdminRefundRequest.updateOne({_id: new ObjectId(adminRefundRequestId)}, {$set: {processing: true, status: "Refund processing"}});

                    // alert user
                    createUserMessage(userId, "bi bi-trash", "Booking canceled",`Your booking for ${roomNames} rooms has been canceled by the admin. You will recieve a full refund and a notification email. Sorry for the inconvinience`, currentDate);

                    // move on to next
                    i++;
                    ///////////////////////////////////////////////////////////////////////////////////
                })
                .catch((err)=>{
                    console.log(err);
                    // move on to the next
                    i++;

                    // add a point to error point
                    errorPoint++;
                });
                // end of call refund many function

            }else{
                // move on to next
                i++;

                // increase error points by one
                errorPoint++;
            };

        };
        // end of while loop
        
        // send response based on while loop
        if(i == refundRequestIdArray.length && errorPoint == 0){

            if(callback){
                // await callback
                await callback();

                // send response
                Response.status(200).json({message: "All bookings scheduled for refund"});
            }else{
                // send response
                Response.status(200).json({message: "All bookings scheduled for refund"});
            };
            
        }else if(i == refundRequestIdArray.length && errorPoint != 0){

            if(callback){
                // await callback
                await callback();

                // send response
                Response.status(400).json({
                    error: `Failed to initialize refund for ${errorPoint > 1? `${errorPoint} bookings of ${refundRequestIdArray.length} bookings` : `${errorPoint} booking of ${refundRequestIdArray.length > 1? `${refundRequestIdArray.length} bookings`:`${refundRequestIdArray.length} booking`}`}`,
                    reason: "Such error occur due to multiple reason. Either an a user's refund already being processed or a server side error from paystack"
                });
            }else{
                // send response
                Response.status(400).json({
                    error: `Failed to initialize refund for ${errorPoint > 1? `${errorPoint} bookings of ${refundRequestIdArray.length} bookings` : `${errorPoint} booking of ${refundRequestIdArray.length > 1? `${refundRequestIdArray.length} bookings`:`${refundRequestIdArray.length} booking`}`}`,
                    reason: "Such error occur due to multiple reason. Either an a user's refund already being processed or a server side error from paystack"
                });
            };
            
        };

    };

};

// refund many paystack
const refundMany = async(reference, refund_request_id, amount)=>{
    return new Promise((resolve, reject)=>{
        // mock up reference
            
        const https = require('https')

        const params = JSON.stringify({
            "transaction": `${reference}`,
            "metadata": {
                refund_request_id
            },
            "amount": `${amount}00`
        })

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/refund',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        });

        res.on('end', async() => {

            // log paystack response
            // console.log("paysatack response", resolve(JSON.parse(data)));

            // define response
            const response = JSON.parse(data);
            
            if(response.message == "Refund has been queued for processing"){
                resolve("Refund has been queued for processing");
            }else{
                resolve("next");
                console.log("next")
            };

        })
        }).on('error', error => {
            reject(error);
            // console.log("paystack error response", error)
        })

        req.write(params);
        req.end();
    });
};

// flag down transaction for repayment
app.get("/flag_down_transaction/:id", async(req, res)=>{

    // extract transaction id
    const { id } = req.params

    try{

        // find transaction id
        const { _id, email, status } = await AdminTransaction.findOne({userTransactionId: id});

        // check status
        if(status.toLowerCase() == "failed"){

            // delete previous flagged down transaction
            await FlaggedDown.deleteOne({email: email});

            // flag down transaction for repayment
            await FlaggedDown.create({email: email, transactionId: _id, verified: false});

            // send response
            res.status(200).json({message: "Flagged down transaction for repayment"});

        }else throw Error("Cannot flag down transaction for repayment");

    }catch(err){

        // log error to console
        console.log(err);

        // send response
        res.status(400).json({error: err.message});
    };
});

// initialize repayment api
app.post("/initialize_repay_transaction", async(Request, Response)=>{


    // extract email
    const { email } = Request.body;

    try{

        // find transaction flagged down for repayment
        const { transactionId } = await FlaggedDown.findOne({email: email});

        // find transaction id
        const adminTransaction = await AdminTransaction.findOne({_id: new ObjectId(transactionId)});

        // extract props
        const { reference, status, amount } = adminTransaction;

        // check status
        if(status.toLowerCase() == "failed"){

            // initialize repayment
            await initializeRepaymentPaystack(email, reference, amount, Response);

        }else throw Error("Cannot initialize repayment for this transaction");

    }catch(err){

        // log error to console
        // console.log(err);

        // send response
        Response.status(400).json({error: err.message});
    };
});

// initialize repayment
const initializeRepaymentPaystack = async(email, original_reference, amount, Response)=>{

    // initialize paystack repayment
    await repayFailedTransaction(email, original_reference, amount)
    .then(async(data)=>{

        // extract props
        const { authorization_url, reference } = data.data;

        // define new reference
        const new_reference = reference;

        // update pre transaction failed new reference prop to new reference
        await PreTransactionFailed.updateOne({ reference: original_reference }, {$set: { newReference: new_reference }});
 
        // send response
        Response.status(200).json({message: "Initialize repay transaction successful", authorization_url });
    })
    .catch((err)=>{

        // send response
        Response.status(400).json({error: err});
    });

};

// refund many paystack
const repayFailedTransaction = async(email, original_reference, amount)=>{

    return new Promise((resolve, reject)=>{
        // mock up reference
            
        const https = require('https')

        const params = JSON.stringify({
            "email": `${email}`,
            "amount": `${amount}00`,
            "metadata": {
                original_reference: original_reference
            }
        })

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, res => {
        let data = ''

        res.on('data', (chunk) => {
            data += chunk
        });

        res.on('end', async() => {

            // log paystack response
            console.log("paysatack response", resolve(JSON.parse(data)));

            // define response
            const response = JSON.parse(data);
            
            if(response.data.authorization_url){

                // extract authorization url
                const authorization_url = response.data.authorization_url;

                // extract reference
                const reference = response.data.reference;

                const newData = { authorization_url, new_reference: reference };

                resolve(newData);
            }else{
                resolve("next");
                // console.log("next")
            };

        })
        }).on('error', error => {
            reject("Failed to initialize repayment for transaction");
            console.log("paystack error response", error)
        })

        req.write(params);
        req.end();
    });
};



// user api
app.get("/import_my_cart/:id", async(req, res)=>{

    // extract user id
    const { id } = req.params;

    try{
        const newCartArray = [];

        const { cart } = await User.findOne({_id: new ObjectId(id)});

        // process cart for is valid
        const { newCart, loopCompleted } = await isValidBookingDates(cart);

        // define i
        var i = 0;
        
        // if new cart exist
        if(newCart && loopCompleted == true){

            // process new cart
            while(i < newCart.length){

                // define cart item
                const cartItem = newCart[i];
                
                // extract cart props
                const { roomId, checkIn, checkOut, persons, specialServices, isValid } = cartItem;
                
                // find name image and price
                const { name, images, price } = await Room.findOne({_id: new ObjectId(roomId)});
                
                // extract first image
                const image = images[0];

                // define new cart item
                const newCartItem = {name, image, roomId, checkIn, checkOut, persons, specialServices, price, isValid};
                
                // push new cart item to new cart array
                newCartArray.push(newCartItem);

                // move on to next cart item
                i++;
            };
        };

        res.status(200).json({message: "All okay", cart: newCartArray});
    }catch(err){
        console.log("error", err);

        res.status(400).json({error: "Could not import cart"});
    };
});
// end of user api






// user account api

// upload image function
const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, "./user_images");
    },
    filename: function (req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

const upload = multer({storage: storage});

// upload user image
app.post("/upload_user_image/:id", upload.single("image"), async(req, res)=>{
    try{
        // extract user id
        const { id } = req.params;
        // extract image name
        const imageName = `${req.file.filename}`;
        
        // previous image
        const { image } = await User.findOne({_id: new ObjectId(id)});
        // delete previous image if image is not default image
        if(image !== "no_image.png"){
            const deletePreviousImage = fs.unlinkSync(`./user_images/${image}`, (err)=>{
                if(!err){
                    console.log("deleted");
                }else{
                    console.log(err);
                };
            });
        };
        // update user
        const action = await User.updateOne({_id: new ObjectId(id)}, {$set: {image: imageName}});
        // server response + send image
        res.status(200).json({message:"Image upload successful !"});
    }catch(err){
        console.log(err);
        res.status(400).json({error:"Image upload failed !"});
    };
});

// delete user's image
app.delete("/delete_user_image/:id", async(req, res)=>{
    try{
        // extract user id
        const { id } = req.params;

        // extract user image from request body
        const { image } = req.body;

        // make sure image is not default image
        if(image && image != "no_image.png"){

            // delete image
            const deleteImage = fs.unlinkSync(`./user_images/${image}`, (err)=>{
                if(!err){
                    console.log("deleted");
                }else{
                    console.log(err);
                };
            });
            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {image: "no_image.png"}});

            // server response + default image
            res.status(200).json({message:"Image successfully deleted !"});

        }else throw Error("Delete image failed");
    }catch(err){
        res.status(400).json({error:"Could not delete image !"});
    };
});

// send user image
app.get("/send_image/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "user_images", id);
        res.status(200).sendFile(image);
    }catch(err){
        res.status(400).json({error: err.message});
    };
});


// create wishlist
const createWishList = async(userId, array)=>{

    // define new array
    const newArray = [];

    // define keywords
    const keyWords = [];

    // define i
    var i = 0;

    // start loop for i
    while(i < array.length){

        // extract props
        const { _id, roomId } = array && array[i];

        // find doc
        const doc = await Room.findOne({_id: new ObjectId(roomId)});

        // if doc
        if(doc){

            // extract props
            const { name, images, booked, price, ratings, notifications } = doc;

            // calc average rating
            const { averageRating, percentage } = calcAverageRating(ratings);

            // define new keyword
            const newkeyWord = { keyWord: `${name} ${booked?"open":"reserved booked"} ${price}`, _id };

            // push to keywords
            keyWords.push(newkeyWord);

            // check for notification included
            const notificationIncluded = notifications.filter((notification)=>{return(notification.user_id == userId)})[0];

            // define active notification
            const activeNotification = notificationIncluded?"active":"not active";
            
            if(ratings.length != 0){

                // define new data
                const data = { _id, name, image: images[0], booked, price, averageRating: averageRating.toFixed(1), ratings, roomId, activeNotification };

                // push data to data
                newArray.push(data);

            }else{
                // define new data
                const data = { _id, name, image: images[0], booked, price, averageRating: 0.0000.toFixed(1), ratings, roomId, activeNotification };

                // push data
                newArray.push(data);
            };
            
            // move on to next item in wishlist
            i++

        }else{

            // move to next
            i++;

        };
    }
    return({newWishList: newArray.reverse(), keyWords: keyWords.reverse() });
};

// create bookings
const createBookings = async(array)=>{

    // define new array
    const newArray = [];

    // define key words
    const keyWords = [];

    // define i
    var i = 0;

    // start loop for i
    while(i < array.length){

        // extract props
        const { _id, roomId, checkIn, checkOut, persons, specialServices, expired, seen, status } = array[i];

        // find doc
        const doc = await Room.findOne({_id: new ObjectId(roomId)});

        // if doc
        if(doc){
            // extract props 
            const { name, images, ratings  } = doc;

            // calc average rating
            const {averageRating, percentage} = calcAverageRating(ratings);

            // define data
            const data = { _id, name, image: images[0], checkIn, checkOut, persons, specialServices, expired, seen, averageRating: typeof(averageRating) == Number?averageRating.toFixed(1):0, ratings, status };

            // define new key word
            const newKeyWord = { keyWord: `${name} ${moment(checkIn).format("MMM DD")} ${moment(checkOut).format("MMM DD")} ${status}`, _id };

            // push to new array
            newArray.push(data);

            // push to key words array
            keyWords.push(newKeyWord);

            // move on to next
            i++;
        }else{

            // move to next
            i++;

        };
    };
    return({ newBookings: newArray.reverse(), keyWords: keyWords.reverse() });
};

// user's activity array
const activityArray = async(id)=>{
    
    const array = [];
    const { bookings, transactions, receipts, messages } = await User.findOne({_id: new ObjectId(id)});

    const bookingPresent = bookings.filter((doc)=>{return(doc.seen == false)});
    const transactionPresent = transactions.filter((doc)=>{return(doc.seen == false)});
    const receiptPresent = receipts.filter((doc)=>{return(doc.seen == false)});
    const messagePresent = messages.filter((doc)=>{return(doc.seen == false)});

    if(bookingPresent.length > 0){
        array.push(2);
    };

    if(transactionPresent.length > 0){
        array.push(3);
    };

    if(receiptPresent.length > 0){
        array.push(4);
    };

    if(messagePresent.length > 0){
        array.push(5);
    };

    return(array);
};

// user activity array api
app.get("/user_activity_array/:id", async(req, res)=>{
    const { id } = req.params;
    try{
        const newActivityArray = await activityArray(id);

        res.status(200).json({message: "all okay", activityArray: newActivityArray});
    }catch(err){
        console.log(err);
        res.status(400).json({error: "error"});
    };
});

// account dashboard
app.post("/account_dashboard", async(req, res)=>{

    // user id
    const { id } = req.body;

    try{
        const { name, email, image, address, state, country, phoneNumber, wishList, bookings, transactions, receipts } = await User.findOne({_id: new ObjectId(id)});

        // create new wishlist array
        const { newWishList } = await createWishList(id, wishList);

        // create new booking array
        const { newBookings } = await createBookings(bookings);

        // create new receipt room array
        const newReceipts = await processReceiptUser(receipts);

        const data = {name, email, image, address, state, country, phoneNumber, wishList: newWishList.reverse().slice(0, 3), bookings: newBookings.slice(0, 3), transactions: transactions.reverse().slice(0, 3), receipts: newReceipts.slice(0, 3)}

        // send user data
        res.status(200).json({message: "import successful", name, email, image, address, state, country, phoneNumber, wishList: newWishList.slice(0, 3), bookings: newBookings.slice(0, 3), transactions: transactions.slice(0, 3), receipts: newReceipts.slice(0, 3) });
    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// account personal details
app.post("/account_personal_details", async(req, res)=>{

    // user id
    const { id } = req.body;

    try{
        // extract user personal details
        const { name, email, image, address, state, country, phoneNumber } = await User.findOne({_id: new ObjectId(id)});

        // send user data
        res.status(200).json({message: "import successful", data: {name, email, image, address, state, country, phoneNumber} });

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// edit account personal details
app.post("/edit_account_personal_details/:id", async(req, res)=>{

    // user id
    const { id } = req.params;
    const data = req.body;

    try{
        const { name, email, address, state, country, phoneNumber } = data;
        // extract user personal details
        await User.updateOne({_id: new ObjectId(id)}, {$set: { name, email, address, state, country, phoneNumber }});

        // send user data
        res.status(200).json({message: "update successful", data: {name, email, address, state, country, phoneNumber} });

    }catch(err){
        res.status(400).json({error: "failed to update"});
    };
});

// account wishlist
app.post("/account_wishlist", async(req, res)=>{
    // user id
    const { id } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{
        const { image, wishList } = await User.findOne({_id: new ObjectId(id)});
        
        // create new wishlist array
        const { newWishList, keyWords } = await createWishList(id, wishList);

        // sliced wishlist
        const slicedWishList = newWishList.slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(wishList.length/sliceNum);

        // total results
        const totalResult = newWishList.length;

        // send user data
        res.status(200).json({message: "import successful", image, keyWords: keyWords.slice(startpoint, endpoint), wishList: slicedWishList, totalPage, totalResult});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// account bookings
app.post("/account_bookings", async(req, res)=>{
    // user id
    const { id } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{

        // extract user props
        const { image, bookings } = await User.findOne({_id: new ObjectId(id)});

        // create new wishlist array
        const { newBookings, keyWords } = await createBookings(bookings);

        // total page
        const totalPage = Math.ceil(bookings.length/sliceNum);

        // total results
        const totalResult = newBookings.length;

        // send user data
        res.status(200).json({message: "import successful", image, keyWords: keyWords.slice(startpoint, endpoint), bookings: newBookings.slice(startpoint, endpoint), totalPage, totalResult});

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not import doc"});
    };
});

// account transaction
app.post("/account_transactions", async(req, res)=>{
    // user id
    const { id } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{

        // extract props
        const { image, name, transactions } = await User.findOne({_id: new ObjectId(id)});

        // define key words
        const keyWords = transactions.map((doc)=>{

            // exract props
            const { _id, email, rooms, status, state, country, phoneNumber, amount, date } = doc;

            // define new keyword
            const newKeyWord = { keyWord: `${email} ${rooms} ${state} ${country} ${phoneNumber} ${status} ${amount} ${moment(date).format("MMM DD")}`, _id };

            // return new keyword
            return(newKeyWord);

        }).reverse().slice(startpoint, endpoint);

        // create new wishlist array
        const newTransactions = transactions.reverse().slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(transactions.length/sliceNum);

        // total results
        const totalResult = transactions.length;

        // send user data
        res.status(200).json({message: "import successful", name, image, keyWords, transactions: newTransactions, totalPage, totalResult});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// process receipt user
const processReceiptUser = async(array)=>{

    const newArray = [];

    var i = 0;

    while(i < array.length){

        // extract props
        const { _id, userId, email, issuedBy, state, country, phoneNumber, amount, rooms, seen, date } = array[i];

        // process receipt rooms
        const newRooms = await processReceiptRoomAuthUser(rooms);

        // define new receipt
        const newReceipt = { _id, userId, email, issuedBy, state, country, phoneNumber, amount, rooms: newRooms, roomsLength: rooms, seen, date };

        // push new receipt
        newArray.push(newReceipt);

        // move on to next
        i++;
    };
    return(newArray.reverse());
};

// process receipt room user
const processReceiptRoomAuthUser = async(array)=>{

    const newArray = [];

    var i = 0;

    while(i < array.length){

        const { _id, checkIn, checkOut, persons, specialServices, roomId, price } = array[i];

        const room = await Room.findOne({_id: new ObjectId(roomId)});

        if(room){
            var newPrice = null;
            const { name } = room;
            const checkInDate = moment(checkIn);
            const checkOutDate = moment(checkOut);
            const difference = checkOutDate.diff(checkInDate, "days");
            const differenceInDate = moment(difference);
            const percentage = ((differenceInDate * price * persons)/100) * 5;
            
            if(specialServices == true){
                newPrice = (differenceInDate * price * persons) + percentage;
            }else{
                newPrice = (differenceInDate * price * persons);
            };

            const newData = {_id, roomId, name, checkIn, checkOut, specialServices, persons, price: newPrice.toFixed(2) };
            newArray.push(newData);
            i++;
        }else{
            i++;
        };
    };
    return(newArray);
};

// account receipts
app.post("/account_receipts", async(req, res)=>{
    // user id
    const { id } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{

        // exract props
        const { name, image, receipts } = await User.findOne({_id: new ObjectId(id)});

        // define key words
        const keyWords = receipts.map((doc)=>{

            // exract props
            const { _id, email, rooms, amount, date } = doc;

            // define new keyword
            const newKeyWord = { keyWord: `${email} ${rooms.length} ${amount} ${moment(date).format("MMM DD")}`, _id };

            // return new keyword
            return(newKeyWord);

        }).reverse().slice(startpoint, endpoint);

        // create new receipt room array
        const newReceipts = await processReceiptUser(receipts);

        // total page
        const totalPage = Math.ceil(receipts.length/sliceNum);

        // total results
        const totalResult = newReceipts.length;

        // send user data
        res.status(200).json({message: "import successful", name, image, keyWords, receipts: newReceipts.slice(startpoint, endpoint), totalPage, totalResult});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// create new receipt rooms array
const createReceiptRoomsArrayUser = async(array)=>{
    const newArray = [];

    for(i = 0; i < array.length; i++){
        const { _id, roomId, checkIn, checkOut, persons, specialServices , price} = array[i];

        var sumedPrice = 0;
        
        // if special serivces is true 
        if(specialServices === true){
            const checkInDate = moment(checkIn);
            const checkOutDate = moment(checkOut);
            const days = checkOutDate.diff(checkInDate, "days");
            const percentage = ((price * days * persons)/100) * 5;
            const newPrice = (days * persons * price) + percentage;
            sumedPrice += newPrice;
        }else{
            // if special serivces is false
            const checkInDate = moment(checkIn);
            const checkOutDate = moment(checkOut);
            const days = checkOutDate.diff(checkInDate, "days");
            const newPrice = days * persons * price;
            sumedPrice += newPrice;
        };

        // find room name
        const { name } = await Room.findOne({_id: new ObjectId(roomId)});

        // create new receipt items
        const newItem = { _id, roomId, name, checkIn, checkOut, persons, specialServices, price: sumedPrice };
        
        // push new receipt items
        newArray.push(newItem);
    };

    return(newArray);
};

// account receipt single
app.post("/account_receipt_single/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // receipt id
    const { receiptId } = req.body;

    try{
        const { name, address, receipts } = await User.findOne({_id: new ObjectId(id)});

        // create new wishlist array
        const { _id, userId, email, country, state, phoneNumber, amount, issuedBy, seen, date, rooms } = receipts && receipts.filter((doc)=>{return(doc._id == receiptId)})[0];
        const newRooms = await createReceiptRoomsArrayUser(rooms);
        const newReceipt = { _id, userId, name, email, address, country, state, phoneNumber, amount, issuedBy, seen, date, rooms: newRooms  };

        // send user data
        res.status(200).json({message: "import successful", receipt: newReceipt});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// account messages
app.post("/account_messages", async(req, res)=>{

    // extract id
    const { id } = req.body;

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{

        // define message array
        const messageArray = [];

        // find user data
        const { image, messages } = await User.findOne({_id: new ObjectId(id)});

        // define key words
        const keyWords = messages.map((doc)=>{

            // exract props
            const { _id, title, date } = doc;

            // define formated date
            const formatedDate = moment(date).format("MMM DD");

            // define new keyword
            const newKeyWord = { keyWord: `${title} ${formatedDate}`, _id };

            // return new keyword
            return(newKeyWord);

        }).reverse().slice(startpoint, endpoint);

        messages.reverse().forEach((message)=>{messageArray.push(message)});

        // total page
        const totalPage = Math.ceil(messages.length/sliceNum);

        // total results
        const totalResult = messages.length;

        // new messages
        const newMessages = messageArray.slice(startpoint, endpoint);

        res.status(200).json({message: "import successful", image, keyWords, messages: newMessages.reverse(), totalResult, totalPage });
    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// calc refund price ///////////////////////////
const calcRefundPrice = async(array, type)=>{
    
    // define price array
    const priceArray = [];

    // define new total price
    var newTotalPrice = 0;
    
    // define i
    var i = 0;

    while(i < array.length){

        // define doc
        const doc = array[i];

        // extract props
        const { _id, checkIn, checkOut, roomId, persons, specialServices, price } = doc;

        if(price){

            // calc item price
            const checkInDate = moment(checkIn);
            const checkOutDate = moment(checkOut);

            // define days
            const days = checkOutDate.diff(checkInDate, "days");
        
            // define item price
            var itemPrice = 0; 

            // define pre item price
            const preItemPrice = price * persons * days;

            if(specialServices == true){
                const percentage = (preItemPrice/100) * 5;
                itemPrice = preItemPrice + percentage;
            }else{
                itemPrice = preItemPrice;
            };
            // end of calc item price

            // specify the calculation type
            // if type exist and it's equal to days
            if(type && type == "days"){

                // calc valid days
                const daysArray = await calcValidDays(checkInDate, checkOutDate);

                // action based on days array
                if(daysArray.length != 0){

                    // new price is given below
                    const newPrice = (itemPrice/days) * daysArray.length;

                    // push new price
                    priceArray.push({id: _id, price: newPrice, persons});

                }else{

                    // push original item price
                    priceArray.push({id: _id, price: 0, persons});
                };

            }else if(!type || type != "days"){
                // full refund
                priceArray.push({id: _id, price: itemPrice, persons});
            };

            i++;
        };
    };

    // sum price array item price property.
    const totalPrice = priceArray.reduce((total, value)=>{
        return(total + value.price);
    }, 0);

    // check if total price is not equal to zeroe
    if(totalPrice !== 0){
        newTotalPrice = totalPrice;
    }else{
        // throw Error
        newTotalPrice = "You are not eligible for a refund, all check-in date met";
    };

    return(newTotalPrice);
};

// calculate valid days
const calcValidDays = async(checkIn, checkOut)=>{

    // define current date
    const currentDate = moment();

    // define days array
    const days = [];

    // define valid days array
    const validDays = [];

    var checkInDate = checkIn.clone().subtract(1, "days");
    var checkOutDate = checkOut.clone().subtract(1, "days");;

    while(checkInDate.isBefore(checkOutDate)){
        const newDay = checkInDate.clone().add(1, "days");
        days.push({date: newDay});
        checkInDate = newDay;
    };

    // check if each day in days array is valid
    days.forEach((day)=>{
        if(!day.date.isBefore(currentDate)){
            validDays.push(day);
        };
    });

    return(validDays);
};

// account remove wishlist item
app.delete("/account_remove_wishlist_items/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{
        // extract user wishlist
        const { wishList } = await User.findOne({_id: new ObjectId(id)});

        if(array.length !== 0){

            // update wishlist array
            const newWishListArray = wishList.filter((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc.roomId)})[0];

                if(!isIncluded){
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {wishList: newWishListArray}});

        }else{

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {wishList: []}});
        };

        // send response
        res.status(200).json({message: "Removed items successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Could not remove items"});

    };
});


/////////////////////////////////////////////////////////

// account cancel booking
app.post("/account_cancel_bookings", async(req, res)=>{

    // extract array
    const { array } = req.body;

    // define error array
    var errorNum = 0;

    try{

        // define admin bookings
        const adminBookings = [];

        // define i
        var i = 0;

        // start loop
        while(i < array.length){

            // define booking id
            const bookingId = array[i];

            // find admin booking by user booking id
            const adminBooking = await AdminBooking.findOne({userBookingId: bookingId});

            // check status
            if(adminBooking.status != "canceled" && adminBooking.status != "cancel request"){
                // push admin booking to admin bookings
                adminBookings.push(adminBooking);
            };

            // move on to next
            i++;
        };


        // check for loop complete
        if(i == array.length){
            
            // check for admin booking length
            if(adminBookings.length != 0){

                // group admin bookings
                const groupedBookings = await authGroupBooking(adminBookings);

                // check each booking for no refund request existence
                const { newAuthRefundRequestCheckArray, errorAuthRefundRequestCheckArray } = await authRefundRequestCheck(groupedBookings.newArray);

                // update error num
                errorNum += errorAuthRefundRequestCheckArray.length;
                
                // all bookings are not being processed
                if(newAuthRefundRequestCheckArray.length != 0){

                    // receipt auth check
                    const { newAuthReceiptRoomCalcArray, errorAuthReceiptRoomCalcArray } = await authReceiptRoomCalc(newAuthRefundRequestCheckArray, "days");

                    // update error num
                    errorNum += errorAuthReceiptRoomCalcArray.length;

                    // if all bookings have receipts
                    if(newAuthReceiptRoomCalcArray.length != 0){

                        // create admin requests
                        const newAdminRequests = await createAdminRefundRequests(newAuthReceiptRoomCalcArray, "user");

                        // log to console
                        // console.log("cancel bookings", newAdminRequests);

                        // send response
                        res.status(200).json({message: `${errorNum == 0?"Booking canceled successfully":`${newAdminRequests.length} ${newAdminRequests.length > 1?"bookings":"booking"} of ${newAdminRequests.length + errorNum} canceled successfully`}` });

                    }else throw Error("Cancel bookings failed");

                }else throw Error("All bookings scheduled for refund request");

            }else throw Error("Cannot cancel bookings");

        };

    }catch(err){
        console.log(err.message)
        // send response
        res.status(400).json({error: err.message});
    };
});

// create revoke booking cancel request
app.post("/account_revoke_cancel_bookings", async(req, res)=>{

    // extract array
    const { array } = req.body;

    // define error array
    var errorNum = 0;

    try{

        // define admin bookings
        const adminBookings = [];

        // define included bookings
        const includedBookings = [];

        // define room included
        const roomIncluded = [];

        // define i
        var i = 0;

        // start loop
        while(i < array.length){

            // define booking id
            const bookingId = array[i];

            // find admin booking by user booking id
            const adminBooking = await AdminBooking.findOne({userBookingId: bookingId});

            // push to included bookings
            includedBookings.push(adminBooking);

            // find admin transaction with that date and extract the reference
            const { reference } = await AdminTransaction.findOne({date: adminBooking.date});

            // define found refund request
            const foundRefundRequests = [];

            // find all refund requests with that reference
            await AdminRefundRequest.find({reference: reference}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        const { preTransactionRooms } = doc;
                        
                        preTransactionRooms.forEach((room)=>{
                            foundRefundRequests.push(room);
                        });
                    });
                };
            });

            // define p
            var p = 0;

            // start loop for p
            while(p < foundRefundRequests.length){

                // extract props
                const { roomId, checkIn, checkOut } = foundRefundRequests[p];

                // find admin booking
                const foundAdminBooking = await AdminBooking.findOne({roomId: roomId, checkIn: checkIn, checkOut: checkOut});

                // define isIncluded
                const isIncluded = roomIncluded.filter((doc)=>{return(doc.roomId == roomId && doc.checkIn == checkIn && doc.checkOut == checkOut)})[0];

                // define isIncluded array
                const isIncludedArray = includedBookings.filter((doc)=>{return(doc.roomId == roomId && doc.checkIn == checkIn && doc.checkOut == checkOut)})[0];

                // if booking was selected
                if(!isIncluded && isIncludedArray){

                    // push booking to admin booking
                    roomIncluded.push(foundAdminBooking);

                    // push booking to admin booking
                    adminBookings.push(foundAdminBooking);

                    // move on to next
                    p++;

                }else{

                    // move on to next
                    p++;
                };

            };

            // if loop for p is complete
            if(p == foundRefundRequests.length){

                // move on to next
                i++;

            };

        };


        // check for loop complete
        if(i == array.length && adminBookings.length != 0){

            // handle revoke cancel booking
            const { newArray, errorArray } = await HandleRevokeCancelBooking(adminBookings);

            // update error num
            errorNum += errorArray.length

            // send response
            res.status(200).json({message: `Revoked cancel booking for ${newArray} out of ${adminBookings.length} ${adminBookings.length > 1?"bookings":"booking"} successfully`});

        }else throw Error("Cancel request failed");

    }catch(err){
        console.log(err);
        // send error response
        res.status(400).json({error: "Could not revoke cancel booking"});
    };
});

// create refund request
app.post("/account_create_refund_requests", async(req, res)=>{

    // extract array
    const { array } = req.body;

    // define error num
    var errorNum = 0;

    try{

        // define admin bookings
        const adminBookings = [];

        // find all receipts for transactions
        var x = 0;
        
        // start loop for x
        while(x < array.length){

            // define id
            const id = array[x];

            // find receipt id
            const { receiptId, reference } = await AdminTransaction.findOne({userTransactionId: new ObjectId(id)});

            // find receipt based on _id
            const foundReceipt = await AdminReceipt.findOne({_id: new ObjectId(receiptId)});

            // check for found receipt
            if(foundReceipt){

                // extract rooms
                const { rooms } = foundReceipt;

                // find all bookings for rooms ///////////////

                // define found bookings
                const foundAdminBookings = [];

                // define p
                var p = 0;

                // start loop for p
                while(p < rooms.length){

                    // extract room props
                    const { roomId, checkIn, checkOut } = rooms[p];

                    // find doc
                    const foundDoc = await AdminBooking.findOne({roomId: roomId, checkIn: checkIn, checkOut: checkOut});

                    // check status
                    if(foundDoc.status != "canceled" && foundDoc.status != "cancel request"){

                        // push found doc to found admin bookings
                        foundAdminBookings.push(foundDoc);

                    };

                    // move on
                    p++;

                };

                // check for p loop complete, loop through all admin bookings in dound admin bookings
                if(p == rooms.length){

                    // add all bookings to admin bookings
                    foundAdminBookings.forEach((doc)=>{adminBookings.push(doc)});

                };

                // end of find all bookings for rooms //////////

            };

            // move on to next
            x++;

        };

        
        // check for loop complete
        if(x == array.length && adminBookings.length != 0){

            // console.log("admin bookings", adminBookings);

            // group admin bookings
            const groupedBookings = await authGroupBooking(adminBookings);

            // check each booking for no refund request existence
            const { newAuthRefundRequestCheckArray, errorAuthRefundRequestCheckArray } = await authRefundRequestCheck(groupedBookings.newArray);

            // update error num
            errorNum += errorAuthRefundRequestCheckArray.length;
            
            // all bookings are not being processed
            if(newAuthRefundRequestCheckArray.length != 0){

                // receipt auth check
                const { newAuthReceiptRoomCalcArray, errorAuthReceiptRoomCalcArray } = await authReceiptRoomCalc(newAuthRefundRequestCheckArray, "days");

                // update error num
                errorNum += errorAuthReceiptRoomCalcArray.length;

                // if all bookings have receipts
                if(newAuthReceiptRoomCalcArray.length != 0){

                    // create admin requests
                    const newAdminRequests = await createAdminRefundRequests(newAuthReceiptRoomCalcArray, "user");

                    // log to console
                    // console.log("cancel bookings", newAdminRequests);

                    // send response
                    res.status(200).json({message: `${errorNum == 0?"Booking canceled successfully":`${newAdminRequests.length} ${newAdminRequests.length > 1?"bookings":"booking"} of ${newAdminRequests.length + errorNum} canceled successfully`}` });

                }else throw Error("Cancel bookings failed");

            }else throw Error("All bookings already scheduled for refund request");

        }else throw Error("Error: not eligible for refund");

    }catch(err){
        // log error to console
        console.log(err);

        // send error response
        res.status(400).json({error: err.message});
    };

});

// create refund request
app.post("/account_cancel_refund_requests", async(req, res)=>{

    // extract array
    const { array } = req.body;

    // define error num
    var errorNum = 0;

    try{

        // define admin bookings
        const adminBookings = [];

        // find all receipts for transactions
        var x = 0;
        
        // start loop for x
        while(x < array.length){

            // define id
            const id = array[x];

            // find receipt id
            const { reference } = await AdminTransaction.findOne({userTransactionId: new ObjectId(id), status: "Refund request"});

            // define found refund request
            const foundRefundRequests = [];

            // find all refund requests with that reference
            await AdminRefundRequest.find({reference: reference, status: "Refund request", processing: false}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        const { preTransactionRooms } = doc;
                        
                        preTransactionRooms.forEach((room)=>{
                            foundRefundRequests.push(room);
                        });
                    });
                };
            });

            // define p
            var p = 0;

            // start loop for p
            while(p < foundRefundRequests.length){

                // extract props
                const { roomId, checkIn, checkOut } = foundRefundRequests[p];

                // find admin booking
                const foundAdminBooking = await AdminBooking.findOne({roomId: roomId, checkIn: checkIn, checkOut: checkOut});

                // push booking to admin booking
                adminBookings.push(foundAdminBooking);

                // move on to next
                p++;
            };

            // if loop for p is complete
            if(p == foundRefundRequests.length){

                // move on to next
                x++;

            };

        };

        // check for loop complete
        if(x == array.length && adminBookings.length != 0){

            // handle revoke cancel booking
            const { newArray, errorArray } = await HandleRevokeCancelBooking(adminBookings);

            // update error num
            errorNum += errorArray.length

            // send response
            res.status(200).json({message: `Revoked cancel booking for ${newArray} out of ${errorNum + newArray} ${adminBookings.length > 1?"bookings":"booking"} successfully`});

        }else throw Error("Cancel request failed");

    }catch(err){
        // log error to cancel
        console.log(err);

        // send error response
        res.status(400).json({error: "Could not revoke cancel booking"});
    };
});
// ///////////////////////////////////////////////////////////////////////////


// auth group bookings
const authGroupBooking = async(array)=>{

    // define dates array
    const dates = [];

    // define new array
    const newArray = [];

    // define i
    var i = 0;

    while(i < array.length){

        // define doc
        const doc = array[i];

        // extract doc props
        const { date } = doc;

        // check if date has not been included in dates array
        if(!dates.includes(date)){

            // find transactiom with the same date
            const transaction = await AdminTransaction.findOne({date: date});

            // if transaction proceed, else move on
            if(transaction){

                // extract transaction info
                const { reference, userId } = transaction;

                // get all admin booking with that exact date
                const filterArray = array.filter((doc)=>{return(doc.date == date)});

                // define data
                const data = { reference, userId, array: filterArray, bookingDate: date, transactionDate: transaction.date };

                // push data
                newArray.push(data);

                // push date to dates array
                dates.push(date);

                // move on to next
            }else{
                // move on to next
                i++;
            };

        }else{
            // move on to next
            i++;
        };

    };


    // return new array
    return({ newArray });
};

// auth rooms refund request
const authRefundRequestCheck = async(itemsArray)=>{

    // define error array
    const errorArray = [];

    // define new array
    const array = [];

    // define refund request included
    const refundRequestIncluded = [];

    // mapped array items
    const mappedArrayItems = itemsArray.map((doc)=>{

        // extract props
        const { array, reference } = doc;

        return(
            { rooms: array, reference }
        );

    });

    // define i
    var i = 0;

    // start loop
    while(i < mappedArrayItems.length){

        // define refund request array
        const refundRequests = [];

        // define included array
        const includedArray = [];

        // define new array
        const newArray = [];

        // extract props from current item
        const { reference, rooms } = mappedArrayItems[i];

        // find all refund requests with current reference
        await AdminRefundRequest.find({reference: reference}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    refundRequests.push(doc);
                });
            };
        });

        // check for admin refund request length
        if(refundRequests.length != 0){

            // for each refund request execute actions
            refundRequests.forEach((refund_request)=>{

                // extract processing status
                const { processing, type } = refund_request;

                // map refund request pre transaction rooms
                const refundRequestRooms = refund_request.preTransactionRooms
                .map((doc)=>{

                    const { roomId, checkIn, checkOut } = doc;

                    return({ roomId, checkIn, checkOut });
                });

                // for each room in rooms or we can say for each booking in bookings
                rooms.forEach((room)=>{

                    // extract props
                    const { roomId, checkIn, checkOut } = room;

                    // define is included
                    const isIncluded = refundRequestRooms.filter((doc)=>{return(doc.roomId == roomId && doc.checkIn == checkIn && doc.checkOut == checkOut)})[0];

                    // console.log("is included", isIncluded);

                    // check if room is included in an already existing refund request
                    if(isIncluded){

                        // console.log("wow", isIncluded);

                        // check for refund request type
                        if(refund_request.type == "user"){

                            // define new doc
                            const newDoc = { roomId, checkIn, checkOut };

                            // if included, push new doc to included array
                            includedArray.push(newDoc);

                            // push room to error array
                            errorArray.push({ userId: room.userId, array: room });

                        }else if(refund_request.type == "admin" && processing != true){

                            // delete refund request since it was created by admin
                            // especially in the case of network failure to refund
                            // include refund request to be deleted
                            refundRequestIncluded.push(refund_request._id);

                        };

                    }else{
                        // do nothing if room is not included
                    };
                    
                });

                // check for refund request included length
                if(refundRequestIncluded.length != 0 && type == "admin"){

                    // delete all refund request in refund request included array
                    refundRequestIncluded.forEach(async(id)=>{

                        // delete refund request create admin
                        await AdminRefundRequest.deleteOne({_id: new ObjectId(id)});
                        
                    });

                    // log to console
                    console.log(`Deleted ${refundRequestIncluded.length} refund requests by admin`);

                }else{

                    // log to console
                    console.log("no refund request created by admin previously");

                };

            });


            // console.log(i, rooms.length, includedArray.length, rooms.length);

            // check if included array does not contain room in rooms to push to new array
            rooms.forEach((room)=>{
                // extract props
                const { roomId, checkIn, checkOut } = room;

                // define doc
                
                // define doc
                // const doc = { roomId, checkIn, checkOut };

                const isIncluded = includedArray.filter((doc)=>{return(doc.roomId == roomId && room.checkIn == checkIn && room.checkOut == checkOut)})[0];

                // !includedArray.includes(doc)
                // console.log("is included", isIncluded);
                if(!isIncluded){

                    // push room to new array
                    newArray.push(room);
                };
            });

            // extract all props from original doc
            const { reference, userId, bookingDate, transactionDate } = itemsArray[i];

            // create new data
            const newData = { reference, userId, bookingDate, transactionDate, array: newArray };

            // if new array is not empty
            if(newArray.length != 0){

                // push new data to array
                array.push(newData);

            };

            // move on to next
            i++;

        }else{

            // define doc
            const doc = itemsArray[i];

            // push doc to array
            array.push(doc);

            // move on to next
            i++;
        };

    };

    // return new array and error array
    return({ newAuthRefundRequestCheckArray: array, errorAuthRefundRequestCheckArray: errorArray });
};

// auth receipt and calc price
const authReceiptRoomCalc = async(bookingArray, refundCalcType)=>{

    // define error array
    const errorArray = [];

    // define new array
    const newArray = [];


    // define i
    var i = 0;

    while(i < bookingArray.length){

        // define doc
        const doc = bookingArray[i];

        // extract prop
        const { bookingDate, array } = doc;

        // find admin receipt
        const receipt = await AdminReceipt.findOne({date: bookingDate});

        if(receipt){

            // extract receipt prop
            const { rooms } = receipt;

            // check if booking in array is in rooms array of receipt
            const newRoomIds = array.map((doc)=>{return(doc.roomId)});

            // var notIncluded = 0;

            // define new rooms
            const newRooms = rooms.filter((room)=>{
                if(newRoomIds.includes(room.roomId)){
                    return(room);
                };
            });

            // extract doc props
            const { reference, userId } = doc;

            // define transaction
            const transaction = await AdminTransaction.findOne({reference: reference});

            // check if booking in array is valid for refund

            // define x
            var x = 0;

            // define new error array
            const newErrorArray = [];

            // define new refund room
            const newRefundRoom = [];

            // start loop to calc room refund price
            while(x < newRooms.length){
                // define new doc
                const newDoc = newRooms[x];

                // calc refund price
                const refundAmount = await calcRefundPrice([newDoc], refundCalcType);

                // console.log("refund amount", typeof(refundAmount), refundAmount)

                if(typeof(refundAmount) != "string"){
                    // define data
                    const data = { room: newDoc, refundAmount: refundAmount };

                    // if the refund type is valid, push new doc
                    newRefundRoom.push(data);

                    // move on to next
                    x++;
                }else{
                    // increase error points by one
                    newErrorArray.push(newDoc);

                    // move on to next
                    x++;
                };

            };

            // for rooms not valid for refund
            if(x == newRefundRoom.length && newRefundRoom.length != 0){

                // all okay

                // define refund price
                const refundAmount = newRefundRoom.reduce((total, value)=>{
                    return total + value.refundAmount;
                }, 0);

                // define refund rooms array
                const refundRoomsArray = newRefundRoom.map((doc)=>{return(doc.room)});

                // define refund rooms array
                const trackingArray = newRefundRoom.map((doc)=>{

                    // extract props
                    const { roomId, checkIn, checkOut, specialServices, persons, price } = doc.room;

                    // return data
                    return({ roomId, checkIn, checkOut, specialServices, persons, price, refundAmount: doc.refundAmount  })
                });

                // define final refund data
                const finalRefundData = { rooms: refundRoomsArray, refundAmount, transaction, receipt, trackingArray };

                // push doc
                newArray.push(finalRefundData);

                // move on to next
                i++;

            }else{

                // define new error data
                const newErrorData = { userId: doc.userId, array: newErrorArray };

                // push new error data to error array
                errorArray.push(newErrorData);

                // move on to next
                i++;

            };

        }else{

            // increase r error points by one
            errorArray.push({ userId: doc.userId, array: doc.array });

            // move on to next since no receipt
            i++;

        };

    };

    // return new array and error array
    return({ newAuthReceiptRoomCalcArray: newArray, errorAuthReceiptRoomCalcArray: errorArray });
};

// create admin refund requests
const createAdminRefundRequests = async(array, type)=>{

    // define current date
    const currentDate = moment().toISOString();

    // define new array
    const newArray = [];

    // define i
    var i = 0;

    // start loop
    while(i < array.length){

        // define doc
        const doc = array[i];

        // define transaction
        const transaction = doc.transaction;

        // define refund request data
        const newAdminRefundRequestData = {
            userId: transaction.userId,
            userTransactionId: transaction.userTransactionId,
            receiptId: doc.receipt._id,
            email: transaction.email,
            issuedBy: transaction.issuedBy,
            state: transaction.state,
            country: transaction.country,
            phoneNumber: transaction.phoneNumber,
            amount: doc.refundAmount,
            status: "Refund request",
            processing: false,
            reference: transaction.reference,
            preTransactionRooms: doc.rooms,
            rooms: doc.rooms.length,
            trackingArray: doc.trackingArray,
            type: type,
            seen: false,
            date: currentDate
        };

        // create new admin refund request
        const createNewAdminRefundRequest = await AdminRefundRequest.create(newAdminRefundRequestData);

        // find user's transactions and booking
        const { bookings, transactions } = await User.findOne({_id: transaction.userId});

        // update user booking status
        const newBookings = bookings.map((data)=>{

            // extract props
            const { roomId, checkIn, checkOut } = data;

            // define is included
            const isIncluded = doc.rooms.filter((room)=>{return( room.roomId == roomId && room.checkIn == checkIn && room.checkOut == checkOut )})[0];

            // check for is included
            if(isIncluded){

                // define new doc
                const newData = data;

                // set new doc status
                newData.status = "cancel request";

                // return new doc
                return(newData);

            }else{

                // return doc
                return(data);

            };
        });

        // update user transaction status
        const newTransactions = transactions.map((data)=>{

            if(data.reference == transaction.reference){

                // define new doc
                const newData = data;

                // set new doc status
                newData.status = "refund request";

                // return new doc
                return(newData);

            }else{

                // return doc
                return(data);

            };

        });

        // update admin booking
        doc.rooms.forEach(async(data)=>{

            // extract props
            const { roomId, checkIn, checkOut } = data;

            // update admin bookings
            await AdminBooking.updateOne({roomId: roomId, userId: transaction.userId, checkIn: checkIn, checkOut: checkOut}, {$set: {status: "cancel request"}});

        });

        // update admin transaction
        await AdminTransaction.updateOne({reference: transaction.reference}, {$set: {status: "Refund request"}});

        // update user
        await User.updateOne({_id: new ObjectId(transaction.userId)}, {$set: { transactions: newTransactions, bookings: newBookings } });

        // push new refund request to new array
        newArray.push({ adminRefundRequestId: createNewAdminRefundRequest._id, rooms: createNewAdminRefundRequest.preTransactionRooms });

        // move on to next
        i++;
    };

    // return new array
    return(newArray);
};

// handle revoke cancel booking
const HandleRevokeCancelBooking = async(array)=>{

    // define current date
    const currentDate = moment();

    // define new array
    const newArray = [];

    // define error array
    const errorArray = [];

    // define i
    var i = 0;

    // define included
    var included = 0;

    // start loop for i
    while(i < array.length){

        // included refund request
        const includedRefundRequests = [];

        // define pre refund request array
        const preRefundRequestArray = [];

        // define auth refund request passed
        const authRefundRequestPassed = [];

        // extract props
        const { userId, roomId, checkIn, checkOut, date } = array[i];

        // find admin transaction using booking date ///// update this in the future
        const adminTransaction = await AdminTransaction.findOne({date: date});

        // extract reference
        const { reference } = adminTransaction;

        // find all admin refund request by that reference
        await AdminRefundRequest.find({reference: reference}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    // push doc to refund request array
                    preRefundRequestArray.push(doc);
                });
            };
        });

        // define refund request array
        const refundRequestArray = preRefundRequestArray.filter((doc)=>{return(doc.status.toLowerCase() == "refund request")});

        // error refund request
        const errorRefundRequestArray = preRefundRequestArray.filter((doc)=>{return(doc.status.toLowerCase() != "refund request")});

        // check if booking is included in each refund requests and the processing is not true
        refundRequestArray.forEach((refund_request)=>{

            // extract processing status
            const { processing, preTransactionRooms } = refund_request;

            // define is included
            const isIncluded = refund_request.preTransactionRooms.filter((room)=>{return( room.roomId == roomId && room.checkIn == checkIn && room.checkOut == checkOut )})[0];

            // check for is included and processing status
            if(isIncluded && processing == false){

                // only booking in auth passed array can go
                authRefundRequestPassed.push({ _id: array[i]._id, roomId, checkIn, checkOut });

                // push to new array
                newArray.push({ _id: array[i]._id, roomId, checkIn, checkOut });

                // push refund request to included refund request
                includedRefundRequests.push(refund_request._id);

                // manage canceled booking
                preTransactionRooms.forEach((doc)=>{

                    // define is included
                    const isIncluded = array.filter((room)=>{return(room.roomId == doc.roomId && room.checkIn == doc.checkIn && room.checkOut == doc.checkOut)})[0];

                    // conditional statement
                    if(isIncluded){

                        // included increases
                        included++;

                    };

                });

            }else if(isIncluded && processing == true){

                // push to error array
                errorArray.push({ roomId, checkIn, checkOut });

            }else{

                // log to console
                console.log("No refund request for booking");

            };

        });

        //////////////////////////
        
        // find user booking and transaction
        const { bookings, transactions } = await User.findOne({_id: new ObjectId(userId)});

        // update user booking status
        const newBookings = bookings.map((data)=>{

            // define is included
            const isIncluded = array.filter((doc)=>{
                return( doc.userBookingId == data._id )
            })[0];

            // check for is included
            if(isIncluded){

                // define new doc
                const newData = data;

                // get booking state
                const { state } = roomGuardComparison(currentDate, moment(newData.checkIn), moment(newData.checkOut));

                // set new doc status
                newData.status = state;

                // return new doc
                return(newData);

            }else{

                // return doc
                return(data);

            };
        });

        // update admin booking
        bookings.map(async(data)=>{

            // define is included
            const isIncluded = array.filter((doc)=>{
                return( doc.userBookingId == data._id )
            })[0];

            // check for is included
            if(isIncluded){

                // define new doc
                const newData = data;

                // get booking state
                const { state } = roomGuardComparison(currentDate, moment(newData.checkIn), moment(newData.checkOut));

                // update admin bookings
                await AdminBooking.updateOne({userBookingId: data._id }, {$set: {status: state}});
            };
        });

        // if only one item in pretransaction room delete admin refund request, else if more than one, use $pull update
        // update admin refund request
        refundRequestArray.forEach(async(refund_request)=>{

            // extract processing status
            const { _id, processing, trackingArray, preTransactionRooms } = refund_request;

            // define is included
            const isIncluded = preTransactionRooms.filter((room)=>{return( room.roomId == roomId && room.checkIn == checkIn && room.checkOut == checkOut )})[0];

            // check for is included and processing status
            if(isIncluded && processing == false){

                // check for pre transaction rooms length
                if(preTransactionRooms.length > 1){

                    // define filtered array
                    const filteredArray = trackingArray.filter((room)=>{

                        // define is included
                        const isIncluded = array.filter((doc)=>{
                            return( doc.roomId == room.roomId && doc.checkIn == room.checkIn && doc.checkOut == room.checkOut );
                        })[0];

                        // if is included
                        if(!isIncluded){
                            return(room);
                        };
                    });

                    // define filtered pre transaction rooms
                    const filteredPreTransactionRooms = trackingArray.filter((room)=>{

                        // define is included
                        const isIncluded = array.filter((doc)=>{
                            return( doc.roomId == room.roomId && doc.checkIn == room.checkIn && doc.checkOut == room.checkOut );
                        })[0];

                        // if is included
                        if(!isIncluded){
                            return(room);
                        };
                    })
                    .map((doc)=>{

                        // extract props
                        const { roomId, checkIn, checkOut, persons, specialServices, price } = doc;

                        // define new doc
                        const newDoc = { roomId, checkIn, checkOut, persons, specialServices, price };

                        // return new doc
                        return(newDoc);
                    });
                    
                    // define new amount
                    const newAmount = filteredArray.reduce((total, value)=>{
                        return(value.refundAmount + total);
                    }, 0);

                    if(filteredArray.length == 0){
                        // delete the admin refund request based on _id if it's only one item
                        await AdminRefundRequest.deleteOne({_id: new ObjectId(_id)});
                    }else{
                        // pull update on both pretransaction rooms and tracking array
                        await AdminRefundRequest.updateOne({_id: new ObjectId(_id)}, { $set: { amount: newAmount, rooms: filteredArray.length, trackingArray: filteredArray, preTransactionRooms: filteredPreTransactionRooms } });
                    };

                }else{

                    // delete the admin refund request based on _id if it's only one item
                    await AdminRefundRequest.deleteOne({_id: new ObjectId(_id)});

                };

            };

        });
        // end of update admin refund request


        // check for refund request array length and update both user and admin transactions
        // if there's only one refund request with the current reference and it total items in pretransaction rooms array is one
        // set status to success else set it to last refund request status
        // define new refund request array
        const newRefundRequestArray = [];

        // find updated refund request
        await AdminRefundRequest.find({reference: reference, _id: {$nin: includedRefundRequests}}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    newRefundRequestArray.push(doc);  
                });
            };
        });

        // define summation
        const summation = refundRequestArray.reduce((total, value)=>{return(total + value.preTransactionRooms.length)}, 0);

        // if all rooms are being canceled
        if((summation - array.length) == 0 && errorRefundRequestArray.length == 0){

            // update user transaction status
            const newTransactions = transactions.map((data)=>{

                if(data.reference == reference){

                    // define new doc
                    const newData = data;

                    // set new doc status
                    newData.status = "success";

                    // return new doc
                    return(newData);

                }else{

                    // return doc
                    return(data);

                };

            });

            // update user
            await User.updateOne({_id: new ObjectId(userId)}, {$set: { transactions: newTransactions } });

            // update admin transaction
            await AdminTransaction.updateOne({reference: reference}, {$set: {status: "success"}});

        }else{

            // if more than one refund request
            // set both user and admin transaction to the most recent admin refund request status
            if(newRefundRequestArray.length != 0){

                // extract last refund request status
                const { status } = newRefundRequestArray[newRefundRequestArray.length - 1];

                // update user transaction status
                const newTransactions = transactions.map((data)=>{

                    if(data.reference == reference){

                        // define new doc
                        const newData = data;

                        // set new doc status
                        newData.status = status;

                        // return new doc
                        return(newData);

                    }else{

                        // return doc
                        return(data);

                    };

                });

                // update user
                await User.updateOne({_id: new ObjectId(userId)}, {$set: { transactions: newTransactions } });

                // if only one admin refund request, modify transaction status else leave it
                // update admin transaction
                await AdminTransaction.updateOne({reference: reference}, {$set: {status: status}});

            };

        };

        // update user
        await User.updateOne({_id: new ObjectId(userId)}, {$set: { bookings: newBookings } });

        // move on to next
        i++;

    };

    // return data
    return({ newArray: included, errorArray });

};

// mark booking as seen
app.post("/mark_bookings/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{

        // extract user bookings
        const { bookings } = await User.findOne({_id: new ObjectId(id)});

        if(array.length !== 0){

            // update booking array
            const newBookingArray = bookings.map((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc._id)})[0];

                if(isIncluded){
                    const newdoc = doc;
                    newdoc.seen = true;
                    return(newdoc);
                }else{
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {bookings: newBookingArray}});

        }else{
            // update booking array
            const newBookingArray = bookings.map((doc)=>{
                const newdoc = doc;
                newdoc.seen = true;
                return(newdoc);
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {bookings: newBookingArray}});
        };

        // send response
        res.status(200).json({message: "Marked successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Marked failed"});

    };
});

// mark transaction as seen
app.post("/mark_transactions/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{
        // extract user transactions
        const { transactions } = await User.findOne({_id: new ObjectId(id)});

        if(array.length != 0){

            // update transaction array
            const newTransactionArray = transactions.map((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc._id)})[0];

                if(isIncluded){
                    const newdoc = doc;
                    newdoc.seen = true;
                    return(newdoc);
                }else{
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {transactions: newTransactionArray}});

        }else{
            // update transaction array
            const newTransactionArray = transactions.map((doc)=>{
                const newdoc = doc;
                newdoc.seen = true;
                return(newdoc);
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {transactions: newTransactionArray}});
        };

        // send response
        res.status(200).json({message: "Marked successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Marked failed"});

    };
});

// mark receipt as seen
app.post("/mark_receipts/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{
        // extract user receipts
        const { receipts } = await User.findOne({_id: new ObjectId(id)});

        if(array.length !== 0){

            // update receipt array
            const newReceiptArray = receipts.map((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc._id)})[0];

                if(isIncluded){
                    const newdoc = doc;
                    newdoc.seen = true;
                    return(newdoc);
                }else{
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {receipts: newReceiptArray}});

        }else{
            // update receipt array
            const newReceiptArray = receipts.map((doc)=>{
                const newdoc = doc;
                newdoc.seen = true;
                return(newdoc);
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {receipts: newReceiptArray}});
        };

        // send response
        res.status(200).json({message: "Marked successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Marked failed"});

    };
});

// mark message as seen
app.post("/mark_messages/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{
        // extract user messages
        const { messages } = await User.findOne({_id: new ObjectId(id)});

        if(array.length !== 0){

            // update message array
            const newMessageArray = messages.map((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc._id)})[0];

                if(isIncluded){
                    const newdoc = doc;
                    newdoc.seen = true;
                    return(newdoc);
                }else{
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {messages: newMessageArray}});

        }else{
            // update message array
            const newMessageArray = messages.map((doc)=>{
                const newdoc = doc;
                newdoc.seen = true;
                return(newdoc);
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {messages: newMessageArray}});
        };

        // send response
        res.status(200).json({message: "Marked successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Marked failed"});

    };
});

// delete messages
app.delete("/account_delete_messages/:id", async(req, res)=>{
    // user id
    const { id } = req.params;

    // array
    const { array } = req.body;

    try{
        // extract user messages
        const { messages } = await User.findOne({_id: new ObjectId(id)});

        if(array.length !== 0){

            // update message array
            const newMessageArray = messages.filter((doc)=>{

                // is included
                const isIncluded = array.filter((item)=>{return(item == doc._id)})[0];

                if(!isIncluded){
                    return(doc);
                };
            });

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {messages: newMessageArray}});

        }else{

            // update user
            await User.updateOne({_id: new ObjectId(id)}, {$set: {messages: []}});
        };

        // send response
        res.status(200).json({message: "Deleted successfully"});

    }catch(err){

        // send error response
        res.status(400).json({error: "Delete failed"});

    };
});


// end of user account api


// faq api
app.get("/frequently_asked_questions", async(req, res)=>{

    try{

        // define array
        const array = [];

        // find FAQ
        await FAQ.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    array.push(doc);
                });
            };
        });
        
        // send response
        res.status(200).json({message: "All okay", array});

    }catch(err){

        // send response
        res.status(400).json({error: "Could not import docs"});

    };
    
});

app.post("/faq_send_email", async(req, res)=>{

    // extract data
    const { email, message } = req.body;

    try{

        // send email
        const { sent } = await sendEmail(email, process.env.APP_EMAIL, `Frequently asked questions - user ${email}`, message)
        .then(()=>{
            return({ sent: true });
        })
        .catch(()=>{
            return({ sent: false });
        });

        // check for sent status
        if(sent){
            res.status(200).json({message: "Email sent successfully"});
        }else throw Error("Could not send email");

    }catch(err){
        // send error response in errror
        res.status(400).json({error: err.message});
    };
});

// end of faq api



// about us


// import web reviews
app.post("/web_reviews", async(req, res)=>{

    // extract id
    const { id } = req.body;

    try{

        // define array
        const array = [];

        // define new array
        const newArray = [];

        // find web reviews
        await WebReview.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    array.push(doc);
                });
            };
        });

        // find all web review user image
        var i = 0;

        // start loop for i
        while(i < array.length){

            // extract props
            const { userId, rating, comment, date } = array[0];

            // find user image
            const user = await User.findOne({_id: new ObjectId(userId)});

            // check for user
            if(user){

                // extract image
                const { image, name } = user;

                // define new data
                const newData = { userId, name, image, ratingNum: rating, comment, date };

                // push new data to new array
                newArray.push(newData);

                // move on to next
                i++;

            }else{

                // move on to next
                i++;

            };

        };

        // check for loop complete
        if(i == array.length){

            // define web reviews
            const webReviews = newArray.filter((doc)=>{return(doc.userId != id)}).slice(0, 10);

            // define my web review
            const myWebReview = newArray.filter((doc)=>{return(doc.userId == id)})[0];

            // send response
            res.status(200).json({ message: "All okay", webReviews, myWebReview: myWebReview?myWebReview:null });

        };

    }catch(err){

        // send response
        res.status(400).json({ error: "Failed to fetch web reviews" });

    };

});

// submit web review
app.post("/submit_web_review/:id", async(req, res)=>{

    // extract id
    const { id } = req.params;

    // extract data 
    const { rating, comment, date } = req.body;

    // define current date
    const currentDate = moment().toISOString();

    try{

        // find user bookings
        const user = await User.findOne({_id: new ObjectId(id)});

        // check for user
        if(user){

            // find user bookings
            const { bookings, email } = user;

            // define valid booking
            const validBooking = bookings.filter((doc)=>{return(doc.status == "expired")})[0];

            // check for valid booking
            if(validBooking){

                // check for if review by user existed before
                const isIncluded = await WebReview.findOne({userId: new ObjectId(id)});

                // act based on if data existed
                if(!isIncluded){

                    // assemble new data
                    const newData = { userId: id, rating, comment, hidden: false, date };

                    // create new data
                    await WebReview.create(newData);

                    // alert admin on refund processed
                    await createMessage("Web review", "bi bi-star", `User ${email} recently gave House 6 a ${rating} star review.`, currentDate);

                    // alert user on refund processed
                    await createUserMessage(id, "bi bi-star", "Web review", `You recently gave House 6 a ${rating} star review.`, currentDate);

                }else{

                    // update old data
                    await WebReview.updateOne({ userId: id }, { $set: { rating: rating, comment: comment, date: date } });

                };

            }else{
                // throw error
                throw Error("You're not eligible to review website yet");
            };

            // send response
            res.status(200).json({message: "Review submitted successfully"});

        }else{

            // throw error
            throw Error("Login to review website");

        };

    }catch(err){
        
        // send response
        res.status(400).json({error: "Failed to submit review"});

    };

});

// delete web review
app.delete("/delete_web_review/:id", async(req, res)=>{

    // extract id
    const { id } = req.params;

    try{

        // delete web review
        await WebReview.deleteOne({userId: new ObjectId(id)});

        // send response
        res.status(200).json({message: "Review deleted successfully"});

    }catch(err){
        
        // send response
        res.status(400).json({error: "Failed to delete review"});

    };

});

// end of about us api




// admin account api

// process bookings
const processBookings = async(array)=>{

    // define new array
    const newArray = [];

    // define i for while loop
    var i = 0;

    // define while loop
    while(i < array.length){

        const { _id, userId, userBookingId, roomId, checkIn, checkOut, persons, specialServices, expired, status, seen, date  } = array[i];

        // find user name and image
        const user = await User.findOne({_id: new ObjectId(userId)});

        // check for user
        if(user){

            // extract user name
            const { name } = user;

            // find room
            const room = await Room.findOne({_id: new ObjectId(roomId)});

            // check for room
            if(room){

                // extract room images
                const { images } = room;

                if(name && images){
                    // define new doc
                    const newDoc = { _id, name: room.name, userName: name, image: images[0].src, userId, userBookingId, roomId, checkIn, checkOut, persons, specialServices, expired, status, seen, date };

                    // push new doc
                    newArray.push(newDoc);

                    // move on to next
                    i++;
                }else{
                    // move on to next
                    i++;
                };

            }else{

                // move on to next
                i++;

            };

        }else{

            // move on to next
            i++;

        };
        
    };

    if(i == array.length){
        return newArray.reverse();
    };
};

// process transactions
const processTransaction = async(array)=>{
    // define new array
    const newArray = [];

    // define i for while loop
    var i = 0;

    // define while loop
    while(i < array.length){

        const { _id, userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen, date  } = array[i];

        // find user name and image
        const user = await User.findOne({email: email});
        
        if(user){
            // find user
            const { name, image } = user;

            // define new doc
            const newDoc = { _id, name, image, userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen, date };

            // push new doc
            newArray.push(newDoc);

            // move on to next
            i++;
        }else{
            // move on to next
            i++;
        };
    };

    if(i == array.length){
        return newArray.reverse();
    };
};

// process receipts
const processReceipt = async(array)=>{
    // define new array
    const newArray = [];

    // define i for while loop
    var i = 0;

    // define while loop
    while(i < array.length){

        const { _id, userId, userReceiptId, email, issuedBy, state, country, phoneNumber, amount, rooms, seen, date  } = array[i];

        // find user name and image
        const user = await User.findOne({email: email});
        
        if(user){
            // find user
            const { name, image } = user;

            // define new doc
            const newDoc = { _id, name, image, userId, userReceiptId, email, issuedBy, state, country, phoneNumber, amount, rooms, seen, date };

            // push new doc
            newArray.push(newDoc);
            
            // move on to next
            i++;
        }else{
            // move on to next
            i++;
        };
    };

    if(i == array.length){
        return newArray.reverse();
    };
};

// user's activity array
const activityArrayAdmin = async()=>{
    
    const array = [];
    const bookings = [];
    const transactions = [];
    const refundRequests = [];
    const receipts = [];
    const messages = [];


    await AdminBooking.find({}, (err, data)=>{if(!err){data.forEach(doc =>{ if(doc.seen == false){ bookings.push(doc) } })}});
    await AdminTransaction.find({}, (err, data)=>{if(!err){data.forEach(doc =>{ if(doc.seen == false){ transactions.push(doc) } })}});
    await AdminRefundRequest.find({}, (err, data)=>{if(!err){data.forEach(doc =>{ if(doc.seen == false){ refundRequests.push(doc) } })}});
    await AdminReceipt.find({}, (err, data)=>{if(!err){data.forEach(doc =>{ if(doc.seen == false){ receipts.push(doc) } })}});
    await Message.find({}, (err, data)=>{if(!err){data.forEach(doc =>{ if(doc.seen == false){ messages.push(doc) } })}});
    

    if(bookings.length > 0){
        array.push(2);
    };

    if(transactions.length > 0){
        array.push(5);
    };

    if(refundRequests.length > 0){
        array.push(5);
    };

    if(receipts.length > 0){
        array.push(6);
    };

    if(messages.length > 0){
        array.push(8);
    };

    return(array);
};

// user activity array api
app.get("/admin_activity_array", async(req, res)=>{
    try{
        const activityArray = await activityArrayAdmin();

        res.status(200).json({message: "all okay", activityArray});
    }catch(err){
        console.log(err);
        res.status(400).json({error: "error"});
    };
});

// import admin dashboard data
app.post("/import_admin_dashboard_data", async(req, res)=>{
    // extract admin id
    const { adminId } = req.body;

    try{
        // find admin 
        const admin = await Admin.findOne({_id: new ObjectId(adminId)});

        // chart data array
        const chartData = [];
        const chartDataProcessed = [];
        const statisticsDataUsers = [];

        // define users array
        const users = []; 

        // define booking array
        const bookings = [];

        // define transaction array
        const transactions = [];

        // define receipt array
        const receipts = [];

        // create chart data
        await AdminBooking.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    if(doc.status != "canceled"){
                        const { date, roomId, userId, } = doc;
                        chartData.push({ date, roomId, userId, sale: 1});
                        bookings.push(doc);
                    };
                });
            };
        });

        // define i for while loop
        var i = 0;

        // process chart data
        while(i < chartData.length){
            const { date, roomId, userId } = chartData[i];

            // find admin receipt
            const adminReceipt =  await AdminReceipt.findOne({userId: userId, date: date})

            if(adminReceipt){

                const { rooms } = adminReceipt;
        
                if(rooms){
                    const amount = rooms.filter((room)=>{return(room.roomId == roomId)})
                    .reduce((total, value)=>{
                        const { _id, checkIn, checkOut, roomId, persons, specialServices, price } = value;
                        const checkInDate = moment(checkIn);
                        const checkOutDate = moment(checkOut);

                        const days = checkOutDate.diff(checkInDate, "days");

                        const preItemPrice = price * persons * days;

                        var newAmount = 0;

                        if(specialServices == true){
                            const percentage = (preItemPrice/100) * 5;
                            newAmount = preItemPrice + percentage;
                        }else{
                            newAmount = preItemPrice;
                        };

                        return(newAmount + total);
                    }, 0);

                    chartDataProcessed.push({userId, roomId, date, amount});

                    i++;
                };

            }else{
                // move on to next if receipt wasn't found
                i++;
            };
        };

        // find users
        await User.find({}, (err, data)=>{
            if(!err){
                data.reverse().forEach((doc)=>{
                    const { dateOfCreation } = doc;
                    users.push(doc);
                    statisticsDataUsers.push({date: dateOfCreation});
                });
            };
        });

        // find admin transactions
        await AdminTransaction.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    transactions.push(doc);
                });
            };
        });

        // find admin receipts
        await AdminReceipt.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    receipts.push(doc);
                });
            };
        });

        // process bookings
        const newBookings = await processBookings(bookings);

        // process transaction
        const newTransactions = await processTransaction(transactions);

        // process receipts
        const newReceipts = await processReceipt(receipts);

        res.status(200).json({message: "Import succesfull", admin, users: users.reverse().slice(0, 3), bookings: newBookings.slice(0, 3), transactions: newTransactions.slice(0, 3), receipts: newReceipts.slice(0, 3), chartData: chartDataProcessed, statisticsDataUsers, totalUsers: users.length});
    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not import dashboard data"});
    };
});

// upload admin image function
const storageAdmin = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, "./admin_images");
    },
    filename: function (req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

// upload admin
const uploadAdmin = multer({storage: storageAdmin});

// upload user image
app.post("/upload_admin_image/:id", uploadAdmin.single("image"), async(req, res)=>{
    try{
        // extract user id
        const { id } = req.params;
        // extract image name
        const imageName = `${req.file.filename}`;
        
        // previous image
        const { image } = await Admin.findOne({_id: new ObjectId(id)});
        // delete previous image if image is not default image
        if(image !== "no_image.png"){
            const deletePreviousImage = fs.unlinkSync(`./admin_images/${image}`, (err)=>{
                if(!err){
                    console.log("deleted");
                }else{
                    console.log(err);
                };
            });
        };
        // update user
        const action = await Admin.updateOne({_id: new ObjectId(id)}, {$set: {image: imageName}});
        // server response + send image
        res.status(200).json({message:"Image upload successful !"});
    }catch(err){
        console.log(err);
        res.status(400).json({error:"Image upload failed !"});
    };
});

// delete user's image
app.delete("/delete_admin_image/:id", async(req, res)=>{
    try{
        // extract user id
        const { id } = req.params;

        // extract admin image from request body
        const { image } = req.body;

        // make sure image is not default image
        if(image && image != "no_image.png"){

            // delete image
            const deleteImage = fs.unlinkSync(`./admin_images/${image}`, (err)=>{
                if(!err){
                    console.log("deleted");
                }else{
                    console.log(err);
                };
            });
            // update user
            const action = await User.updateOne({_id: new ObjectId(id)}, {$set: {image: "no_image.png"}});

            // server response + default image
            res.status(200).json({message:"Image successfully deleted !"});

        }else throw Error("Cannot delete default image");
    }catch(err){
        res.status(400).json({error:"Could not delete image !"});
    };
});

// send admin image
app.get("/send_image_admin/:id", async(req, res)=>{
    try{
        const { id } = req.params;
        const image = path.join(__dirname, "admin_images", id);
        res.status(200).sendFile(image);
    }catch(err){
        res.status(400).json({error: err.message});
    };
});


// upload RoomMedia function
const newRoomMediaStorage = multer.diskStorage({
    destination: function (req, file, cb){
        if(file.mimetype.startsWith("image/")){
            cb(null, "./room_images");
        }else if(file.mimetype.startsWith("video/")){
            cb(null, "./room_videos");
        };
    },
    filename: function (req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

// new room upload
const newRoomMediaUpload = multer({storage: newRoomMediaStorage});

// upload room
app.post("/upload_new_room", newRoomMediaUpload.array("files"), async(req, res)=>{

    // current date
    const currentDate = moment().toISOString();

    // extract json by parsing request body.form data field name
    const data = JSON.parse(req.body.data);

    // define files
    const files = req.files;

    // extract files
    const { name, description, services, specialServices, location, latitude, longitude, price } = data; 

    try{
        // images array
        const images = files.filter((file)=>{return(file.mimetype.startsWith("image/"))})
        .map((doc, index)=>{
            if(index == 0){
                return({src: doc.filename, status: "primary"});
            }else{
                return({src: doc.filename, status: "secondary"});
            };
        });

        // video
        const video = files.filter((file)=>{return(file.mimetype.startsWith("video/"))})
        .map((doc)=>{return({src: doc.filename})})[0];

        // define new room
        const newRoom = { name, images, description, price: {person: 1, amount: price}, services, special_services: specialServices, video, booked: false, pendingState: false, booking_count: [], ratings: [], booking_requests: [], location: { name: location, map: { co_ordinates: { latitude, longitude } } }, notifications: [], date: currentDate };

        // create new room
        await Room.create(newRoom);

        // send response
        res.status(200).json({message: "Upload successful"});
    }catch(err){
        res.status(400).json({error: "Upload failed"});
    };
});

// admin import rooms
app.get("/admin_import_rooms", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];

        // define pre new array
        const preNewArray = [];

        // define key words array
        const keyWords = [];

        // find docs
        if(filter == "Top rooms"){
             await Room.find({}, (err, data)=>{
                if(!err){
                    const newData = [];

                    data.forEach((doc)=>{ 
                        newData.push(doc);
                    });

                    newData
                    .sort((a, b)=> b.booking_count.length - a.booking_count.length)
                    .forEach((doc)=>{
                        array.push(doc);
                    })
                };
            }); 
        }else if(filter == "Booked rooms"){
            await Room.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{ 
                        if(filter == "Booked rooms"){
                            if(doc.booked == true){
                                array.push(doc);
                            };
                        };
                    });
                };
            }); 
        }else if(filter == "Bookings"){
            await AdminBooking.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{ 
                        array.push(doc);
                    });
                };
            }); 
        }else{
            await Room.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{ 
                        array.push(doc);
                    });
                };
            }); 
        };

        // process array
        
        if(filter == "Bookings"){

            var i = 0;

            while(i < array.length){

                const doc = array[i];

                // destructure admin bookings
                const { _id, userId, userBookingId, roomId, checkIn, checkOut, persons, specialServices, expired, seen, status, date } = doc;

                // find user details
                const user = await User.findOne({_id: new ObjectId(userId)});

                // if user does not exist
                if(user){
                    // find user
                    const { name, email } = user;

                    // find room details
                    const foundRoom = await Room.findOne({_id: new ObjectId(roomId)});

                    if(foundRoom){

                        // extract images
                        const { images } = foundRoom;

                        // check all data
                        if(name && email && images){

                            // define doc
                            const newDoc = { _id, userId, userBookingId, roomId, roomName: foundRoom.name, name, email, image: images[0].src, checkIn, checkOut, persons, specialServices, expired, seen, status, date };
                            
                            // define new key word
                            const newKeyWord = {keyWord: `${name} ${email} ${moment(checkIn).format("MMM DD")} ${moment(checkOut).format("MMM DD")} ${status} ${moment(date).format("MMM DD")}`, _id};

                            // push new doc
                            preNewArray.push(newDoc);

                            // push new key word
                            keyWords.push(newKeyWord);

                            // next doc
                            i++;
                        };

                    }else{

                        // move on to next
                        i++;

                    };

                }else{
                    // move on to next
                    i++;
                };
                    
            };

        }else{

            var i = 0;

            while(i < array.length){

                const doc = array[i];

                const { _id, name, images, description, price, services, special_services, video, booked, booking_count, booking_requests, ratings, location, notifications, date } = doc;

                const ratingsArray = [];

                const validBookingArray = [];

                const notificationArray = [];


                // build valid booking
                var b = 0;

                while(b < booking_count.length){

                    // extract props
                    const { user_id, check_in, check_out, expired, special_services, date } = booking_count[b];

                    // find user
                    const user = await User.findOne({_id: new ObjectId(user_id)});
                    
                    if(user){
                        // find user
                        const { name, image } = user;

                        // assemble new data
                        const newData = { name, image, user_id, check_in, check_out, special_services, days: moment(check_out).diff(check_in, "days"), expired, date };

                        // push new data
                        validBookingArray.push(newData);

                        // move on to next
                        b++;
                    }else{
                        // move on to next
                        b++;
                    };
                };

                // build notification
                var n = 0;

                while(n < notifications.length){

                    // extract props
                    const { user_id } = notifications[n];

                    // find user
                    const user = await User.findOne({_id: new ObjectId(user_id)});

                    if(user){
                        // find user
                        const { name, image, email, phoneNumber } = user;

                        // assemble new data
                        const newData = { user_id, name, image, email, phoneNumber };

                        // push new data
                        notificationArray.push(newData);

                        // move on to next
                        n++;
                    }else{
                        // move on to next
                        n++;
                    };
                };

                // build ratings
                var r = 0;

                while(r < ratings.length){
                    const { user_id, rating, date, comment } = ratings[r];
                    const user = await User.findOne({_id: new ObjectId(user_id)});
                    if(user){
                        const { name, image } = user;
                        const newRating = { user_id, name, image, rating, date, comment};
                        ratingsArray.push(newRating);
                        r++;
                    }else{
                        r++;
                    };
                };

                // if all ratings are complete
                if(ratings.length == ratingsArray.length){
                    // calc average ratings
                    const averageRating = calcAverageRating(ratings);
    
                    if(averageRating.averageRating){
                        // push new data
                        const data = { _id, name, images, description, averageRating, price, services, special_services, video, booked, booking_count: validBookingArray, booking_requests, ratings: ratingsArray, location, notifications: notificationArray, date };

                        // define new key word
                        const newKeyWord = {keyWord: `${name} ${booked == true? "reserved":"open"} ${location.name} ${date}`, _id};

                        // push new key word
                        keyWords.push(newKeyWord);
                
                        preNewArray.push(data);
                    }else{
                        // push new data
                        const data = { _id, name, images, description, averageRating: {averageRating: 0}, price, services, special_services, video, booked, booking_count: validBookingArray, booking_requests, ratings: ratingsArray, location, notifications: notificationArray, date };
                        preNewArray.push(data);

                        // define new key word
                        const newKeyWord = {keyWord: `${name} ${booked == true? "reserved":"open"} ${location.name} ${date}`, _id};

                        // push new key word
                        keyWords.push(newKeyWord);
                    };

                    i++;
                };
                
            };

        };

        // create new array
        const newArray = preNewArray.reverse().slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not import doc"});
    };
});

// admin modify room
app.post("/admin_modify_room/:id", async(req, res)=>{

    // queries
    const { id } = req.params;

    // extract data
    const { data } = req.body;

    try{
        // extract data prop
        const { name, description, services, special_services, location, latitude, longitude, price } = data;

        // define new data
        const newData = { name, description, services, special_services, location: { name: location, map: { co_ordinates: { latitude, longitude } } }, price: { amount: price, person: 2} };

        // update room
        await Room.updateOne({_id: new ObjectId(id)}, {$set: newData });

        // send response and documents
        res.status(200).json({message: "Modified successful"});

    }catch(err){
        res.status(400).json({error: "Could not delete room"});
    };
});

// admin modify room images
app.post("/admin_modify_room_images/:id", newRoomMediaUpload.array("files"), async(req, res)=>{

    // extract id
    const { id } = req.params;

    // define files
    const files = req.files;

    try{
        // images array
        const newImages = files.filter((file)=>{return(file.mimetype.startsWith("image/"))})
        .map((doc, index)=>{
            if(index == 0){
                return({src: doc.filename, status: "primary"});
            }else{
                return({src: doc.filename, status: "secondary"});
            };
        });

        // find room previous images
        const { images } = await Room.findOne({_id: new ObjectId(id)});

        // delete previous room images
        images.forEach((doc)=>{

            // exyract src
            const { src } = doc;

            // delete room image
            fs.unlinkSync(`./room_images/${src}`, (err)=>{
                if(err){
                    console.log("deletion_error",err);
                }else{
                    console.log("file deleted");
                };
            });

        });

        // update room
        await Room.updateOne({_id: new ObjectId(id)}, {$set: { images: newImages }});

        // send response
        res.status(200).json({message: "Images updated successful"});
    }catch(err){
        res.status(400).json({error: "Could not update images successfully"});
    };
});

// admin modify room video
app.post("/admin_modify_room_video/:id", newRoomMediaUpload.array("files"), async(req, res)=>{

    // extract id
    const { id } = req.params;

    // define files
    const files = req.files; 

    try{

        // video
        const newVideo = files.filter((file)=>{return(file.mimetype.startsWith("video/"))})
        .map((doc)=>{return({src: doc.filename})})[0];

        //  find previous room video
        const { video } = await Room.findOne({_id: new ObjectId(id)});

        // delete previous room video
        fs.unlinkSync(`./room_videos/${video.src}`, (err)=>{
            if(err){
                console.log("deletion_error",err);
            }else{
                console.log("file deleted");
            };
        });

        // update room
        await Room.updateOne({_id: new ObjectId(id)}, {$set: { video: newVideo }});

        // send response
        res.status(200).json({message: "Video updated successfully"});
    }catch(err){
        res.status(400).json({error: "Could not update video"});
    };
});

// admin delete rooms
app.delete("/admin_delete_rooms", async(req, res)=>{

    // define array
    const { array } = req.body;

    try{
        
        // define error points
        var errorPoints = 0;

        // define i
        var i = 0;
        
        // while loop
        while(i < array.length){

            // define doc
            const id = array[i];

            // console.log(id);

            // define room booking count
            const { images, video, booking_count } = await Room.findOne({_id: new ObjectId(id)});

            // filter booking count for expired false
            const validBookings = booking_count.filter((doc)=>{return(doc.expired == false)});

            if(validBookings.length == 0){

                // delete room
                await Room.deleteOne({_id: new ObjectId(id)});

                // delete room images
                images.forEach((doc)=>{

                    // exyract src
                    const { src } = doc;

                    // delete room image
                    fs.unlinkSync(`./room_images/${src}`, (err)=>{
                        if(err){
                            console.log("deletion_error",err);
                        }else{
                            console.log("file deleted");
                        };
                    });

                });

                // delete room video
                fs.unlinkSync(`./room_videos/${video.src}`, (err)=>{
                    if(err){
                        console.log("deletion_error",err);
                    }else{
                        console.log("file deleted");
                    };
                });

                // move on to next
                i++;

            }else{
                // move on to next
                i++;

                // increase error points by one
                errorPoints++;
            
            };
        };

        // check for loop complete
        if(i == array.length){
            if(errorPoints != array.length){

                if(errorPoints == 0){
                    // send response
                    res.status(200).json({message: `Deleted ${array.length - errorPoints} rooms out of ${array.length} rooms`});
                }else{
                    // send response
                    res.status(200).json({message: `Deleted ${array.length - errorPoints} rooms out of ${array.length} rooms, pls cancel booking to delete rooms`});
                };
                
            }else{
                throw Error("Could not delete doc, pls cancel all bookings");
            };
        };
       
    }catch(err){
        console.log("error", err);
        res.status(400).json({error: `could not delete docs`});
    };
});

// admin cancel booking brute force
app.get("/admin_cancel_booking_brute_force/:id", async(req, res)=>{

    // define admin booking id
    const { id } = req.params;

    try{
        // find admin booking and extract info
        const { userId, userBookingId, roomId, checkIn, checkOut } = await AdminBooking.findOne({_id: new ObjectId(id)});

        // find user's booking
        const { bookings } = await User.findOne({_id: new ObjectId(userId)});

        // find room
        const room = await Room.findOne({_id: new ObjectId(roomId)});

        // define new user bookings
        const newUserBookings = bookings.map((doc)=>{
            if(doc._id == userBookingId){
                const newDoc = doc;
                newDoc.status = "canceled";
                newDoc.expired = true;
                return(newDoc);
            }else{
                return(doc);
            };
        });

        // cancel room booking
        const newRoomBookings = room.booking_count.map((doc)=>{
            if(doc.user_id == userId && doc.check_in == checkIn && doc.check_out == checkOut){
                const newDoc = doc;
                newDoc.expired = true;
                return(newDoc);
            }else{
                return(doc);
            };
        });

        // update user
        await User.updateOne({_id: new ObjectId(userId)}, {$set: { bookings: newUserBookings } });

        // update rooms
        await Room.updateOne({_id: new ObjectId(roomId)}, { $set: { booking_count: newRoomBookings } });

        // update admin booking
        await AdminBooking.updateOne({_id: new ObjectId(id)}, { $set: { status: "canceled", expired: true } });

        // send response
        res.status(200).json({message: "Canceled booking successfully"});

    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// admin cancel bookings ////////////////////////
app.post("/admin_cancel_bookings", async(req, res)=>{

    // define array
    const { array, refundCalcType } = req.body;

    try{

        // define new array
        const newArray = [];

        // find each admin booking

        // define i
        var i = 0;

        // start loop for i
        while(i < array.length){

            // define id
            const id = array[i];

            // find admin booking
            const foundDoc = await AdminBooking.findOne({_id: new ObjectId(id)});

            // check status
            if(foundDoc.status != "canceled"){

                // push found to new array
                newArray.push(foundDoc);

            };

            // move on to next
            i++;

        };

        // end of find each admin booking


        // check for loop complete
        if(i == array.length){

            // check for new array length
            if(newArray.length != 0){

                // action
                const { newAdminRequestsArray, errorNum } = await HandleCancelBooking(newArray, refundCalcType, "admin");

                console.log(errorNum, newAdminRequestsArray);
                
                // check error message

                if(newAdminRequestsArray.length != 0){

                    // initialize paystack refund
                    await initializeRefundPaystack("single", newAdminRequestsArray, res);

                    // console.log("refund array", adminRefundRequestId);
                    // res.status(200).json({message: "all okay"});

                }else throw Error("All bookings expired");

            }else throw Error("Cannot refund bookings");
        };
       
    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// admin cancel all room bookings //////////////////////////
app.post("/admin_cancel_all_room_booking/:id", async(req, res)=>{

    // define id
    const { id } = req.params;

    // extract refund calc type
    const { refundCalcType } = req.body;

    try{

        // define new array
        const newArray = [];

        // find room booking count
        const { booking_count } = await Room.findOne({_id: new ObjectId(id)});

        // for each booking in booking count, find admin booking

        // define i
        var i = 0;

        // start loop for i
        while(i < booking_count.length){

            // extract props
            const { check_in, check_out } = booking_count[i];

            // find admin booking
            const foundDoc = await AdminBooking.findOne({ roomId: id, checkIn: check_in, checkOut: check_out, expired: false});

            // check status
            if(foundDoc.status != "canceled"){

                // push found to new array
                newArray.push(foundDoc);

            };

            // move on to next
            i++;

        };
        
        // end of for each booking in booking count, find admin booking

        // check for loop for i for complete
        if(i == booking_count.length){

            // log to console
            console.log(refundCalcType, newArray);

            // check for new array length
            if(newArray.length != 0){

                // cancel bookings
                const { newAdminRequestsArray, errorNum } = await HandleCancelBooking(newArray, refundCalcType);

                // check for new admin request array length
                if(newAdminRequestsArray.length != 0){

                    // initialize paystack refund
                    await initializeRefundPaystack("single", newAdminRequestsArray, res);

                    // res.status(200).json({message: "all okay"});

                }else throw Error("All bookings expired");

            }else throw Error("Cannot cancel bookings");
        };

    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// mark booking as seen
app.get("/admin_mark_booking_seen/:id", async(req, res)=>{
    const { id } = req.params;
    try{
        // update doc
        await AdminBooking.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

        // send response
        res.status(200).json({message: "update doc successfully"});
    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };
});

// mark bookings as seen
app.post("/admin_mark_bookings_seen", async(req, res)=>{

    // define array
    const { array } = req.body;

    try{
        
        if(array.length == 0){

            // update docs
            await AdminBooking.updateMany({}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update docs successfully"});

        }else{

            // define i
            var i = 0;
            
            // while loop
            while(i < array.length){
                // define doc
                const doc = array[i];

                // update docs
                await AdminBooking.updateOne({_id: new ObjectId(doc._id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            if(i == array.length){
                // send response
                res.status(200).json({message: "update docs successfully"});
            };
        };
       
    }catch(err){
        res.status(400).json({error: "could not update docs"});
    };
});

// admin refund user transaction ////////////////////////
app.post("/admin_refund_user_transactions", async(req, res)=>{

    // extract refund calc type
    const { refundCalcType, array } = req.body;

    try{

        // define new array
        const newArray = [];

        // find each admin booking

        // define i
        var i = 0;

        // start loop for i
        while(i < array.length){

            // define id
            const id = array[i];

            // find admin booking
            const { date } = await AdminTransaction.findOne({_id: new ObjectId(id)});

            // find admin receipt
            const foundReceipt = await AdminReceipt.findOne({date: date});

            // if found receipt
            if(foundReceipt){

                // extract rooms
                const { rooms } = foundReceipt;

                // for each item in room, find admin booking

                // define x
                var x = 0;

                // start loop for x
                while(x < rooms.length){

                    // extract props from current room
                    const { roomId, checkIn, checkOut } = rooms[x];

                    // find admin booking
                    const foundDoc = await AdminBooking.findOne({ roomId: roomId, checkIn: checkIn, checkOut: checkOut });

                    // check status
                    if(foundDoc.status != "canceled"){

                        // push found to new array
                        newArray.push(foundDoc);

                    };

                    // move on to next
                    x++;

                };

                // check for loop for x complete
                if(x == rooms.length){

                    // move on to next
                    i++;

                };

                // end of for each item in room, find admin booking

            }else{

                // move on to next
                i++;

            };

        };

        // end of find each admin booking

        // check for loop for i complete
        if(i == array.length){

            // check status new array length
            if(newArray.length != 0){

                // action
                const { newAdminRequestsArray, errorNum } = await HandleCancelBooking(newArray, refundCalcType, "admin");

                console.log(errorNum, newAdminRequestsArray);

                // check for new admin request array length
                if(newAdminRequestsArray.length != 0){

                    // initialize paystack refund
                    await initializeRefundPaystack("single", newAdminRequestsArray, res);

                    // res.status(200).json({message: "all okay"});

                }else throw Error("All bookings expired");

            }else throw Error("Cannot cancel bookings");

        };
        
    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});

// handle cancel booking 
const HandleCancelBooking = async(array, refundCalcType, refundRequestType)=>{

    // define error array
    var errorNum = 0;

    // define new admin refund request array
    var newAdminRequestsArray = [];

    // group admin bookings
    const groupedBookings = await authGroupBooking(array);

    // check each booking for no refund request existence
    const { newAuthRefundRequestCheckArray, errorAuthRefundRequestCheckArray } = await authRefundRequestCheck(groupedBookings.newArray);

    // update error num
    errorNum += errorAuthRefundRequestCheckArray.length;
    
    // all bookings are not being processed
    if(newAuthRefundRequestCheckArray.length != 0){

        // receipt auth check
        const { newAuthReceiptRoomCalcArray, errorAuthReceiptRoomCalcArray } = await authReceiptRoomCalc(newAuthRefundRequestCheckArray, refundCalcType);

        // update error num
        errorNum += errorAuthReceiptRoomCalcArray.length;

        // if all bookings have receipts
        if(newAuthReceiptRoomCalcArray.length != 0){

            // create admin requests
            const newAdminRequests = await createAdminRefundRequests(newAuthReceiptRoomCalcArray, refundRequestType);

            // push in refund request in new admin refund request to new admin refund request array
            newAdminRequests.forEach((doc)=>{newAdminRequestsArray.push(doc)});

        };

    };

    // return data
    return { errorNum, newAdminRequestsArray };

};

// admin import users 
app.get("/admin_import_users", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];
        
        // define prearray
        const preArray = [];

        // define key words array
        const keyWords = [];

        // find docs
        await User.find({}, (err, data)=>{
            if(!err){
                data.reverse().forEach((doc)=>{
                    if(filter == "New"){
                        if(doc.seen == false){
                            array.push(doc)
                        };
                    }else{
                        array.push(doc);
                    };
                });
            };
        });

        // create pre array
        var i = 0;

        while(i < array.length){

            const user = array[i];
            const { wishList, bookings } = user;
            const wishListArray = [];
            const bookingArray = [];

            // create user wishlist item
            var r = 0;
            while(r < wishList.length){

                const { _id, roomId } = wishList[r]; 

                const room = await Room.findOne({_id: new ObjectId(roomId)});

                if(room){

                    const { name, images, booked, price } = room;

                    if(name, images){
                        const newItem = { _id, name, image: images[0].src, roomId, booked, price: price.amount};
                        wishListArray.push(newItem);
                        r++;
                    };
                }else{
                    r++;
                };

            };

            // create user booking
            var b = 0;
            while(b < bookings.length){

                const { _id, roomId, checkIn, checkOut, persons, specialServices, status, expired } = bookings[b]; 

                const room = await Room.findOne({_id: new ObjectId(roomId)});
              
                if(room){
                    const { name, images} = room;

                    if(name, images){
                        const newItem = { _id, name, image: images[0].src, roomId, checkIn, checkOut, persons, specialServices, status, expired };
                        bookingArray.push(newItem);
                        b++;
                    };
                }else{
                    b++;
                };

            };
            
            // if both wishlist and booking has been created add user to preArray
            if(r == wishList.length && b == bookings.length){
                // extract user info
                const { _id, name, image, email, state, country, address, phoneNumber, dateOfCreation } = user;

                // define new user
                const newUser = { _id, name, email, image, state, country, phoneNumber, wishList: wishListArray, bookings: bookingArray, address, phoneNumber, dateOfCreation };
                
                // define new key word
                const newKeyWord = {keyWord: `${name} ${email} ${country} ${state} ${address} ${moment(dateOfCreation).format("MMM DD")}`, _id};
                
                // push new user
                preArray.push(newUser);

                // push new key word
                keyWords.push(newKeyWord);

                // move on to next user
                i++;
            };
        };

        // create new array
        const newArray = preArray.slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        if(i == array.length){
            // send response and documents
            res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});
        };

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not import doc"});
    };
});

// admin delete user
app.delete("/admin_delete_users", async(req, res)=>{

    // queries
    const { array } = req.body;

    try{
        // define error points
        var errorPoints = 0;

        // define i
        var i = 0;
        
        // while loop
        while(i < array.length){
            // define doc
            const id = array[i];

            // define user bookings
            const { bookings } = await User.findOne({_id: new ObjectId(id)});

            // filter bookings for expired false
            const validBookings = bookings.filter((doc)=>{return(doc.expired == false)});

            if(validBookings.length == 0){

                // find user image
                const { image } = await User.findOne({_id: new ObjectId(id)});

                // delete user image
                // make sure image is not default image
                if(image && image != "no_image.png"){

                    // delete image
                    const deleteImage = fs.unlinkSync(`./user_images/${image}`, (err)=>{
                        if(!err){
                            console.log("deleted");
                        }else{
                            console.log(err);
                        };
                    });
                };    

                // delete room
                await User.deleteOne({_id: new ObjectId(id)});

                // move on to next
                i++;

            }else{
                // move on to next
                i++;

                // increase error points by one
                errorPoints++;
            
            };
        };

        // check for loop complete
        if(i == array.length){
            if(errorPoints != array.length){

                if(errorPoints == 0){
                    // send response
                    res.status(200).json({message: `Deleted ${array.length - errorPoints} users out of ${array.length} users`});
                }else{
                    // send response
                    res.status(200).json({message: `Deleted ${array.length - errorPoints} users out of ${array.length} users, pls cancel booking to delete users`});
                };
                
            }else{
                throw Error("Could not delete users");
            };
        };

    }catch(err){
        res.status(400).json({error: "Could not delete users"});
    };
});

// admin import admin requests
app.get("/admin_import_admin_requests", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint } = req.query;

    try{
        // define doc array
        const array = [];

        // find docs
        await AdminRequest.find({}, (err, data)=>{
            if(!err){
                data.forEach((doc)=>{
                    array.push(doc);
                });
            };
        });

        // create new array
        const newArray = array.slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// admin import admins
app.get("/admin_import_admins", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];

        // define key words array
        const keyWords = [];

        // find docs
        if(filter === "Admin requests"){
            await AdminRequest.find({}, (err, data)=>{
                if(!err){
                    data.reverse().forEach((doc)=>{
                        array.push(doc)
                    });
                };
            });
        }else{
            await Admin.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        array.push(doc)
                    });
                };
            });
        };

        // create new array
        const newArray = array.slice(startpoint, endpoint);

        // define i
        var i = 0;

        while(i < newArray.length){
            
            if(filter !== "Admin requests"){

                // extract admin info
                const { _id, name, email, address } = newArray[i];

                // define new keyword
                const newKeyWord = {keyWord: `${name} ${email} ${address}`, _id};

                // push new keyword
                keyWords.push(newKeyWord);

            }else{

                // extract admin info
                const { _id, name, email, date } = newArray[i];

                // define new keyword
                const newKeyWord = {keyWord: `${name} ${email} ${moment(date).format("MMM DD")}`, _id};

                // push new keyword
                keyWords.push(newKeyWord);

            };

            // move on to next admin
            i++;
        };

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// admin delete admins
app.delete("/admin_delete_admins", async(req, res)=>{

    // queries
    const { array } = req.body;

    try{

        // define i
        var i = 0;
        var errroPoints = 0;
        
        // while loop
        while(i < array.length){

            // define doc
            const id = array[i];

            // find admin
            const { email } = await Admin.findOne({_id: new ObjectId(id)});

            // make sure email is not the manager email
            if(email != process.env.MANAGER_EMAIL){

                // find user image
                const { image } = await Admin.findOne({_id: new ObjectId(id)});

                // delete user image
                // make sure image is not default image
                if(image && image != "no_image.png"){

                    // delete image
                    const deleteImage = fs.unlinkSync(`./admin_images/${image}`, (err)=>{
                        if(!err){
                            console.log("deleted");
                        }else{
                            console.log(err);
                        };
                    });
                };

                // delete admin
                await Admin.deleteOne({_id: new ObjectId(id)});
            }else{
                // increase error points by 1
                errroPoints++;
            };

            // move on to next
            i++;
        };

        // check for loop complete
        if(i == array.length){
            // send response and documents
            res.status(200).json({message: "Delete docs successful"});
        };

    }catch(err){
        res.status(400).json({error: "Could not delete docs"});
    };
});

// admin import transactions
app.get("/admin_import_transactions", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];

        // define new array
        const newArray = [];

        // define key words array
        const keyWords = [];

        // find docs
        if(filter.toLowerCase() == "debtors"){

            await AdminDebtor.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{array.push(doc)});
                };
            });

        }else if(filter.toLowerCase() == "refund request"){

            await AdminRefundRequest.find({status: "Refund request", processing: false}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{array.push(doc)});
                };
            });
        
        }else if(filter.toLowerCase() == "refund processing"){

            await AdminRefundRequest.find({status: "Refund processing", processing: true}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{array.push(doc)});
                };
            });
        
        }else{

            await AdminTransaction.find({}, (err, data)=>{
                if(!err){
                    data.reverse().forEach((doc)=>{
                        if(filter.toLowerCase() == "success"){
                            if(doc.status.toLowerCase() == "success"){
                                array.push(doc)
                            };
                        }else if(filter.toLowerCase() == "pending"){
                            if(doc.status.toLowerCase() == "pending"){
                                array.push(doc)
                            };
                        }else if(filter.toLowerCase() == "failed"){
                            if(doc.status.toLowerCase() == "failed"){
                                array.push(doc)
                            };
                        }else if(filter.toLowerCase() == "refunded"){
                            if(doc.status.toLowerCase() == "refunded"){
                                array.push(doc)
                            };
                        }else if(filter.toLowerCase() == "refund failed"){
                            if(doc.status.toLowerCase() == "refund failed"){
                                array.push(doc)
                            };
                        }else{
                            array.push(doc);
                        };
                    });
                };
            });

        };

        // create new array
        const preArray = array.slice(startpoint, endpoint);
        
        // define i
        var i = 0;

        while(i < preArray.length){
            const { _id, userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen, date  } = preArray[i];

            // find user name and image
            const user = await User.findOne({email: email});
            
            if(user){
                // find user
                const { name, image } = user;

                // define new doc
                const newDoc = { _id, name, image, userId, userTransactionId, receiptId, email, issuedBy, state, country, phoneNumber, amount, status, reference, rooms, seen, date };

                // define new keyword
                const newKeyWord = { keyWord: `${name} ${email} ${state} ${country} ${phoneNumber} ${status} ${amount} ${moment(date).format("MMM DD")}`, _id};

                // push new doc
                newArray.push(newDoc);

                // push new key word
                keyWords.push(newKeyWord);

                i++;
            }else{
                i++;
            };
        };

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// create a handler for creating refund request


// admin approve refund request
app.post("/admin_approve_refund_request", async(req, res)=>{

    // extract refund request id
    const { array } =  req.body;

    try{

        // define new array
        const newArray = [];

        // define error points
        var errorPoints = 0;

        // define i
        var i = 0;

        while(i < array.length){

            // define refund request id
            const id = array[i];
            
            // find the refund request
            const foundRefundRequest  = await AdminRefundRequest.findOne({_id: new ObjectId(id)});

            // check
            if(foundRefundRequest){

                // extract props
                const { _id, preTransactionRooms } = foundRefundRequest;

                // define new data
                const newData = { adminRefundRequestId: _id, rooms: preTransactionRooms };

                // push new data
                newArray.push(newData);

                // move on to next
                i++;

            }else{
                // increase error points by one
                errorPoints++;

                // move on to next
                i++;
            };

        };

        // check if loop is complete
        if(i == newArray.length && newArray.length != 0){

            console.log(newArray.length);

            // initialize paystack refund using admin refund request id
            await initializeRefundPaystack("single", newArray, res);

        }
        // else throw Error("Error");

    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message});
    };
});
//////////////////////////////////////////////////////////////////////////////

// admin reject refund request
app.post("/admin_reject_refund_request", async(req, res)=>{

    // extract refund request refernce
    const { array } = req.body;

    try{

        // define i
        var i = 0 ;

        while(i < array.length){

            // define current date
            const currentDate = moment();

            // define reference
            const refundRequestId = array[i];

            // define new bookings
            const newBookings = [];

            // find user id and user transaction id
            const { userId, userTransactionId, reference, preTransactionRooms } = await AdminRefundRequest.findOne({_id: new ObjectId(refundRequestId)});

            // find user
            const { transactions, bookings } = await User.findOne({_id: new ObjectId(userId)});

            // process user bookings
            bookings.forEach((booking)=>{
                // check if user booking is included in receipt rooms
                const isIncluded = preTransactionRooms.filter((room)=>{return(room.roomId == booking.roomId && room.checkIn == booking.checkIn && room.checkOut)})[0];

                if(isIncluded){

                    // define new doc
                    const newDoc = booking;

                    // get current state
                    const { state } = roomGuardComparison(currentDate, moment(booking.checkIn), moment(booking.checkOut));

                    // set status as state
                    booking.status = state;

                    newBookings.push(newDoc);
                }else{
                    newBookings.push(booking);
                };
            });

            // console.log(newBookings);

            // update admin booking status
            bookings.forEach(async(booking)=>{

                // check if user booking is included in receipt rooms
                const isIncluded = preTransactionRooms.filter((room)=>{return(room.checkIn == booking.checkIn && room.checkOut == booking.checkOut && room.roomId == booking.roomId)})[0];

                if(isIncluded){

                    // get current state
                    const { state } = roomGuardComparison(currentDate, moment(booking.checkIn), moment(booking.checkOut));

                    // update admin booking status
                    await AdminBooking.updateOne({userBookingId: booking._id}, {$set: {status: state}});

                };
                
            });

            // define admin refund request array
            const adminRefundRequestArray = [];

            // find admin refund requests
            await AdminRefundRequest.find({_id: {$nin: [ refundRequestId ] }, reference: reference }, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        adminRefundRequestArray.push(doc);
                    });
                };
            });

            if(adminRefundRequestArray.length == 0){

                // update user transaction status to previous state
                const newArray = updateArrayItemStatus(userTransactionId, "status", "success", transactions);

                // update user transasctions with new array
                await User.updateOne({_id: new ObjectId(userId)}, {$set: {bookings: newBookings, transactions: newArray}});

                // update admin transaction back to success
                await AdminTransaction.updateOne({reference: reference}, {$set: {status: "success"}});

            }else{

                // console.log(adminRefundRequestArray[adminRefundRequestArray.length - 1].status);

                // update user transaction status to previous state
                const newArray = updateArrayItemStatus(userTransactionId, "status", adminRefundRequestArray[adminRefundRequestArray.length - 1].status, transactions);

                // update user transasctions with new array
                await User.updateOne({_id: new ObjectId(userId)}, {$set: {bookings: newBookings, transactions: newArray}});

                // update admin transaction back to success
                await AdminTransaction.updateOne({reference: reference}, {$set: {status: adminRefundRequestArray[adminRefundRequestArray.length - 1].status}});
            };

            // delete refund request
            await AdminRefundRequest.deleteOne({_id: new ObjectId(refundRequestId)});

            // alert user
            createUserMessage(userId, "bi bi-exclamation-triangle", "Refund request", "Your refund request has been rejected");

            // move on to next
            i++;
        };

        // if while loop is complete
        if(i == array.length){
            // send response
            res.status(200).json({message: "Refund request successfully rejected"});
        };

    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not reject refund request"});
    };
});
//////////////////////////////////////////////////////////////////////////////

// admin clear debtor
app.post("/admin_clear_debtors", async(req, res)=>{

    // extract admin debtor's id
    const { array } = req.body;

    try{

        // define i
        var i = 0;

        while(i < array.length){

            // define current date
            const currentDate = moment().toISOString();

            // define id
            const id = array[i];

            // find admin debtor
            const { email, userId, rooms, amount } = await AdminDebtor.findOne({_id: new ObjectId(id)});

            // update doc
            await AdminDebtor.deleteOne({_id: new ObjectId(id)});

            // alert admin on refund processed
            await createMessage("Debt cleared", "bi bi-bank", `User ${email} has been cleared of a debt of ${amount} for ${rooms} rooms`, currentDate);

            // alert user on refund processed
            await createUserMessage(userId, "bi bi-bank", "Debt cleared", `Your have been cleared of a debt of ${amount} for ${rooms} rooms and are no longer owing house 6`, currentDate);

            // move on to next
            i++;
        };

        // check for while loop complete
        if(i == array.length){
            // send response
            res.status(200).json({message: "update doc successfully"});
        };
    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };
});

// mark transaction as seen
app.post("/admin_mark_transactions_seen", async(req, res)=>{

    // extract props
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await AdminTransaction.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "update doc successfully"});
            };

        }else{
            // update doc
            await AdminTransaction.updateMany({seen: false}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };
});

// mark refund request as seen 
app.post("/admin_mark_refund_requests_seen", async(req, res)=>{

    // extract props
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await AdminRefundRequest.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "update doc successfully"});
            };

        }else{
            // update doc
            await AdminRefundRequest.updateMany({seen: false}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };
});

// mark debtor as seen
app.post("/admin_mark_debtors_seen", async(req, res)=>{

    // extract array
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await AdminDebtor.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "update doc successfully"});
            };

        }else{
            // update doc
            await AdminDebtor.updateMany({seen: false}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };

});

// process receipt room
const processReceiptRoom = async(array)=>{

    const newArray = [];

    var i = 0;

    while(i < array.length){

        const { _id, checkIn, checkOut, persons, specialServices, roomId, price } = array[i];

        const room = await Room.findOne({_id: new ObjectId(roomId)});

        if(room){
            var newPrice = null;
            const { name } = room;
            const checkInDate = moment(checkIn);
            const checkOutDate = moment(checkOut);
            const difference = checkOutDate.diff(checkInDate, "days");
            const differenceInDate = moment(difference);
            const percentage = ((differenceInDate * price * persons)/100) * 5;
            
            if(specialServices == true){
                newPrice = (differenceInDate * price * persons) + percentage;
            }else{
                newPrice = (differenceInDate * price * persons);
            };

            const newData = {_id, roomId, name, checkIn, checkOut, specialServices, persons, price: newPrice.toFixed(2) };
            newArray.push(newData);
            i++;
        }else{
            i++;
        };
    };
    return(newArray);
};

// admin import receipts
app.get("/admin_import_receipts", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];

        // new array
        const preNewArray = [];

        // define key words array
        const keyWords = [];

        // find docs
        await AdminReceipt.find({}, (err, data)=>{
            if(!err){
                data.reverse().forEach((doc)=>{
                    if(filter == "New"){
                        if(doc.seen == false){
                            array.push(doc)
                        };
                    }else{
                        array.push(doc);
                    };
                });
            };
        });

        // process new array
        var i = 0;

        while(i < array.length){

            // extract receipt info
            const {_id, userId, userReceiptId, email, seen, rooms, phoneNumber, issuedBy, date, country, state, amount} = array[i];

            // find user name and image
            const user = await User.findOne({_id: new ObjectId(userId)});

            if(user){

                // find user
                const { name, image } = user;

                // process receipt rooms
                const newRooms = await processReceiptRoom(rooms);

                // define new data
                const newData = {_id, userId, userReceiptId, name, image, email, seen, rooms: newRooms, roomsLength: rooms, phoneNumber, country, state, issuedBy, date, amount: amount.toFixed(2) };

                // define new keyword
                const newKeyWord = { keyWord: `${name} ${email} ${state} ${country} ${phoneNumber} ${amount.toFixed(2)} ${moment(date).format("MMM DD")}`, _id};

                // push new data
                preNewArray.push(newData);

                // push new keyword
                keyWords.push(newKeyWord);

                // move on to next receipt
                i++;
            }else{
                // move on to next
                i++;
            };
        };

        // create new array
        const newArray = preNewArray.slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});

    }catch(err){
        console.log("err", err);
        res.status(400).json({error: "Could not import doc"});
    };
});

// mark receipts as seen
app.post("/admin_mark_receipts_seen", async(req, res)=>{

    // extract array
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await AdminReceipt.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "update doc successfully"});
            };

        }else{
            // update doc
            await AdminReceipt.updateMany({seen: false}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };
});

// settings

// process web reviews
const processWebReviews = async(array)=>{

    // define new array
    const newArray = [];

    // define i
    var i = 0;

    // start loop for i
    while(i < array.length){

        // extract props
        const { _id, userId, rating, comment, hidden, date } = array[i];

        // find user
        const user  = await User.findOne({_id: new ObjectId(userId)});

        // check for user
        if(user){

            // extract name and image 
            const { name, image } = user;

            // assemble new data
            const newData = { _id, userId, name, image, rating, comment, hidden, date };

            // push new data
            newArray.push(newData);

            // move on to next
            i++;

        }else{

            // move on to next
            i++;

        };

    };

    return newArray;
};

// handle web review hidden status
app.get("/handle_web_review_status/:id", async(req, res)=>{

    // extract prop
    const { id } = req.params;

    try{

        // find web review
        const { hidden } = await WebReview.findOne({_id: new ObjectId(id)});

        // conditional action
        if(hidden == true){

            // update
            await WebReview.updateOne({_id: new ObjectId(id)}, {$set: {hidden: false}});

        }else{

            // update
            await WebReview.updateOne({_id: new ObjectId(id)}, {$set: {hidden: true}});

        };

        // send response
        res.status(200).json({message: "Action successful"});

    }catch(err){

        // send response
        res.status(400).json({error: "Failed to execute action"});
    };

});

// import admin details
app.get("/admin_settings", async(req, res)=>{

    // extract id
    const { id, sliceNum, startpoint, endpoint, filter } = req.query;

    try{

        // console.log("filter", filter);

        // define doc array
        const array = [];

        // new array
        const preNewArray = [];

        // define data
        let data;

        if(filter == "edit"){

            // find admin details
            data = await Admin.findOne({_id: new ObjectId(id)});

        }else if(filter == "faq" || filter == "null"){

            // find FAQ
            await FAQ.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        array.push(doc);
                        preNewArray.push(doc);
                    });
                };
            });


        }else if(filter == "web_reviews"){

            // find web reviews
            await WebReview.find({}, (err, data)=>{
                if(!err){
                    data.forEach((doc)=>{
                        array.push(doc);
                    });
                };
            });

            // process web reviews
            const webReviews = await processWebReviews(array);

            // loop all items in new web reviews and add them to pre array
            webReviews.forEach((doc)=>{
                preNewArray.push(doc);
            });

        };


        // create new array
        const newArray = preNewArray.slice(startpoint, endpoint);

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        if(filter == "edit"){
            // send response
            res.status(200).json({message: "Imported doc successfully", data: data});
        }else{
            
            // send response and documents
            res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult});
        };
        
    }catch(err){
        console.log(err);
        res.status(400).json({error: "Could not import doc"});
    };
});

// admin create faq
app.post("/admin_create_faq", async(req, res)=>{

    // extract prop
    const { question, answer } = req.body;

    try{
        // update admin
        await FAQ.create({ question, answer });

        // send response
        res.status(200).json({message: "Created FAQ successfully"});

    }catch(err){

        // send response
        res.status(400).json({error: "Could not create FAQ"});
    };
});

// admin modify faq
app.post("/admin_modify_faq/:id", async(req, res)=>{

    // extract id
    const { id } = req.params;

    // define data
    const { question, answer } = req.body;

    try{
        // update admin
        await FAQ.updateOne({_id: new ObjectId(id)}, {$set: { question: question, answer: answer }});

        // send response
        res.status(200).json({message: "Updated FAQ successfully"});

    }catch(err){

        // send response
        res.status(400).json({error: "Could not update FAQ"});

    };
});

// admin delete faq
app.delete("/admin_delete_faq/:id", async(req, res)=>{

    // extract id
    const { id } = req.params;

    try{
        // update admin
        await FAQ.deleteOne({_id: new ObjectId(id)});

        // send response
        res.status(200).json({message: "Deleted FAQ successfully"});

    }catch(err){

        // send response
        res.status(400).json({error: "Could not delete FAQ"});
        
    };
});

// end of settings

// admin import messages
app.get("/admin_import_messages", async(req, res)=>{

    // queries
    const { sliceNum, startpoint, endpoint, filter } = req.query;

    try{
        // define doc array
        const array = [];

        // define key words array
        const keyWords = [];

        // find docs
        await Message.find({}, (err, data)=>{
            if(!err){
                data.reverse().forEach((doc)=>{
                    if(filter == "New"){
                        if(doc.seen == false){
                            array.push(doc);
                        };
                    }else if(filter == "Seen"){
                        if(doc.seen == true){
                            array.push(doc);
                        };
                    }else{
                        array.push(doc);
                    };
                });
            };
        });

        // create new array
        const newArray = array.slice(startpoint, endpoint);

        // process new array for keywords

        // define i
        var i = 0;

        while(i < newArray.length){

            // extract message prop
            const { _id, title } = newArray[i];

            // define new keyword
            const newKeyWord = { keyWord: `${title}`, _id };

            // push new keyword
            keyWords.push(newKeyWord);

            // move on to next message
            i++;

        };        

        // total page
        const totalPage = Math.ceil(array.length/sliceNum);

        // total results
        const totalResult = array.length;

        // send response and documents
        res.status(200).json({message: "import successful", array: newArray, totalPage, totalResult, keyWords});

    }catch(err){
        res.status(400).json({error: "Could not import doc"});
    };
});

// mark messages as seen
app.post("/admin_mark_messages_seen", async(req, res)=>{

    // extract array
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await Message.updateOne({_id: new ObjectId(id)}, {$set: {seen: true}});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "update doc successfully"});
            };

        }else{
            // update doc
            await Message.updateMany({seen: false}, {$set: {seen: true}});

            // send response
            res.status(200).json({message: "update doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };

});

// mark messages delete messages
app.post("/admin_delete_messages", async(req, res)=>{

    // extract array
    const { array } = req.body;

    try{

        if(array.length != 0){

            // define i
            var i = 0;

            while(i < array.length){

                // define id
                const id = array[i];

                // update doc
                await Message.deleteOne({_id: new ObjectId(id)});

                // move on to next
                i++;
            };

            // if loop is complete
            if(i == array.length){
                // send response
                res.status(200).json({message: "Deleted doc successfully"});
            };

        }else{
            // update doc
            await Message.deleteMany();

            // send response
            res.status(200).json({message: "Deleted doc successfully"});
        };

    }catch(err){
        res.status(400).json({error: "could not update doc"});
    };

});

// end of admin account api

// end of general frontend api




// test api
app.post("/add_booking_count/:id", async(req, res)=>{
    const { id } = req.params;
    try{
        const { data } = req.body;

        for(i = 0; i < data.length; i++){
            const guest = data[i];
            await Room.updateOne({_id: new ObjectId(id)}, {$push: {booking_count: guest}});
        };

        res.status(200).json({message: "successful"});
    }catch(err){
        res.status(400).json({error: "error"});
    };
});

// test api
app.post("/test_moment", async(req, res)=>{
    try{
        const currentDate = moment().toISOString();
        console.log(currentDate)
        res.status(200).json({message: "successful"});
    }catch(err){
        res.status(400).json({error: "error"});
    };
});



// test transaction pending
app.get("/test_verify_transaction_pending", async(req, res)=>{
    try{
        await webhookVerifyTransactionPending("vl0mnnux9n", 800);
        // 
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err);
        res.status(400).json({error: "error"});
    };
});

// test transaction failed
app.get("/test_webhook_transaction_failed", async(req, res)=>{
    try{
        console.log("transaction failed");
        await webhookVerifyTransactionFailed("o8u75c7tiw", 90000);
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});

// test transaction refund processed
app.get("/test_webhook_refund_processed", async(req, res)=>{
    try{
        await webhookRefundProcessed("zaa77ni9oz", "698a20adb707171bdc149e47", 45000);
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});

// test transaction failed
app.get("/test_webhook_refund_failed", async(req, res)=>{
    try{
        await webhookRefundFailed("zaa77ni9oz", "698a20b1b707171bdc149f04", 45000);
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});

// test repayment successful
app.get("/test_webhook_repayment_successful", async(req, res)=>{
    try{
        await repaymentSuccessful("h0qd5sftzc", "o8u75c7tiw", 90000);
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});

// test repayment failed
app.get("/test_webhook_repayment_failed", async(req, res)=>{
    try{
        await repaymentFailed("o8u75c7tiw", 90000);
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});


// test clear messages
app.get("/add_booking_count", async(req, res)=>{
    try{
        await Room.updateOne({_id: new ObjectId("684813499a53741a7c5dd31b")}, {$set: {messages: []}});
        res.status(200).json({message: "successful"});
    }catch(err){
        console.log(err.message, err);
        res.status(400).json({error: "error"});
    };
});



 