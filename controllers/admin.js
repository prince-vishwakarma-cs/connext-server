import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import jwt from "jsonwebtoken";

export const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const adminSecretKey = "iamadmin";
  if (secretKey === adminSecretKey) {
    const token = jwt.sign(secretKey, "sfdgfhsg");
    return res
      .status(200)
      .cookie("admintoken", token, {
        expires: new Date(
          Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        sameSite: "none",
        secure: true,
        httpOnly: true,
      })
      .json({
        success: true,
        message: "Admin logged in successfully",
      });
  } else {
    return res.status(401).json({
      success: false,
      message: "Invalid Admin Key",
    });
  }
});

export const adminLogout = TryCatch(async (req, res, next) => {
  res
    .status(200)
    .cookie("admintoken", "", {
      expires: new Date(Date.now()),
      sameSite: "none",
      secure: true,
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Admin logged out successfully",
    });
});

export const adminDetails = TryCatch(async (req, res, next) => {
  res.status(200).json({
    success: true,
    admin: true,
  });
});

export const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);
      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  //return response
  res.status(200).json({
    success: true,
    transformedUsers,
    totalUsers: transformedUsers.length,
  });
});

export const getAllChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creater", "name avatar");

  let transformedChats = await Promise.all(
    chats.map(async ({ _id, name, members, groupChat, creater }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => {
          return {
            _id,
            name,
            avatar: avatar.url,
          };
        }),
        creater: {
          name: creater?.name || "none",
          avatar: creater?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  res.status(200).json({
    success: true,
    transformedChats,
  });
});

export const getAllMessages = TryCatch(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );

  res.status(200).json({
    success: true,
    transformedMessages,
  });
});

export const getDashboardStats = TryCatch(async (req, res, next) => {
  const [groupChatsCount, usersCount, messagesCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMessages = await Message.find({
    createdAt: { $gte: last7Days, $lte: today },
  }).select("createdAt");

  const messages = new Array(7).fill(0);
  last7DaysMessages.forEach((message) => {
    const index = Math.floor(
      (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    messages[6 - index]++;
  });

  const stats = {
    groupChatsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };

  res.status(200).json({
    success: true,
    stats,
  });
});
