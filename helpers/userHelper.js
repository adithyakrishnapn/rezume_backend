const db= require('../config/connection');
const { ObjectId } = require("mongodb");
const bcrypt = require('bcrypt');

module.exports = {
    DoSignup: (Data)=>{
        return new Promise (async(resolve, reject)=>{
            try{
                let existingUser = await db.get().collection('users').findOne({ email: Data.email });

                if(existingUser) {
                    return reject("Email already exists");
                }

                Data.password = await bcrypt.hash(Data.password, 10);
                const result = await db.get().collection('users').insertOne(Data);

                console.log("Registered successfully");

                resolve({ user: Data, InsertedId: result.insertedId});
            } catch (err){
                console.log('Error registering User: ', err);
                reject("Error registering");
            }
        })
    },
    DoLogIn: async (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {};
                
                // Await the database query
                let user = await db.get().collection('users').findOne({ email: data.email });
    
                if (user) {
                    // Compare passwords asynchronously
                    const match = await bcrypt.compare(data.password, user.password);
                    if (match) {
                        response.user = user;
                        response.status = true;
                        console.log("Login success");
                        resolve(response);
                    } else {
                        console.log("Login failed due to incorrect password");
                        resolve({ status: false, message: "Incorrect password" });
                    }
                } else {
                    console.log("User not found");
                    resolve({ status: false, message: "User not found" });
                }
            } catch (err) {
                console.log("Error in DoLogIn:", err);
                reject(err);
            }
        })
    }    
}