import express from "express";
import { getAllUsers ,getAllChats, getAllMessages, getDashboardStats, adminLogin, adminLogout, adminDetails} from "../controllers/admin.js";
import { adminLoginValidator, validate } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();

app.post("/verify",adminLoginValidator(),validate,adminLogin)
app.get("/logout",adminLogout)

app.use(adminOnly)
app.get("/",adminDetails)
app.get("/users",getAllUsers)
app.get("/chats",getAllChats)
app.get("/messages",getAllMessages)
app.get("/stats",getDashboardStats)

export default app; 