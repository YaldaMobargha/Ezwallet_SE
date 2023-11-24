import request from "supertest";
import { app } from "../app";
import { User, Group } from "../models/User.js";
import { transactions, categories } from "../models/model";
import mongoose, { Model } from "mongoose";
import dotenv from "dotenv";

/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */
dotenv.config();
beforeAll(async () => {
  const dbName = "testingDatabaseUsers";
  const url = `${process.env.MONGO_URI}/${dbName}`;

  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

/**
 * After all test cases have been executed the database is deleted.
 * This is done so that subsequent executions of the test suite start with an empty database.
 */
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

// Cookies needed to run the tests:
/*Admin cookies corresponding to the following information of the admin test user:
{
    "iss": "Online JWT Builder",
    "iat": 1686064916,
    "exp": 1717601075,
    "aud": "www.example.com",
    "sub": "jrocket@example.com",
    "email": "admin1@test.com",
    "role": "Admin",
    "username": "admin1",
}
*/
const adminCookie = {
  accessToken:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2ODYwNjQ5MTYsImV4cCI6MTcxNzYwMTA3NSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsImVtYWlsIjoiYWRtaW4xQHRlc3QuY29tIiwicm9sZSI6IkFkbWluIiwidXNlcm5hbWUiOiJhZG1pbjEiLCJpZCI6IjEifQ.fnDtBnOBNK58DgYnv8EwMwmjsnIoK3O2RVza0WU_v1A",
  refreshToken:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2ODYwNjQ5MTYsImV4cCI6MTcxNzYwMTA3NSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsImVtYWlsIjoiYWRtaW4xQHRlc3QuY29tIiwicm9sZSI6IkFkbWluIiwidXNlcm5hbWUiOiJhZG1pbjEiLCJpZCI6IjEifQ.fnDtBnOBNK58DgYnv8EwMwmjsnIoK3O2RVza0WU_v1A",
};
/*User cookies corresponding to the following information of a user solicitin information:
{
    "iss": "Online JWT Builder",
    "iat": 1686064916,
    "exp": 1717601952,
    "aud": "www.example.com",
    "sub": "jrocket@example.com",
    "email": "tester1@test.com",
    "role": "User",
    "username": "tester1",
    "password": "123456"
}
*/
const userCookie = {
  accessToken:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2ODYwNjQ5MTYsImV4cCI6MTcxNzYwMTk1MiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsImVtYWlsIjoidGVzdGVyMUB0ZXN0LmNvbSIsInJvbGUiOiJVc2VyIiwidXNlcm5hbWUiOiJ0ZXN0ZXIxIiwicGFzc3dvcmQiOiIxMjM0NTYifQ.Hsq6vURQMa65szV9-YH7WAAqXoCtc7Ebq7wYAUwL8Wo",
  refreshToken:
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2ODYwNjQ5MTYsImV4cCI6MTcxNzYwMTk1MiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsImVtYWlsIjoidGVzdGVyMUB0ZXN0LmNvbSIsInJvbGUiOiJVc2VyIiwidXNlcm5hbWUiOiJ0ZXN0ZXIxIiwicGFzc3dvcmQiOiIxMjM0NTYifQ.Hsq6vURQMa65szV9-YH7WAAqXoCtc7Ebq7wYAUwL8Wo",
};

describe("getUsers", () => {
  /**
   * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
   */
  beforeEach(async () => {
    await User.deleteMany({});
  });

  test("should return empty list if there are no users", (done) => {
    request(app)
      .get("/api/users")
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      )
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
        done();
      })
      .catch((err) => done(err));
  });

  test("should retrieve list of all users", (done) => {
    User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    }).then(() => {
      request(app)
        .get("/api/users")
        .set(
          "Cookie",
          `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
        )
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.data).toHaveLength(1);
          expect(response.body.data[0].username).toEqual("tester");
          expect(response.body.data[0].email).toEqual("test@test.com");
          expect(response.body.data[0].role).toEqual("Regular");
          done(); // Notify Jest that the test is complete
        })
        .catch((err) => done(err));
    });
  });

  test("should have status 401, as the soliciting user is not an admin", (done) => {
    request(app)
      .get("/api/users")
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      )
      .then((response) => {
        expect(response.status).toBe(401);
        expect(response.body.error).toBe("You are not an admin");
        done();
      })
      .catch((err) => done(err));
  });
});

describe("getUser", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
  });
  const solicitedUser = {
    email: "tester1@test.com",
    username: "tester1",
    password: "123456",
  };
  test("Should return the solicited user, by a request of an admin", (done) => {
    User.create(solicitedUser).then(() => {
      request(app)
        .get(`/api/users/${solicitedUser.username}`)
        .set(
          "Cookie",
          `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
        )
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.data.username).toBe(solicitedUser.username);
          expect(response.body.data.email).toBe(solicitedUser.email);
          expect(response.body.data.role).toBe("Regular");
          done();
        })
        .catch((err) => done(err));
    });
  });

  test("Should return the solicited user, by a request of the same user", (done) => {
    User.create(solicitedUser).then(() => {
      request(app)
        .get(`/api/users/${solicitedUser.username}`)
        .set(
          "Cookie",
          `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
        )
        .then((response) => {
          expect(response.status).toBe(200);
          expect(response.body.data.username).toBe(solicitedUser.username);
          expect(response.body.data.email).toBe(solicitedUser.email);
          expect(response.body.data.role).toBe("Regular");
          done();
        })
        .catch((err) => done(err));
    });
  });

  test("Should have status 400, as the user doesn't exist", (done) => {
    request(app)
      .get(`/api/users/${solicitedUser.username}`)
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      )
      .then((response) => {
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("User not found");
        done();
      })
      .catch((err) => done(err));
  });

  test("Should have status 401, as the request is not by the same user as the one solicited, and is not an admin", (done) => {
    request(app)
      .get(`/api/users/userTest2`)
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      )
      .then((response) => {
        expect(response.status).toBe(401);
        expect(response.body.error).toBe("You are not an admin");
        done();
      })
      .catch((err) => done(err));
  });
});

describe("createGroup", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("Should return a created group", async () => {
    await User.create({
      username: "tester1",
      email: "test1@test.com",
      password: "1234567",
      refreshToken: userCookie.refreshToken
    });
    await User.create({
      username: "tester2",
      email: "test2@test.com",
      password: "1234567",
    });
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["tester1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.group.name).toBe("Family");
    expect(response.body.data.group.members[0].email).toBe("test2@test.com");
    expect(response.body.data.group.members[1].email).toBe("tester1@test.com");
    expect(response.body.data.group.members).toHaveLength(2);
  });

  test("Should return status 400, as the body is incomplete", async () => {
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: [],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain non-empty `name` and non-empty array `memberEmails`"
    );
  });

  test("Should return status 401, as the cookies are incorrect", async () => {
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: [],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Mismatched tokens");
  });
  test("Should return status 400, as one of the emails on the body is written incorrectly", async () => {
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["tester1@test", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "At least one of the emails is in the wrong format or empty"
    );
  });

  test("Should return status 400, as there is already another group with the solicited name", async () => {
    const existingUser = new User({
      username: "existinguser",
      email: "existinguser@example.com",
      password: "password456",
    });
    await existingUser.save();
    await Group.create({ name: "Family", members: [existingUser] });

    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["tester1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "A group with the name Family already exists"
    );
  });
  test("Should return status 400, as the user requesting the creation already belongs to another group", async () => {
    const existingUser = new User({
      username: "tester1",
      email: "tester1@test.com",
      password: "password456",
    });
    await existingUser.save();
    await Group.create({ name: "School", members: [existingUser] });

    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["tester1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("You already belong to the group School");
  });

  test("Should return status 400, as the solicited members are already on a group", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester2",
      email: "test2@test.com",
      password: "1234567",
    });
    await Group.create({
      name: "School",
      members: [
        { username: "tester2", email: "test2@test.com" },
        { username: "test1", email: "test1@test.com" },
      ],
    });

    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["test1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users (minus you) already belong to other groups"
    );
  });

  test("Should return status 400, as the solicited members do not exist", async () => {
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["test1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users (minus you) do not exist"
    );
  });

  test("Should return status 400, as one solicited members do not exist and the other is in another group", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });
    await Group.create({
      name: "School",
      members: [{ username: "test1", email: "test1@test.com" }],
    });
    const response = await request(app)
      .post(`/api/groups`)
      .send({
        name: "Family",
        memberEmails: ["test1@test.com", "test2@test.com"],
      })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users (minus you) do not exist or are already in a group"
    );
  });
});

describe("getGroups", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("should return empty list if there are no groups", (done) => {
    request(app)
      .get("/api/groups")
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      )
      .then((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(0);
        done();
      })
      .catch((err) => done(err));
  });

  test("should return the list of the groups", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "test1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "test2@test.com",
          password: "1234567",
        }),
      ],
    });

    await Group.create({
      name: "School",
      members: [
        new User({
          username: "test3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "test3",
          email: "test3@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .get("/api/groups")
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data[0].name).toBe("Family");
    expect(response.body.data[1].name).toBe("School");
    expect(response.body.data).toHaveLength(2);
  });

  test("should return status 401, as the soliciting user is not an admin", async () => {
    const response = await request(app)
      .get("/api/groups")
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not an admin");
  });
});

describe("getGroup", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("should return the solicited group, solicited by a member user", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "test1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "test2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .get("/api/groups/Family")
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Family");
    expect(response.body.data.members).toHaveLength(2);
  });
  test("should return status 400, as the group doesn't exist", async () => {
    const response = await request(app)
      .get("/api/groups/Family")
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("The requested group doesn't exist");
  });

  test("Should return status 401, as the soliciting user is neither in the group or an admin", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "test1",
          email: "example1@test.com",
          password: "1234567",
        }),
        new User({
          username: "test2",
          email: "example2@test.com",
          password: "1234567",
        }),
      ],
    });
    const response = await request(app)
      .get("/api/groups/Family")
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not an admin");
  });
});

describe("addToGroup", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("Should add the users listed to the group Family", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.group.members).toHaveLength(4);
  });

  test("Should add the users listed to the group Family, as requested by an admin", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/insert")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.group.members).toHaveLength(4);
  });

  test("should return status 400, as the group doesn't exist", async () => {
    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("The requested group doesn't exist");
  });

  test("Should return status 400, as the request body is incomplete", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: [] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain a non-empty array `emails`"
    );
  });

  test("Should return status 401, as the soliciting user is neither in the group or an admin", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "test1",
          email: "example1@test.com",
          password: "1234567",
        }),
        new User({
          username: "test2",
          email: "example2@test.com",
          password: "1234567",
        }),
      ],
    });
    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not member of this group");
  });

  test("Should return status 400, as one of the emails is wronglly written", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["tester@test,com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "At least one of the emails is in the wrong format or empty"
    );
  });

  test("Should return status 400, as the solicited users doesn't exist", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("All the given users do not exist");
  });

  test("Should return status 400, as the solicited users already are on another group", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await Group.create({
      name: "School",
      members: [
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users already belong to other groups"
    );
  });

  test("Should return status 400, as the solicited users already are on another group or doesn't exist", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await Group.create({
      name: "School",
      members: [
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/add")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users do not exist or are already in a group"
    );
  });
});

describe("removeFromGroup", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("Should remove the users listed to the group Family", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.group.members).toHaveLength(2);
  });

  test("Should remove the users listed to the group Family, as requested by a admin", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/pull")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(200);
    expect(response.body.data.group.members).toHaveLength(2);
  });

  test("should return status 400, as the group doesn't exist", async () => {
    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("The requested group doesn't exist");
  });

  test("Should return status 400, as the request body is incomplete", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: [] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain a non empty-array `emails`"
    );
  });

  test("Should return status 401, as the soliciting user is neither in the group or an admin", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "test1",
          email: "example1@test.com",
          password: "1234567",
        }),
        new User({
          username: "test2",
          email: "example2@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });
    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not member of this group");
  });

  test("Should return status 400, as one of the emails on the body is wronglly written", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester3",
          email: "test3@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester4",
          email: "test4@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test4@test,com", ""] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "At least one of the emails is in the wrong format or empty"
    );
  });

  test("Should return status 400, as there is only one member on the group, and can't be removed", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["tester1@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "The requested group has only one member and they can't be removed"
    );
  });

  test("Should return status 400, as all the solicited users are not in the group", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });
    await User.create({
      username: "tester4",
      email: "test4@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users don't belong to this group"
    );
  });

  test("Should return status 400, as all the solicited users do not exist", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("All the given users don't exist");
  });

  test("Should return status 400, as all the solicited users do not exist or are in another group", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    await User.create({
      username: "tester3",
      email: "test3@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .patch("/api/groups/Family/remove")
      .send({ emails: ["test3@test.com", "test4@test.com"] })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "All the given users do not exist or are not in this group"
    );
  });
});

describe("deleteUser", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("Should delete the solicited user", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });

    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.deletedTransactions).toBe(0);
    expect(response.body.data.deletedFromGroup).toBe(false);
  });

  test("Should delete the solicited user, and remove him from the group", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });

    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "test1",
          email: "test1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.deletedTransactions).toBe(0);
    expect(response.body.data.deletedFromGroup).toBe(true);
  });

  test("Should delete the solicited user, and remove his transactions", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });

    await transactions.create({
      username: "test1",
      amount: 100,
    });

    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.deletedTransactions).toBe(1);
    expect(response.body.data.deletedFromGroup).toBe(false);
  });

  test("Should return status 401, as the solicitng user is not an admin", async () => {
    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not an admin");
  });

  test("Should return status 400, as the request body has an incorrect mail format", async () => {
    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test,com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain a non-empty, valid `email`"
    );
  });

  test("Should return status 400, as the requested user doesn't exist", async () => {
    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("The requested user doesn't exist");
  });

  test("Should return status 400, as the requested user is an Admin", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "!1234",
      role: "Admin",
    });

    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "The requested user is an admin and cannot be deleted"
    );
  });

  test("Should delete the solicited user, and delete the group", async () => {
    await User.create({
      username: "test1",
      email: "test1@test.com",
      password: "1234567",
    });

    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "test1",
          email: "test1@test.com",
          password: "1234567",
        }),
      ],
    });

    const response = await request(app)
      .delete("/api/users")
      .send({ email: "test1@test.com" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.deletedTransactions).toBe(0);
    expect(response.body.data.deletedFromGroup).toBe(true);
  });
});

describe("deleteGroup", () => {
  //Cleaning the database
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  });

  test("Should delete the group", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    const response = await request(app)
      .delete("/api/groups")
      .send({ name: "Family" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe("Group deleted successfully");
  });
  test("should return status 400, as the group doesn't exist", async () => {
    const response = await request(app)
      .delete("/api/groups")
      .send({ name: "Family" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("The requested group doesn't exist");
  });

  test("should return status 400, as the body is incomplete", async () => {
    await Group.create({
      name: "Family",
      members: [
        new User({
          username: "tester1",
          email: "tester1@test.com",
          password: "1234567",
        }),
        new User({
          username: "tester2",
          email: "tester2@test.com",
          password: "1234567",
        }),
      ],
    });
    const response = await request(app)
      .delete("/api/groups")
      .send({ name: "" })
      .set(
        "Cookie",
        `accessToken=${adminCookie.accessToken};refreshToken=${adminCookie.refreshToken}`
      );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain a non-empty `name`"
    );
  });

  test("should return status 401, as the requesting user is not an admin", async () => {
    const response = await request(app)
      .delete("/api/groups")
      .send({ name: "Family" })
      .set(
        "Cookie",
        `accessToken=${userCookie.accessToken};refreshToken=${userCookie.refreshToken}`
      );

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not an admin");
  });
});
