import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { emitEvent, sendToken } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { getOther } from "../lib/helper.js";
import { uploadFilesToCloudinary } from "../utils/features.js";

const validateName = (name) => {
  // Name shouldn't exceed 20 characters
  return name.length <= 20;
};

const validateUsername = (username) => {
  // Username should be lowercase, can contain numbers and underscores, no spaces
  const usernameRegex = /^[a-z0-9_]+$/;
  return username.length <= 20 && usernameRegex.test(username);
};

const validateBio = (bio) => {
  // Bio should not exceed 50 characters
  return bio.length <= 50;
};

const validatePassword = (password) => {
  // Password should be at least 8 characters long and contain at least one digit
  const passwordRegex = /^(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

export const newUser = async (req, res, next) => {
  const { name, username, password, bio } = req.body;

  // Check if required fields are provided
  if (!name || !username || !password || !bio) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // Validate name
  if (!validateName(name)) {
    return res.status(400).json({
      success: false,
      message: "Name cannot exceed 20 characters",
    });
  }

  // Validate username
  if (!validateUsername(username)) {
    return res.status(400).json({
      success: false,
      message: "Username should be lowercase, contain only numbers, underscores, and no spaces, and cannot exceed 20 characters",
    });
  }

  // Validate bio
  if (!validateBio(bio)) {
    return res.status(400).json({
      success: false,
      message: "Bio cannot exceed 50 characters",
    });
  }

  // Validate password
  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long and contain at least one digit",
    });
  }

  if (!req.file) {
    return next(new ErrorHandler("Please upload avatar", 400));
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Username already exists",
    });
  }

  try {
    const result = await uploadFilesToCloudinary([req.file]);
    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url, // do not change the variable
    };

    const user = await User.create({
      name: name,
      username: username,
      bio: bio,
      password: password,
      avatar: avatar,
    });

    sendToken(user, 201, res, "User Created");
  } catch (error) {
    return next(new ErrorHandler("File upload failed", 500));
  }
};


export const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
  if (!user)
    return res.status(404).json({
      success: false,
      message: "User not found",
    });

  const isMatch = await compare(password, user.password);

  if (!isMatch) return next(new ErrorHandler("Invalid Password", 401));

  sendToken(user, 200, res, `Welcome back, ${user.name}`);
});

export const getMyInfo = TryCatch(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: req.user,
  });
});

export const logout = TryCatch(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      sameSite: "none",
      secure: true,
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged Out",
    });
});

export const searchUsers = TryCatch(async (req, res, next) => {
  const { name } = req.query;
  const myChats = await Chat.find({ groupChat: false, members: req.user._id });

  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);
  allUsersFromMyChats.push(req.user._id);

  const AllUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name || "", $options: "i" },
  });

  const users = AllUsersExceptMeAndFriends.map(
    ({ _id, name, avatar, bio, username }) => ({
      _id,
      name,
      avatar: avatar.url,
      bio,
      username,
    })
  );
  res.status(200).json({
    success: true,
    users,
  });
});

export const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });

  if (request) return next(new ErrorHandler(`Request Already Sent`, 400));

  const newRequest = await Request.create({
    sender: req.user._id,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId], {
    _id: newRequest._id,  // Use the new request's ID
    sender: {
      _id: req.user._id, 
      name: req.user.name, // Ensure sender's name is included
      avatar: req.user.avatar, // Ensure sender's avatar is included
    },
  });

  res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});


export const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request Not Found", 404));

  if (request.receiver._id.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

export const getMyNotifications = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user._id }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  res.status(200).json({
    success: true,
    allRequests,
  });
});

export const getMyFriends = TryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;
  const chats = await Chat.find({
    groupChat: false,
    members: req.user._id,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOther(members, req.user._id);
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  }

  res.status(200).json({
    success: true,
    friends,
  });
});

export const searchChats = TryCatch(async (req, res, next) => {
  const { search } = req.query; // Use req.query for search query parameter

  // Find chats where the user is a member and the chat name matches the search query
  const chats = await Chat.find({
    members: req.user._id,
    name: { $regex: search || "", $options: "i" }, // Using search as a regex
  }).populate("members", "name avatar");

  const result = chats.map(chat => ({
    _id: chat._id,
    name: chat.name,
    members: chat.members.map(member => ({
      _id: member._id,
      name: member.name,
      avatar: member.avatar
    }))
  }));

  return res.status(200).json({
    success: true,
    result,
  });
});

