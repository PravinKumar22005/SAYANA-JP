const Message = require('../models/Message');
const User = require('../models/User');

// Send a message to a friend
exports.sendMessage = async (req, res) => {
  try {
    const { to, message } = req.body;
    const from = req.user.id;

    // Check if 'to' user is a friend
    const sender = await User.findById(from);
    if (!sender.friends.includes(to)) {
      return res.status(403).json({ message: 'You can only send messages to friends.' });
    }

    const newMessage = new Message({ from, to, message });
    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages with a friend
exports.getMessages = async (req, res) => {
  try {
    const from = req.user.id;
    const to = req.params.friendId;

    const messages = await Message.find({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    }).sort({ createdAt: 'asc' });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
