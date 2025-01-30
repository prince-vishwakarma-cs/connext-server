import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { errorMiddleware } from "./middlewares/error.js";
import adminRoute from "./routes/admin.js";
import chatRoute from "./routes/chat.js";
import userRoute from "./routes/user.js";
import { connectDB } from "./utils/features.js";
import { Server } from "socket.io";
import { createServer } from "http";
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  START_TYPING,
  STOP_TYPING,
  NEW_REQUEST,
} from "./constants/event.js";
import { v4 as uuid } from "uuid";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({
  path: "./.env",
});
import { corsOptions } from "./constants/configure.js";
import { socketAuthenticator } from "./middlewares/auth.js";

const app = express();
const server = createServer(app); // Create HTTP server with Express
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

const MongoUri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
export const userSocketIDs = new Map();
connectDB(MongoUri);

// Middleware
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Hello from the server");
});

io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});
io.on("connection", (socket) => {
  const user = socket.user;
  if (user && user._id) {
    userSocketIDs.set(user._id.toString(), socket.id);
  } else {
    console.log("User is not authenticated or user data is null");
  }

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageforRealTime = {
      chat: chatId,
      sender: {
        _id: user._id,
        name: user.name,
      },
      _id: uuid(),
      content: message,
      createdAt: new Date().toISOString(),
    };

    const messageforDB = {
      chat: chatId,
      sender: user._id,
      content: message,
    };

    const userSocket = getSockets(members);
    io.to(userSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageforRealTime,
    });

    io.to(userSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    await Message.create(messageforDB);
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);


    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
   
    const membersSockets = getSockets(members);

    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(NEW_REQUEST, ({ senderId, receiverId }) => {
    const receiverSocketId = userSocketIDs.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit(NEW_REQUEST, {
        senderId,
        message: "You have a new friend request!",
      });
    }
  });

  socket.on("disconnect", () => {
  });
});
app.use(errorMiddleware);
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
