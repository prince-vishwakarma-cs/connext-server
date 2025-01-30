import express from "express";
import {
  acceptFriendRequest,
  getMyFriends,
  getMyInfo,
  getMyNotifications,
  login,
  logout,
  newUser,
  searchUsers,
  sendFriendRequest
} from "../controllers/user.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validate } from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";

const app = express.Router();

app.post("/new", singleAvatar,registerValidator(),validate, newUser);
app.post("/login", loginValidator(),validate,login);

app.use(isAuthenticated);
app.get("/me", getMyInfo);
app.get("/logout", logout);
app.get("/search", searchUsers);
app.put("/friendrequest",sendRequestValidator(),validate,sendFriendRequest)
app.put("/acceptrequest", acceptRequestValidator(), validate, acceptFriendRequest)
app.get("/notifications",getMyNotifications)
app.get("/friends", getMyFriends)

export default app;
