import { TryCatch } from "./error.js";
import { ErrorHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

export const isAuthenticated = TryCatch(async (req, res, next) => {
  const token = req.cookies["token"];
  if (!token)
    return next(new ErrorHandler("Please login to access this resource", 401));
  const decodedData = jwt.verify(token, "sfdgfhsg");
  req.user = await User.findById(decodedData._id);
  next();
});

export const adminOnly = TryCatch(async (req, res, next) => {
  const token = req.cookies["admintoken"];
  if (!token)
    return next(new ErrorHandler("Only admin can access this route", 401));

  const secretKey = jwt.verify(token, "sfdgfhsg");
  if (secretKey === "iamadmin") {
    return next();
  } else {
    return next(new ErrorHandler("Only admin can access this route", 401));
  }
});

export const socketAuthenticator = async (err,socket,next) => {
  try {
    if (err) return next(err);
    const authToken = socket.request.cookies["token"];
    if (!authToken) return next(new ErrorHandler("Unauthorized", 401));
    const decoded = jwt.verify(authToken, "sfdgfhsg");
    const user=await User.findById(decoded._id);
    socket.user = user
    return next();
  } catch (error) {
    return next(new ErrorHandler("Unauthorized", 401));
  }
};
