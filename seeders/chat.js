import { faker } from "@faker-js/faker";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import { Message } from "../models/message.js";

export const createSingleChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatSPromise = [];

    // Create single chats between each unique pair of users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatSPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i]._id, users[j]._id],
          })
        );
      }
    }
    await Promise.all(chatSPromise);
    console.log("Chats Created");
  } catch (error) {
    console.log(error);
  }
};


export const createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatGPromise = [];

    // Create group chats with random members
    for (let i = 0; i < numChats; i++) {
      const numMembers = faker.number.int({ min: 3, max: users.length });
      const members = [];

      for (let j = 0; j < numMembers; j++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      chatGPromise.push(
        Chat.create({
          name: faker.lorem.words(2),
          groupChat: true,
          members: members,
          creater: members[0],
        })
      );
    }

    await Promise.all(chatGPromise);
    console.log("Chats Created");
  } catch (error) {
    console.log(error);
  }
};

export const createMessages = async (numMessages) => {
  try {
    const chats = await Chat.find().select("_id");
    const users = await User.find().select("_id");

    const messagePromise = [];

    for (let i = 0; i < numMessages; i++) {
      const randomChat = chats[Math.floor(Math.random() * chats.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];

      messagePromise.push(
        Message.create({
          chat: randomChat,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagePromise);
    console.log("Messages Created");
  } catch (error) {
    console.log(error);
  }
};

export const createMessagesInAChat = async (chatId, numMessages) => {
  try {
    const users = await User.find().select("_id");

    const messagePromise = [];

    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      messagePromise.push(
        Message.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence(),
        })
      );
    }

    await Promise.all(messagePromise);
    console.log("Messages Created");
  } catch (error) {
    console.log(error);
  }
};
