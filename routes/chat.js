import express from "express";
import {
    addMembers,
    deleteChat,
    getChatDetails,
    getMessages,
    getMyChats,
    getMyGroups,
    leaveGroup,
    newGroupChat,
    removeMember,
    renameGroup,
    sendAttachments,
} from "../controllers/chat.js";
import {
    addMembersValidator,
    getChatIdValidator,
    newGroupChatValidator,
    removeMemberValidator,
    sendAttachmentsValidator,
    validate
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { AttachmentsMulter } from "../middlewares/multer.js";
import { searchChats } from "../controllers/user.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validate, newGroupChat);
app.get("/my", getMyChats);
app.get("/my/groups", getMyGroups);
app.put("/addmembers", addMembersValidator(), validate, addMembers);
app.put("/removemember", removeMemberValidator(), validate, removeMember);
app.delete("/leave/:id", getChatIdValidator(), validate, leaveGroup);
app.get("/search",searchChats)

// Send Attachments

app.post(
  "/message",
  AttachmentsMulter,
  sendAttachmentsValidator(),
  validate,
  sendAttachments
);

app.get("/message/:id",getChatIdValidator(), validate, getMessages);

app.route("/:id").get(getChatIdValidator(),validate,getChatDetails).put(renameGroup).delete(deleteChat);

export default app;
