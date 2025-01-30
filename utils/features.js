import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { getBase64, getSockets } from "../lib/helper.js";

export const connectDB = (uri) => {
  mongoose
    .connect(uri)
    .then((data) => {
      console.log("connected to DB :", data.connection.host);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const sendToken = (user, statusCode, res, message) => {
  const token = jwt.sign(
    {
      _id: user._id,
      name: user.name, // Ensure sender's name is included
      avatar: user.avatar,
    },
    "sfdgfhsg"
  );
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    sameSite: "none",
    secure: true,
    httpOnly: true,
  };
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    user,
    message,
  });
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data);
};

export const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        { resource_type: "auto", public_id: uuid() },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);
    // Change secureUrl to url for consistency
    const formattedResults = results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url, // Changed to url
    }));

    return formattedResults;
  } catch (error) {
    throw new Error(`Error uploading files to Cloudinary: ${error.message}`);
  }
};

export const deleteFilesFromCloudinary = async (public_ids) => {
  if (!public_ids) return null;
  try {
    await cloudinary.api.delete_resources(public_ids);
  } catch (error) {
    console.log(error);
  }
};
