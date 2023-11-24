import request from "supertest";
import { app } from "../app";
import { transactions } from "..//models/model.js";
import { Group, User } from "../models/User.js";
import { verifyAuth } from "../controllers/utils";
import jwt from "jsonwebtoken";

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock("../models/User.js");
jest.mock("../models/model.js");
jest.mock("jsonwebtoken");

/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
  User.find.mockClear();
  User.findOne.mockClear();
  Group.find.mockClear();
  Group.findOne.mockClear();
  Group.findOneAndDelete.mockClear();
  jwt.verify.mockClear();
  transactions.deleteMany.mockClear();
  //additional `mockClear()` must be placed here
});

const { getUsers } = require("../controllers/users");

describe("getUsers", () => {
  test("should return 401 error, as there is no admin permissions to perform the action", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUsers = [
      {
        username: "test1",
        email: "test1@example.com",
        password: "hashedPassword1",
      },
      {
        username: "test2",
        email: "test2@example.com",
        password: "hashedPassword2",
      },
    ];

    const mockUser = {
      username: "tester",
      email: "tester@example.com",
      role: "Regular",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => mockUser);
    await getUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "You are not an admin",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should retrieve list of all users", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const adminUser = {
      username: "admin1",
      email: "admin@test.com",
      role: "Admin",
    };

    jest.spyOn(User, "find").mockImplementation(() => retrievedUsers);
    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    await getUsers(req, res);

    expect(User.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: retrievedUsers,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return an empty list", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const adminUser = {
      username: "admin1",
      email: "admin@test.com",
      role: "Admin",
    };

    jest.spyOn(User, "find").mockImplementation(() => []);
    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    await getUsers(req, res);

    expect(User.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return a 500 error in case of error", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const adminUser = {
      username: "admin1",
      email: "admin@test.com",
      role: "Admin",
    };
    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    jest.spyOn(User, "find").mockImplementation(() => {
      throw new Error("Server error");
    });
    await getUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { getUser } = require("../controllers/users");
describe("getUser", () => {
  test("should get the information of the user", async () => {
    const req = {
      params: {
        username: "test1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUser = {
      username: "test1",
      email: "test1@example.com",
      role: "Regular",
    };

    jest.spyOn(User, "findOne").mockResolvedValue(retrievedUser);
    jest.spyOn(jwt, "verify").mockImplementation(() => retrievedUser);

    await getUser(req, res);

    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: retrievedUser,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 400, and a message of user not found", async () => {
    const req = {
      params: {
        username: "test1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUser = {
      username: "test1",
      email: "test1@example.com",
      role: "Regular",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => retrievedUser);
    jest.spyOn(User, "findOne").mockResolvedValue();

    await getUser(req, res);

    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "User not found",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 500 as a server error", async () => {
    const req = {
      params: {
        username: "test1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUser = {
      username: "test1",
      email: "test1@example.com",
      role: "Regular",
    };

    jest.spyOn(User, "findOne").mockImplementation(() => {
      throw new Error("Server error");
    });
    jest.spyOn(jwt, "verify").mockImplementation(() => retrievedUser);

    await getUser(req, res);

    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });

  test("should return a 401 error as user is not admin ", async () => {
    const req = {
      params: {
        username: "test1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const retrievedUser = {
      username: "test1",
      email: "test1@example.com",
      role: "Regular",
    };

    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "Regular",
    };

    jest.spyOn(User, "findOne").mockResolvedValue(retrievedUser);
    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "You are not an admin",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });
});

const { createGroup } = require("../controllers/users");
describe("createGroup", () => {
  test("should return status 200 and the created group", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const createdGroup = {
      name: "Family",
      members: [{email: "test1@example.com"}, {email: "test2@example.com"}],
    };

    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn().mockResolvedValue();
    Group.create = jest
      .fn()
      .mockResolvedValue({ name: "Family", members: groupUsers });
    jest.spyOn(User, "findOne").mockImplementation((email) => {
      return groupUsers.filter((user) => user.email === email);
    });

    await createGroup(req, res);
    expect(Group.findOne).toHaveBeenCalled();
    expect(Group.create).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { group: createdGroup, alreadyInGroup: [], membersNotFound: [] },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as a group with that name already exists", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const savedGroup = {
      id: 1,
      name: "Family",
      members: [],
    };
    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn().mockResolvedValue(savedGroup);

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: `A group with the name ${savedGroup.name} already exists`,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as the request body is incomplete", async () => {
    const req = {
      body: {
        name: "Family",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Request's body is incomplete: it should contain non-empty `name` and non-empty array `memberEmails`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as one or more emails are on the wrong format", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example,com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one of the emails is in the wrong format or empty",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as the soliciting user is already on a Group", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const createdGroup = {
      id: 1,
      name: "Family",
      members: ["test2@example.com"],
    };

    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((query) => {
      return query.members ? createdGroup : null;
    });

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: `You already belong to the group ${createdGroup.name}`,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as the solicited members are already on a group", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const createdGroup = {
      id: 1,
      name: "Family",
      members: ["test2@example.com"],
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);

    Group.findOne = jest.fn((query) => {
      if (query.members) {
        const email = query.members.$elemMatch.email;
        return email === solicitingUser.email ? null : createdGroup;
      }
      return null;
    });

    User.findOne = jest.fn((query) => {
      return query.email !== solicitingUser.email ? createdGroup : null;
    });

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: `All the given users (minus you) already belong to other groups`,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 401, because of an authentication error", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
    };

    jest.spyOn(jwt, "verify").mockResolvedValue(solicitingUser);

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token is missing information",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 400, as the solicited members do not exist", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };
    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);

    Group.findOne = jest.fn();

    User.findOne = jest.fn((query) => {
      return query.email === solicitingUser.email ? solicitingUser : null;
    });

    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "All the given users (minus you) do not exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 500, because of a server error", async () => {
    const req = {
      body: {
        name: "Family",
        memberEmails: ["test1@example.com", "test2@example.com"],
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn(() => {
      throw new Error("Server error");
    });
    await createGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { getGroups } = require("../controllers/users");
describe("getGroups", () => {
  test("should retrieve list of all the groups", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const groupUsers1 = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const groupUsers2 = [
      {
        username: "test3",
        email: "test3@example.com",
      },
      {
        username: "test4",
        email: "test4@example.com",
      },
    ];

    const retrieveredGroups = [
      {
        name: "Family1",
        members: groupUsers1,
      },
      {
        name: "Family2",
        members: groupUsers2,
      },
    ];

    const receivedGroups = [
      {
        name: "Family1",
        members: [{email: "test1@example.com"}, {email: "test2@example.com"}],
      },
      {
        name: "Family2",
        members: [{email: "test3@example.com"}, {email: "test4@example.com"}],
      },
    ];

    const adminUser = {
      username: "admin1",
      email: "admin@test.com",
      role: "Admin",
    };

    jest.spyOn(Group, "find").mockImplementation(() => retrieveredGroups);
    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    await getGroups(req, res);
    expect(Group.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: receivedGroups,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 401, because of an authentication error", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "admin1",
      email: "admin@test.com",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    await getGroups(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Token is missing information",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 500, because of a server error", async () => {
    const req = {
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "Admin",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.find = jest.fn(() => {
      throw new Error("Server error");
    });

    await getGroups(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { getGroup } = require("../controllers/users");
describe("getGroup", () => {
  test("should retrieve list of the solicited group", async () => {
    const req = {
      params: {
        name: "Family",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const retrieveredGroup = {
      name: "Family",
      members: groupUsers,
    };

    const receivedGroups = {
      name: "Family",
      members: [{email: "test1@example.com"}, {email: "test2@example.com"}],
    };

    const solicitingUser = {
      username: "test1",
      email: "test1@example.com",
      role: "User",
    };

    jest.spyOn(Group, "findOne").mockImplementation(() => retrieveredGroup);
    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    await getGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      data: receivedGroups,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("return status 400, as the requested group doesn't exist", async () => {
    const req = {
      params: {
        name: "Family",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test1",
      email: "test1@example.com",
      role: "User",
    };

    jest.spyOn(Group, "findOne").mockResolvedValue();
    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    await getGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
    });
  });

  test("return status 401, as the verification isn't correct", async () => {
    const req = {
      params: {
        name: "Family",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];
    const retrieveredGroup = {
      name: "Family",
      members: groupUsers,
    };
    const solicitingUser = {
      username: "test1",
      email: "test1@example.com",
    };

    jest.spyOn(Group, "findOne").mockResolvedValue(retrieveredGroup);
    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    await getGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "Token is missing information",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 500, because of a server error", async () => {
    const req = {
      params: {
        name: "Family",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const solicitingUser = {
      username: "test2",
      email: "test2@example.com",
      role: "Admin",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn(() => {
      throw new Error("Server error");
    });

    await getGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { addToGroup } = require("../controllers/users");
describe("addToGroup", () => {
  const groupUsers = [
    {
      username: "test1",
      email: "test1@example.com",
    },
    {
      username: "test2",
      email: "test2@example.com",
    },
    {
      username: "test3",
      email: "test3@example.com",
    },
    {
      username: "test4",
      email: "test4@example.com",
    },
  ];

  const solicitingUser = {
    username: "test1",
    email: "test1@example.com",
    role: "User",
  };
  test("Should add the members to the group", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };
    const originalGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
      save: jest.fn(),
    };

    const createdGroup = {
      name: "Family",
      members: groupUsers.map((user) => Object.assign(
        {},
        {
          email: user.email,
        }
      )),
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn(async (params) => {
      return params.name ? originalGroup : null;
    });
    User.findOne = jest.fn((params) => {
      return groupUsers.filter((user) => user.email === params.email);
    });

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      data: { group: createdGroup, alreadyInGroup: [], membersNotFound: [] },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should have status 400, as requested group doesn't exist", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    Group.findOne = jest.fn();

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
    });
  });

  test("Should have status 400, as the body doesn't contain any mails", async () => {
    const req = {
      body: {
        emails: [],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? createdGroup : null;
    });

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Request's body is incomplete: it should contain a non-empty array `emails`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as one email is wronglly written", async () => {
    const req = {
      body: {
        emails: ["test3@test.com", "test4@test-com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? createdGroup : null;
    });

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one of the emails is in the wrong format or empty",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as all the members are already on a group", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn().mockResolvedValue(createdGroup);
    User.findOne = jest.fn((params) => {
      return groupUsers.filter((user) => user.email === params.email);
    });
    Group.save = jest.fn().mockResolvedValue(true);

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "All the given users already belong to other groups",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as the members doesn't exist", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn().mockResolvedValue(createdGroup);
    User.findOne = jest.fn();

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "All the given users do not exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return error 500, because of a server error", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/add",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn(() => {
      throw new Error("Server error");
    });

    await addToGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { removeFromGroup } = require("../controllers/users");
describe("removeFromGroup", () => {
  const groupUsers = [
    {
      username: "test1",
      email: "test1@example.com",
    },
    {
      username: "test2",
      email: "test2@example.com",
    },
    {
      username: "test3",
      email: "test3@example.com",
    },
    {
      username: "test4",
      email: "test4@example.com",
    },
  ];

  const solicitingUser = {
    username: "test1",
    email: "test1@example.com",
    role: "User",
  };
  test("Should remove the members from the group", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const originalGroup = {
      name: "Family",
      members: groupUsers,
      save: jest.fn(),
    };

    const mockResult = {
      name: "Family",
      members: [{email: groupUsers[0].email}, {email: groupUsers[1].email}],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? originalGroup : null;
    });
    User.findOne = jest.fn((params) => {
      return groupUsers.filter((user) => user.email === params.email);
    });

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      data: { group: mockResult, notInGroup: [], membersNotFound: [] },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should have status 400, as requested group doesn't exist", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    Group.findOne = jest.fn();

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
    });
  });

  test("Should have status 400, as the body doesn't contain any mails", async () => {
    const req = {
      body: {
        emails: [],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const groupUsers = [
      {
        username: "test1",
        email: "test1@example.com",
      },
      {
        username: "test2",
        email: "test2@example.com",
      },
    ];

    const createdGroup = {
      name: "Family",
      members: groupUsers,
    };

    const solicitingUser = {
      username: "test1",
      email: "test1@example.com",
      role: "User",
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? createdGroup : null;
    });

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Request's body is incomplete: it should contain a non empty-array `emails`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as one email is wronglly written", async () => {
    const req = {
      body: {
        emails: ["test3@test,com", "test4@test.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: groupUsers,
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? createdGroup : null;
    });
    User.findOne = jest.fn((params) => {
      return groupUsers.filter((user) => user.email === params.email);
    });
    Group.save = jest.fn().mockResolvedValue(true);

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one of the emails is in the wrong format or empty",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as there is only one member on the group and can't be removed", async () => {
    const req = {
      body: {
        emails: ["test1@test,com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const createdGroup = {
      name: "Family",
      members: [groupUsers[0]],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? createdGroup : null;
    });

    await removeFromGroup(req, res);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one of the emails is in the wrong format or empty",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
  });

  test("Should return status 400, as all the members are not on the solicited group", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const originalGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
      save: jest.fn(),
    };

    const mockResult = {
      name: "Family",
      members: [groupUsers[0].email, groupUsers[1].email],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? originalGroup : null;
    });
    User.findOne = jest.fn((params) => {
      return groupUsers.filter((user) => user.email === params.email);
    });

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "All the given users don't belong to this group",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 400, as the members doesn't exist", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const originalGroup = {
      name: "Family",
      members: [groupUsers[0], groupUsers[1]],
      save: jest.fn(),
    };

    const mockResult = {
      name: "Family",
      members: [groupUsers[0].email, groupUsers[1].email],
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      return params.name ? originalGroup : null;
    });
    User.findOne = jest.fn();

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Group.findOne).toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "All the given users don't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 500, because of a server error", async () => {
    const req = {
      body: {
        emails: ["test3@example.com", "test4@example.com"],
      },
      params: {
        name: "Family",
      },
      url: "/groups/Family/remove",
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => solicitingUser);
    Group.findOne = jest.fn((params) => {
      throw new Error("Server error");
    });

    await removeFromGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { deleteUser } = require("../controllers/users");
describe("deleteUser", () => {
  const adminUser = {
    username: "admin1",
    email: "admin@test.com",
    role: "Admin",
  };
  const mockUsers = [
    {
      username: "test1",
      email: "test1@example.com",
      role: "User",
    },
    {
      username: "test2",
      email: "test2@example.com",
      role: "User",
    },
    {
      username: "test3",
      email: "test3@example.com",
      role: "User",
    },
  ];
  test("Deleted the user from the database, that isn't a member of a group", async () => {
    const req = {
      body: {
        email: "test3@example.com",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const expectedUsers = [...mockUsers].splice(-1);

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    User.findOne = jest.fn((param) => {
      return mockUsers.filter((user) => user.email === param.email);
    });
    transactions.deleteMany = jest.fn().mockResolvedValue({
      deletedCount: 3, // Mock of the deletion of the transactions of the user
    });
    Group.findOne = jest.fn();

    await deleteUser(req, res);
    expect(User.findOne).toHaveBeenCalled();
    expect(transactions.deleteMany).toHaveBeenCalled();
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        deletedTransactions: 3,
        deletedFromGroup: false,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Deleted the user from the database, that is a member of a group", async () => {
    const req = {
      body: {
        email: "test3@example.com",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const expectedUsers = [...mockUsers].splice(-1);

    const mockGroup = {
      name: "Family",
      members: [mockUsers[0], mockUsers[2]],
      save: jest.fn(),
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    User.findOne = jest.fn((param) => {
      return mockUsers.filter((user) => user.email === param.email);
    });
    transactions.deleteMany = jest.fn().mockResolvedValue({
      deletedCount: 3, // Mock of the deletion of the transactions of the user
    });
    Group.findOne = jest.fn().mockResolvedValue(mockGroup);

    await deleteUser(req, res);
    expect(User.findOne).toHaveBeenCalled();
    expect(transactions.deleteMany).toHaveBeenCalled();
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        deletedTransactions: 3,
        deletedFromGroup: true,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 400, as user is an admin", async () => {
    const req = {
      body: {
        email: "test3@example.com",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const newMock = [...mockUsers];
    newMock[2].role = "Admin";

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    User.findOne = jest.fn().mockResolvedValue(newMock[2]);

    await deleteUser(req, res);
    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user is an admin and cannot be deleted",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });
  test("should return status 400, as the request body is incomplete", async () => {
    const req = {
      body: {
        email: "",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    const newMock = [...mockUsers];
    newMock[2].role = "Admin";

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);

    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Request's body is incomplete: it should contain a non-empty, valid `email`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 400, as user doesn't exist", async () => {
    const req = {
      body: {
        email: "test3@test.com",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    User.findOne = jest.fn();
    await deleteUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 500, because of a server error", async () => {
    const req = {
      body: {
        email: "test3@test.com",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    User.findOne = jest.fn(() => {
      throw new Error("Server error");
    });

    await deleteUser(req, res);
    expect(User.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});

const { deleteGroup } = require("../controllers/users");
describe("deleteGroup", () => {
  const groupUsers1 = [
    {
      username: "test1",
      email: "test1@example.com",
    },
    {
      username: "test2",
      email: "test2@example.com",
    },
  ];
  const groupUsers2 = [
    {
      username: "test3",
      email: "test3@example.com",
    },
    {
      username: "test4",
      email: "test4@example.com",
    },
  ];
  const mockGroups = [
    {
      name: "Family1",
      members: groupUsers1,
    },
    {
      name: "Family2",
      members: groupUsers2,
    },
  ];
  const adminUser = {
    username: "admin1",
    email: "admin@test.com",
    role: "Admin",
  };
  test("Should delete the group from the mockGroups", async () => {
    const req = {
      body: {
        name: "Family1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    Group.findOneAndDelete = jest.fn((param) => {
      return mockGroups.filter((group) => group.name === param.name);
    });

    await deleteGroup(req, res);
    expect(Group.findOneAndDelete).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { message: "Group deleted successfully" },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 400, as group doesn't exist", async () => {
    const req = {
      body: {
        name: "Family1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    Group.findOneAndDelete = jest.fn();

    await deleteGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("should return status 400, as the body is incomplete", async () => {
    const req = {
      body: {
        name: "",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);

    await deleteGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Request's body is incomplete: it should contain a non-empty `name`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test("Should return status 500, because of a server error ", async () => {
    const req = {
      body: {
        name: "Family1",
      },
      cookies: {
        accessToken: "validAccessToken",
        refreshToken: "validRefreshToken",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      },
    };

    jest.spyOn(jwt, "verify").mockImplementation(() => adminUser);
    Group.findOneAndDelete = jest.fn((param) => {
      throw new Error("Server error");
    });
    await deleteGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Server error",
    });
  });
});
