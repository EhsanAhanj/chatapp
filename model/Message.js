const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: String,
  sendTo: String,
  content: String,
  created_at: String,
  has_image: { type: Boolean, default: false },
  image: String,
});
const Message = mongoose.model("Message", messageSchema);

exports.Message = Message;
