import { userSocketIDs } from "../app.js";

export const getOther = (members, id) =>
  members.find((member) => member._id.toString() !== id.toString());


export const getSockets = (users = []) => {
  const sockets = users
    .filter(user => user) // Ensure user is defined and has _id
    .map(user => userSocketIDs.get(user.toString()))
    .filter(Boolean); // Filter out undefined socket IDs
  return sockets;
};



export const getBase64 = (file) => {
  return `data:image/${file.mimetype.split("/")[1]};base64,${file.buffer.toString("base64")}`;
};
