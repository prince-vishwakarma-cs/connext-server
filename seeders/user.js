import { User } from "../models/user.js";
import { faker } from "@faker-js/faker";

export const createUSer = async (numUsers) => {
  try {
    const userPromise = [];
    for (let i = 0; i < numUsers; i++) {
      const user = {
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          public_id: faker.system.fileName(),
          url: faker.image.avatar(),
        },
      };
      userPromise.push(User.create(user));
    } 

    await Promise.all(userPromise);

    console.log("UsersCreated")
  } catch (error) {
    console.log(error);
  }
};
