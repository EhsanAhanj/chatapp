const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  created_at: Date,
  inbox: [Object],
});
const User = mongoose.model("User", userSchema);

exports.User = User;
