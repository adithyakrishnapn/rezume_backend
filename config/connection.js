const mongoose = require('mongoose');
require('dotenv').config();

const connect = () => {
    const uri = process.env.MONGODB_URI;

    return mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to MongoDB Atlas");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        throw err;
    });
};

module.exports.connect = connect;

module.exports.get = function() {
    return mongoose.connection;
};
