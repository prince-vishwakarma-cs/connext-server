import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";
export const registerValidator = () => [
  body("name", "Name is required").notEmpty(),
  body("username", "Username is required").notEmpty(),
  body("password", "Password is required").notEmpty(),
  body("bio", "Bio is required").notEmpty()
];

export const loginValidator = () => [
  body("username", "Username is required").notEmpty(),
  body("password", "Password is required").notEmpty(),
];

export const newGroupChatValidator = () => [
  body("name", "Name is required").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Members are required")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be between 2 and 100"),
];

export const addMembersValidator = () => [
  body("chatId", "Chat Id is required").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Members are required")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be between 1 and 97"),
];

export const removeMemberValidator = () => [
  body("chatId", "Chat Id is required").notEmpty(),
  body("userId", "User Id is required").notEmpty(),
];

export const leaveGroupValidator = () => [
  param("id", "Chat Id is required").notEmpty(),
];

export const sendAttachmentsValidator = () => [
  body("chatId", "Chat Id is required").notEmpty(),
];

export const getChatIdValidator = () => [
  param("id", "Chat Id is required").notEmpty(),
];

export const renameGroupValidator = () => [
  param("id", "Chat Id is required").notEmpty(),
  body("name", "Name is required").notEmpty(),
];

export const sendRequestValidator = () => [
  body("userId", "User Id is required").notEmpty(),
];

export const acceptRequestValidator = () => [
  body("requestId", "Please Enter User ID"),
  body("accept")
    .notEmpty()
    .withMessage("Accept is required")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];

export const adminLoginValidator = () => [
  body("secretKey", "Secret Key is required").notEmpty(),
];
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(",");
  if (!errors.isEmpty()) {
    return next(new ErrorHandler(errorMessages, 400));
  }
  next();
};
