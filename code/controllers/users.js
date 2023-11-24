import { Group, User } from "../models/User.js";
import { transactions } from "../models/model.js";
import { verifyAuth } from "./utils.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * Return all the users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
  - Optional behavior:
    - empty array is returned if there are no users
 */
export const getUsers = async (req, res) => {
  try {
    //check if the user that sent the request is an admin
    const check = verifyAuth(req, res, { authType: "Admin" });
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const users = await User.find();
    const data = users.map((user) =>
      Object.assign(
        {},
        {
          username: user.username,
          email: user.email,
          role: user.role,
        }
      )
    );

    return res.status(200).json({
      data: data,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Return information of a specific user
  - Request Body Content: None
  - Response `data` Content: An object having attributes `username`, `email` and `role`.
  - Optional behavior:
    - error 401 is returned if the user is not found in the system
 */
export const getUser = async (req, res) => {
  try {
    //check if the user is a `Regular` trying to access their own page or an `Admin`
    const userCheck = verifyAuth(req, res, {
      authType: "User",
      username: req.params.username,
    });
    const adminCheck = verifyAuth(req, res, { authType: "Admin" });

    if (!userCheck.flag && !adminCheck.flag) {
      //the user that sent the request is trying to access another user's data but is not an admin
      return res.status(401).json({
        error: adminCheck.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check if the requested user exists
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(400).json({
        error: "User not found",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    return res.status(200).json({
      data: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new group
  - Request Body Content: An object having a string attribute for the `name` of the group and an array that lists all the `emails`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name`
    of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members
    (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email
    does not appear in the system)
  - Optional behavior:
    - error 401 is returned if there is already an existing group with the same name
    - error 401 is returned if all the `emails` either do not exist or are already in a group
 */
export const createGroup = async (req, res) => {
  try {
    const { name, memberEmails } = req.body;

    //check if the user has valid credentials
    const check = verifyAuth(req, res, { authType: "Simple" });
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    if (
      !name ||
      name.length === 0 ||
      !memberEmails ||
      memberEmails.length === 0
    ) {
      return res.status(400).json({
        error:
          "Request's body is incomplete: it should contain non-empty `name` and non-empty array `memberEmails`",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check that all emails passed in the body have a valid format and are not empty strings:
    //at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
    const regex = /^\w+@\w+\.\w+$/;
    for (const currentEmail of memberEmails) {
      if (!regex.test(currentEmail) || currentEmail.length === 0) {
        //wrong format
        return res.status(400).json({
          error: "At least one of the emails is in the wrong format or empty",
          refreshedTokenMessage: res.locals.refreshedTokenMessage,
        });
      }
    }

    //check if the group already exists
    const foundGroup = await Group.findOne({ name: name });
    if (foundGroup) {
      return res.status(400).json({
        error: "A group with the name " + name + " already exists",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check that the user is not in a group already
    //decode refresh token
    const decodedRefreshToken = jwt.verify(
      req.cookies.refreshToken,
      process.env.ACCESS_KEY
    );
    const currentUserGroup = await Group.findOne({
      members: {
        $elemMatch: {
          email: decodedRefreshToken.email,
        },
      },
    });
    if (currentUserGroup) {
      return res.status(400).json({
        error: "You already belong to the group " + currentUserGroup.name,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //remove the calling user's email from the list, if present
    const index = memberEmails.indexOf(decodedRefreshToken.email);
    if (index > -1) {
      memberEmails.splice(index, 1);
    }

    let newMembersArray = []; //will contain the new members to be added to the group
    let alreadyInGroupArray = []; //will contain the users which are already in a group
    let notFoundMembersArray = []; //will contain the members whose emails were not found

    for (const currentEmail of memberEmails) {
      const foundUser = await User.findOne({ email: currentEmail });
      if (foundUser) {
        //the user exists: check if they already belong to a group
        const userGroup = await Group.findOne({
          members: {
            $elemMatch: {
              email: currentEmail,
            },
          },
        });
        if (userGroup) {
          //the user already belongs to a group
          alreadyInGroupArray.push(currentEmail);
        } else {
          //the user doesn't belong to a group: add their email and `_id` to newMembers
          newMembersArray.push({
            email: currentEmail,
            user: foundUser._id,
          });
        }
      } else {
        //the user doesn't exist
        notFoundMembersArray.push(currentEmail);
      }
    }

    if (alreadyInGroupArray.length === memberEmails.length) {
      return res.status(400).json({
        error: "All the given users (minus you) already belong to other groups",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (notFoundMembersArray.length === memberEmails.length) {
      return res.status(400).json({
        error: "All the given users (minus you) do not exist",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (
      notFoundMembersArray.length + alreadyInGroupArray.length ===
      memberEmails.length
    ) {
      return res.status(400).json({
        error:
          "All the given users (minus you) do not exist or are already in a group",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const requestingUser = await User.findOne({
      refreshToken: req.cookies.refreshToken,
    });

    //add the user's email is in the list they sent
    newMembersArray.push({
      email: decodedRefreshToken.email,
      user: requestingUser._id,
    });

    const newGroup = await Group.create({
      name: name,
      members: newMembersArray,
    });

    const createdGroupEmails = newGroup.members.map((user) =>
      Object.assign(
        {},
        {
          email: user.email,
        }
      )
    );

    return res.status(200).json({
      data: {
        group: {
          name: newGroup.name,
          members: createdGroupEmails,
        },
        alreadyInGroup: alreadyInGroupArray,
        membersNotFound: notFoundMembersArray,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Return all the groups
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group
    and an array for the `members` of the group
  - Optional behavior:
    - empty array is returned if there are no groups
 */
export const getGroups = async (req, res) => {
  try {
    const check = verifyAuth(req, res, { authType: "Admin" });
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const groups = await Group.find();
    let data = groups.map((el) =>
      Object.assign(
        {},
        {
          name: el.name,
          members: el.members.map((user) =>
            Object.assign(
              {},
              {
                email: user.email,
              }
            )
          ),
        }
      )
    );
    return res.status(200).json({
      data: data,
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Return information of a specific group
  - Request Body Content: None
  - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the 
    `members` of the group
  - Optional behavior:
    - error 401 is returned if the group does not exist
 */
export const getGroup = async (req, res) => {
  try {
    //fetch the requested group
    const group = await Group.findOne({ name: req.params.name });
    if (!group) {
      //the group doesn't exist
      return res.status(400).json({
        error: "The requested group doesn't exist",
      });
    }

    //check if the user is a `Regular` trying to access their own page or an `Admin`
    const emailsArray = group.members.map((el) => el.email);
    const userCheck = verifyAuth(req, res, {
      authType: "Group",
      emails: emailsArray,
    });
    const adminCheck = verifyAuth(req, res, { authType: "Admin" });
    if (!userCheck.flag && !adminCheck.flag) {
      //the user that sent the request is trying to access another user's data but is not an admin
      return res.status(401).json({
        error: adminCheck.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const memberEmails = group.members.map((user) =>
      Object.assign(
        {},
        {
          email: user.email,
        }
      )
    );

    //the request is authorized
    return res.status(200).json({
      data: {
        name: group.name,
        members: memberEmails,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Add new members to a group
  - Request Body Content: An array of strings containing the emails of the members to add to the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include the new members as well as the old ones), 
    an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - error 401 is returned if all the `emails` either do not exist or are already in a group
 */
export const addToGroup = async (req, res) => {
  try {
    const { emails } = req.body;

    //fetch the requested group
    const group = await Group.findOne({ name: req.params.name });
    if (!group) {
      //the group doesn't exist
      return res.status(400).json({
        error: "The requested group doesn't exist",
      });
    }

    //get to which endpoint was the request sent
    const requestedEndpoint = req.url.split("?")[0]; //remove the query (if any)
    const userEndpoint = "/groups/" + req.params.name + "/add";

    //based on the endpoint, check if the user is a `Regular` trying to access their own group or an `Admin`
    let check;
    if (requestedEndpoint === userEndpoint) {
      //the request was sent to the user's endpoint
      const emailsArray = group.members.map((el) => el.email);
      check = verifyAuth(req, res, {
        authType: "Group",
        emails: emailsArray,
      });
    } else {
      //the request was sent to the admin's endpoint
      check = verifyAuth(req, res, { authType: "Admin" });
    }
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    if (!emails || emails.length === 0) {
      return res.status(400).json({
        error:
          "Request's body is incomplete: it should contain a non-empty array `emails`",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check that all emails passed in the body have a valid format and are not empty strings:
    //at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
    const regex = /^\w+@\w+\.\w+$/;
    for (const currentEmail of emails) {
      if (!regex.test(currentEmail) || currentEmail.length === 0) {
        //wrong format
        return res.status(400).json({
          error: "At least one of the emails is in the wrong format or empty",
          refreshedTokenMessage: res.locals.refreshedTokenMessage,
        });
      }
    }

    //the request is authorised
    let alreadyInGroupArray = []; //will contain the users which are already in a group
    let notFoundMembersArray = []; //will contain the members whose emails were not found

    for (const currentEmail of emails) {
      const foundUser = await User.findOne({ email: currentEmail });
      if (foundUser) {
        //the user exists: check if they already belong to a group
        const userGroup = await Group.findOne({
          members: {
            $elemMatch: {
              email: currentEmail,
            },
          },
        });
        if (userGroup) {
          //the user already belongs to a group
          alreadyInGroupArray.push(currentEmail);
        } else {
          //the user doesn't belong to a group: add their `email` and `id` to the group's members list
          group.members.push({
            email: currentEmail,
            user: foundUser._id,
          });
        }
      } else {
        //the user doesn't exist
        notFoundMembersArray.push(currentEmail);
      }
    }

    if (alreadyInGroupArray.length === emails.length) {
      return res.status(400).json({
        error: "All the given users already belong to other groups",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (notFoundMembersArray.length === emails.length) {
      return res.status(400).json({
        error: "All the given users do not exist",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (
      notFoundMembersArray.length + alreadyInGroupArray.length ===
      emails.length
    ) {
      return res.status(400).json({
        error: "All the given users do not exist or are already in a group",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    await group.save();

    const memberEmails = group.members.map((user) =>
      Object.assign(
        {},
        {
          email: user.email,
        }
      )
    );

    return res.status(200).json({
      data: {
        group: {
          name: group.name,
          members: memberEmails,
        },
        alreadyInGroup: alreadyInGroupArray,
        membersNotFound: notFoundMembersArray,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Remove members from a group
  - Request Body Content:  an array of strings containing the `emails` of the members to remove from the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include only the remaining members),
    an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - error 401 is returned if all the `emails` either do not exist or are not in the group
 */
export const removeFromGroup = async (req, res) => {
  try {
    const { emails } = req.body;

    //fetch the requested group
    const group = await Group.findOne({ name: req.params.name });
    if (!group) {
      return res
        .status(400)
        .json({ error: "The requested group doesn't exist" });
    }

    //get to which endpoint was the request sent
    const requestedEndpoint = req.url.split("?")[0]; //remove the query (if any)
    const userEndpoint = "/groups/" + req.params.name + "/remove";

    let check;
    if (requestedEndpoint === userEndpoint) {
      //the request was sent to the user's endpoint
      const emailsArray = group.members.map((el) => el.email);
      check = verifyAuth(req, res, {
        authType: "Group",
        emails: emailsArray,
      });
    } else {
      //the request was sent to the admin's endpoint
      check = verifyAuth(req, res, { authType: "Admin" });
    }
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    if (!emails || emails.length === 0) {
      return res.status(400).json({
        error:
          "Request's body is incomplete: it should contain a non empty-array `emails`",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check that all emails passed in the body have a valid format and are not empty strings:
    //at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
    const regex = /^\w+@\w+\.\w+$/;
    for (const currentEmail of emails) {
      if (!regex.test(currentEmail) || currentEmail.length === 0) {
        //wrong format
        return res.status(400).json({
          error: "At least one of the emails is in the wrong format or empty",
          refreshedTokenMessage: res.locals.refreshedTokenMessage,
        });
      }
    }

    //check that the group has more than one member
    if (group.members.length === 1) {
      return res.status(400).json({
        error:
          "The requested group has only one member and they can't be removed",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    let notInGroupArray = []; //will contain the users which are not in the group
    let notFoundMembersArray = []; //will contain the members whose emails were not found

    for (const currentEmail of emails) {
      const foundUser = await User.findOne({ email: currentEmail });
      if (foundUser) {
        //the user exists: check if they belong to the current group
        let userFound = false;
        for (let i = 0; i < group.members.length; i++) {
          if (group.members[i].email === currentEmail) {
            //remove user from group's members
            group.members.splice(i, 1);
            userFound = true;
            break;
          }
        }
        if (!userFound) {
          //current user is not in the group
          notInGroupArray.push(currentEmail);
        }
      } else {
        //the user doesn't exist
        notFoundMembersArray.push(currentEmail);
      }
    }

    if (notInGroupArray.length === emails.length) {
      return res.status(400).json({
        error: "All the given users don't belong to this group",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (notFoundMembersArray.length === emails.length) {
      return res.status(400).json({
        error: "All the given users don't exist",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
    if (
      notFoundMembersArray.length + notInGroupArray.length ===
      emails.length
    ) {
      return res.status(400).json({
        error: "All the given users do not exist or are not in this group",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    await group.save();

    const memberEmails = group.members.map((user) =>
      Object.assign(
        {},
        {
          email: user.email,
        }
      )
    );

    return res.status(200).json({
      data: {
        group: {
          name: group.name,
          members: memberEmails,
        },
        notInGroup: notInGroupArray,
        membersNotFound: notFoundMembersArray,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a user
  - Request Parameters: None
  - Request Body Content: A string equal to the `email` of the user to be deleted
  - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and a boolean attribute that
    specifies whether the user was also `deletedFromGroup` or not.
  - Optional behavior:
    - error 401 is returned if the user does not exist 
 */
export const deleteUser = async (req, res) => {
  try {
    const { email } = req.body;

    //check authorisation
    const check = verifyAuth(req, res, { authType: "Admin" });
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const regex = /^\w+@\w+\.\w+$/;
    if (!email || email.length === 0 || !regex.test(email)) {
      return res.status(400).json({
        error:
          "Request's body is incomplete: it should contain a non-empty, valid `email`",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check that the requested user exists
    const targetUser = await User.findOne({ email: email });
    if (!targetUser) {
      return res.status(400).json({
        error: "The requested user doesn't exist",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //check if the user is an admin
    if (targetUser.role === "Admin") {
      return res.status(400).json({
        error: "The requested user is an admin and cannot be deleted",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    //delete user's transactions
    const deletedTransactions = await transactions.deleteMany({
      username: targetUser.username,
    });

    //check if target user belongs to a group
    let deletedFromGroupFlag = false;
    const userGroup = await Group.findOne({
      members: {
        $elemMatch: {
          email: email,
        },
      },
    });
    if (userGroup) {
      //the user belongs to a group
      for (let i = 0; i < userGroup.members.length; i++) {
        if (userGroup.members[i].email === email) {
          //remove user from group's members
          userGroup.members.splice(i, 1);
          deletedFromGroupFlag = true;
          break;
        }
      }
      await userGroup.save();
    }

    await User.deleteOne({ email: email });
    if (userGroup && userGroup.members.length === 0) {
      //the user just removed was the last one of the group: delete group
      await Group.findOneAndDelete({ name: userGroup.name });
    }

    return res.status(200).json({
      data: {
        deletedTransactions: deletedTransactions.deletedCount,
        deletedFromGroup: deletedFromGroupFlag,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a group
  - Request Body Content: A string equal to the `name` of the group to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 401 is returned if the group does not exist
 */
export const deleteGroup = async (req, res) => {
  try {
    const { name } = req.body;

    //check authorisation
    const check = verifyAuth(req, res, { authType: "Admin" });
    if (!check.flag) {
      return res.status(401).json({
        error: check.cause,
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    if (!name || name.length === 0) {
      return res.status(400).json({
        error:
          "Request's body is incomplete: it should contain a non-empty `name`",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }

    const deletedGroup = await Group.findOneAndDelete({ name: name });
    if (deletedGroup) {
      return res.status(200).json({
        data: { message: "Group deleted successfully" },
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    } else {
      //group doesn't exist
      return res.status(400).json({
        error: "The requested group doesn't exist",
        refreshedTokenMessage: res.locals.refreshedTokenMessage,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
