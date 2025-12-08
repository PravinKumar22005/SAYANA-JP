const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

const friendController = {};

// Search for users by name or email
friendController.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
      _id: { $ne: req.user.id } // Exclude self
    }).select('name email');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a friend request
friendController.sendFriendRequest = async (req, res) => {
  try {
    const { to } = req.body;
    const from = req.user.id;

    if (to === from) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }

    // 1) Check if already friends using the friends array
    const sender = await User.findById(from).select('friends');
    if (sender?.friends?.map(f => f.toString()).includes(String(to))) {
      return res.status(400).json({ message: 'You are already friends.' });
    }

    // 2) Only block if there is an ACTIVE PENDING request between these two
    const existingPending = await FriendRequest.findOne({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
      status: 'pending'
    });

    if (existingPending) {
      // You can customize this message if you want more info
      return res.status(400).json({ message: 'Friend request already sent or pending between you two.' });
    }

    // 3) Otherwise create a fresh pending request
    const friendRequest = new FriendRequest({ from, to });
    await friendRequest.save();

    res.status(201).json({ message: 'Friend request sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending friend requests
friendController.getFriendRequests = async (req, res) => {
  try {
    const friendRequests = await FriendRequest.find({
      to: req.user.id,
      status: 'pending'
    }).populate('from', 'name email');

    res.json(friendRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept a friend request
friendController.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);

    if (!request || request.to.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    request.status = 'accepted';
    await request.save();

    // Add each user to the other's friends list
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
    await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });

    res.json({ message: 'Friend request accepted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a friend request
friendController.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await FriendRequest.findById(requestId);

    if (!request || request.to.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Either mark rejected OR delete; both are fine since sendRequest ignores non-pending.
    request.status = 'rejected';
    await request.save();

    // If you prefer to delete instead, comment above 2 lines and uncomment below:
    // await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Friend request rejected.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's friends
friendController.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name email');
    res.json(user.friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get sent (outgoing) friend requests
friendController.getSentFriendRequests = async (req, res) => {
  try {
    const sent = await FriendRequest.find({
      from: req.user.id,
      status: 'pending'
    }).populate('to', 'name email');

    res.json(sent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = friendController;
