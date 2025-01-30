import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/event.js";
import { getOther } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility.js";

export const newGroupChat = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;
  if (!members) {
    return next(new ErrorHandler("Please enter all fields", 400));
  }
  if (members.length < 2) {
    return next(
      new ErrorHandler("Group chat must have at least 3 members", 400)
    );
  }
  const allMembers = [...members, req.user._id];

  await Chat.create({
    name,
    members: allMembers,
    groupChat: true,
    creater: req.user._id,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group chat created",
  });
});

export const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user._id }).populate(
    "members",
    "name avatar"
  );
  
  const transformChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = members.find(member => member._id.toString() !== req.user._id.toString());
    return {
      _id,
      groupChat,
      name: groupChat ? name : otherMember.name,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar?.url || "")
        : [otherMember?.avatar?.url || ""],
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user._id.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformChats,
  });
});

export const getChatDetails = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
    .populate("members", "name avatar")
    .lean();
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    
    const otherMember = chat.members.find(member => member._id.toString() !== req.user._id.toString());
    if(!chat.groupChat) chat.name=otherMember.name
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    const otherMember = chat.members.find(member => member._id.toString() !== req.user._id.toString());
    chat.name=otherMember.name
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

export const getMyGroups = TryCatch(async (req, res, next) => {

  const chats = await Chat.find({
    members: req.user._id,
    groupChat: true,
  }).populate("members", "name avatar");

  const groups = chats.map(({ _id, name, members }) => {
    return {
      _id,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    };
  });
  return res.status(200).json({
    success: true,
    message: groups,
  });
});

export const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creater.toString() !== req.user._id.toString())
    return next(new ErrorHandler("You are not allowed to add members", 403));
  if (!members) return next(new ErrorHandler("Please provide members", 400));
  if (members.length < 1)
    return next(new ErrorHandler("Please provide at least one member", 400));
  if (members.length + chat.members.length > 100)
    return next(new ErrorHandler("Group chat members limit reached", 400));
  const allnewMembersPromise = members.map((member) =>
    User.findById(member, "name")
  );
  const allNewMembers = await Promise.all(allnewMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);
  chat.members.push(...uniqueMembers.map((i) => i._id));
  await chat.save();
  const allUsersName = uniqueMembers.map((i) => i.name).join(",");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} added in ${chat.name} group`
  );
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Members added successfully",
  });
});

export const removeMember = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  const [chat, user] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creater.toString() !== req.user._id.toString())
    return next(new ErrorHandler("You are not allowed to remove members", 403));
  if (chat.members.length <= 3)
    return next(
      new ErrorHandler("Group chat must have at least 3 members", 400)
    );
    const allChatMembers = chat.members.map((member) => member.toString());
  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );
  await chat.save();
  emitEvent(
    req,
    ALERT,
    chat.members,
    {
      message: `${user.name} removed from ${chat.name} group`,
      chatId
    }
   
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);
  return res.status(200).json({
    success: true,
    message: "Members removed successfully",
  });
});

export const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user._id.toString()
  );
  if (remainingMembers.length < 3)
    return next(
      new ErrorHandler("Group chat must have at least 3 members", 400)
    );
  if (chat.creater.toString() === req.user._id.toString()) {
    const newCreater = remainingMembers[0];
    chat.creater = newCreater;
  }
  chat.members = remainingMembers;
  await chat.save();
  emitEvent(req, ALERT, chat.members,{
    chatId,
    message: `${req.user.name} left the group`
  });
  return res.status(200).json({
    success: true,
    message: "You left the group",
  });
});

export const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];
  if (files.length < 1)
    return next(
      new ErrorHandler("Please provide at least one attachment", 400)
    );
  if (files.length > 5)
    return next(new ErrorHandler("You can only send 5 attachments", 400));
  
  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user._id, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const attachments =await uploadFilesToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };


  const messageforRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
      avatar: me.avatar.url,
    },
  };
  
  const message = await Message.create(messageForDB);
 
  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageforRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message: message,
  });
});



export const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creater.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("You are not allowed to rename this group", 403)
    );
  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group name updated successfully",
  });
});

export const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;

  if (chat.groupChat && chat.creater.toString() !== req.user._id.toString())
    return next(
      new ErrorHandler("You are not allowed to delete this group", 403)
    );

  if (!chat.groupChat && !chat.members.includes(req.user._id.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete this chat", 403)
    );
  }

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => {
      public_ids.push(public_id);
    });
  });

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

export const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.members.includes(req.user._id.toString())) return next(new ErrorHandler("You are not allowed to access this chat", 403));
  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);
  const totalPages = Math.ceil(totalMessagesCount / limit);
  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});


