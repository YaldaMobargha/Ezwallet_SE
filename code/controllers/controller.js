import { categories, transactions } from "../models/model.js";
import { Group, User } from "../models/User.js";
import {
	handleDateFilterParams,
	handleAmountFilterParams,
	verifyAuth,
} from "./utils.js";

/**
 * Create a new category
  - Request Body Content: An object having attributes `type` and `color`
  - Response `data` Content: An object having attributes `type` and `color`
  - Optional behavior:
    - error 401 is returned if the specified category already exists
    - error 401 is returned if the parameters have invalid values 
 */
export const createCategory = async (req, res) => {
	try {
		const { type, color } = req.body;

		//check if the user that sent the request is an admin
		const check = verifyAuth(req, res, { authType: "Admin" });
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (!type || type.length === 0 || !color || color.length === 0) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `type` and `color`",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if a category of this type already exists
		const foundCategory = await categories.findOne({ type: type });
		if (foundCategory) {
			return res.status(400).json({
				error: "A category of this type already exists",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//create new category
		const newCategory = await categories.create({
			type: type,
			color: color,
		});
		return res.status(200).json({
			data: {
				type: newCategory.type,
				color: newCategory.color,
			},
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Edit a category's type or color
  - Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Optional behavior:
    - error 401 returned if the specified category does not exist
    - error 401 is returned if new parameters have invalid values
 */
export const updateCategory = async (req, res) => {
	try {
		const { type, color } = req.body;

		//check if the user that sent the request is an admin
		const check = verifyAuth(req, res, { authType: "Admin" });
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (!type || type.length === 0 || !color || color.length === 0) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `type` and `color`",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if the category to edit does exists
		const foundCategory = await categories.findOne({
			type: req.params.type,
		});
		if (!foundCategory) {
			return res.status(400).json({
				error: "The requested category doesn't exists",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if the new type is different from the old one, and in that case check that it doesn't belong to other categories
		if (foundCategory.type !== type) {
			const conflictingCategory = await categories.findOne({
				type: type,
			});
			if (conflictingCategory) {
				return res.status(400).json({
					error: "The new category type already belongs to another category",
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			}
		}

		let editCount = 0; //variable used to cound the transactions updated: initialized to 0 because transactions don't need updating when only the category's colour is changed

		//change color value
		foundCategory.color = color;

		//check if new type is different from category's previous one
		if (type !== foundCategory.type) {
			//update transactions, overwriting their type
			const updateOutcome = await transactions.updateMany(
				{ type: foundCategory.type },
				{ $set: { type: type } }
			);
			editCount = updateOutcome.modifiedCount;
			foundCategory.type = type;
		}

		await foundCategory.save();

		return res.status(200).json({
			data: {
				message: "Category updated successfully",
				count: editCount,
			},
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Delete a category
  - Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Response `data` Content: An object with parameter `message` that confirms successful deletion and a parameter `count` that is equal to the count of affected transactions (deleting a category sets all transactions with that category to have `investment` as their new category)
  - Optional behavior:
    - error 401 is returned if the specified category does not exist
 */
export const deleteCategory = async (req, res) => {
	try {
		const { types } = req.body;

		//check if the user that sent the request is an admin
		const check = verifyAuth(req, res, { authType: "Admin" });
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (!types || types.length === 0) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain a non-empty array `types`",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that no element of the array is an empty string
		if (types.indexOf("") > -1) {
			return res.status(400).json({
				error: "Request's body is incomplete: every element of `types` should not be an empty string",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that there is more than one category
		const categoryCount = await categories.countDocuments();
		if (categoryCount === 1) {
			return res.status(400).json({
				error: "There is only one category in the database and it cannot be deleted",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that all the target categories exist
		for (const currType of types) {
			const currentCategory = await categories.findOne({
				type: currType,
			});
			if (!currentCategory) {
				//this category doesn't exist
				return res.status(400).json({
					error:
						"The category of type " + currType + " doesn't exist",
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			}
		}

		//all the categories to be deleted exist
		//check if the number of categories is equal to the number of total categories
		if (categoryCount === types.length) {
			//remove oldest category type from types array
			const oldestCategory = await categories.findOne(
				{},
				{},
				{ sort: { createdAt: -1 } }
			);

			const index = types.indexOf(oldestCategory.type);
			if (index > -1) {
				types.splice(index, 1);
			}
		}

		let editCount = 0; //will count the number of updated transactions

		//get oldest category not in the `types` array
		const oldestCategory = await categories.findOne(
			{ type: { $not: { $in: types } } },
			{},
			{ sort: { createdAt: -1 } }
		);

		for (const currType of types) {
			await categories.findOneAndDelete({
				type: currType,
			});

			//update transactions by setting their type to that of the oldest category
			const updateOutcome = await transactions.updateMany(
				{ type: currType },
				{ $set: { type: oldestCategory.type } }
			);
			editCount += updateOutcome.modifiedCount;
		}

		return res.status(200).json({
			data: {
				count: editCount,
				message: "Categories deleted",
			},
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - empty array is returned if there are no categories
 */
export const getCategories = async (req, res) => {
	try {
		//check if the user that sent the request is authorized
		const check = verifyAuth(req, res, { authType: "Simple" });
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		let allCategories = await categories.find({});

		let data = allCategories.map((el) =>
			Object.assign({}, { type: el.type, color: el.color })
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
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
    - error 401 is returned if the username or the type of category does not exist
 */
export const createTransaction = async (req, res) => {
	try {
		const { username, amount, type } = req.body;

		//check if the user that sent the request is authorized
		const check = verifyAuth(req, res, {
			authType: "User",
			username: req.params.username,
		});
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (
			!username ||
			username.length === 0 ||
			!amount ||
			isNaN(amount) || //checks if amount is a number
			!type ||
			type.length === 0
		) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `username` and `type`, while `amount` should be an integer or float",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if the body's user exists
		const targetUser = await User.findOne({ username: username });
		if (!targetUser) {
			return res.status(400).json({
				error: "The requested user in the body doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if the parameter's user exists
		const paramsUser = await User.findOne({ username: req.params.username });
		if (!paramsUser) {
			return res.status(400).json({
				error: "The requested user in the parameters doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that the `username` in the request's url and that in the request's body match
		if (username !== req.params.username) {
			return res.status(400).json({
				error: "The username in the URL and that in the request's body don't match",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check if the category exists
		const targetCategory = await categories.findOne({ type: type });
		if (!targetCategory) {
			return res.status(400).json({
				error: "The requested category type doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//`date` will be initialised to the current date by default
		const newTransaction = await transactions.create({
			username: username,
			type: type,
			amount: amount,
		});

		return res.status(200).json({
			data: {
				username: newTransaction.username,
				type: newTransaction.type,
				amount: newTransaction.amount,
				date: newTransaction.date,
			},
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - empty array must be returned if there are no transactions
 */
export const getAllTransactions = async (req, res) => {
	try {
		//check if the user that sent the request is an admin
		const check = verifyAuth(req, res, { authType: "Admin" });
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		/**
		 * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type"
		 */
		transactions
			.aggregate([
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
			])
			.then((result) => {
				let data = result.map((el) =>
					Object.assign(
						{},
						{
							username: el.username,
							amount: el.amount,
							type: el.type,
							date: el.date,
							color: el.categories_info.color,
						}
					)
				);
				return res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by a specific user
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the user does not exist
    - empty array is returned if there are no transactions made by the user
    - if there are query parameters and the function has been called by a Regular user then the returned transactions must be filtered according to the query parameters
 */
export const getTransactionsByUser = async (req, res) => {
	try {
		//get to which endpoint was the request sent
		const requestedEndpoint = req.url.split("?")[0]; //remove the query (if any)
		const userEndpoint = "/users/" + req.params.username + "/transactions";

		let finalQuery = { username: req.params.username }; //this query is necessary regardless of filters and access level

		//based on the endpoint, check if the user is a `Regular` trying to access their own page or an `Admin`
		let check;
		if (requestedEndpoint === userEndpoint) {
			//the request was sent to the user's endpoint
			check = verifyAuth(req, res, {
				authType: "User",
				username: req.params.username,
			});

			const dateQuery = handleDateFilterParams(req); //get the query to filter the date
			const amountQuery = handleAmountFilterParams(req); //get the query to filter the amount

			//create the final query including username (mandatory), date filtering and amount filtering (optional)
			finalQuery = Object.assign(finalQuery, dateQuery, amountQuery);
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

		//check that the requested user exists
		const foundUser = await User.findOne({
			username: req.params.username,
		});
		if (!foundUser) {
			return res.status(400).json({
				error: "The requested user doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		transactions
			.aggregate([
				{ $match: finalQuery },
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
			])
			.then((result) => {
				let data = result.map((el) =>
					Object.assign(
						{},
						{
							username: el.username,
							amount: el.amount,
							type: el.type,
							color: el.categories_info.color,
							date: el.date,
						}
					)
				);
				return res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by a specific user filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Optional behavior:
    - empty array is returned if there are no transactions made by the user with the specified category
    - error 401 is returned if the user or the category does not exist
 */
export const getTransactionsByUserByCategory = async (req, res) => {
	try {
		//get to which endpoint was the request sent
		const requestedEndpoint = req.url.split("?")[0]; //remove the query (if any)
		const userEndpoint =
			"/users/" +
			req.params.username +
			"/transactions/category/" +
			req.params.category;

		//based on the endpoint, check if the user is a `Regular` trying to access their own page or an `Admin`
		let check;
		if (requestedEndpoint === userEndpoint) {
			//the request was sent to the user's endpoint
			check = verifyAuth(req, res, {
				authType: "User",
				username: req.params.username,
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

		//check that the requested user exists
		const targetUser = await User.findOne({
			username: req.params.username,
		});
		if (!targetUser) {
			return res.status(400).json({
				error: "The requested user doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that the requested category exists
		const targetCategory = await categories.findOne({
			type: req.params.category,
		});
		if (!targetCategory) {
			return res.status(400).json({
				error: "The requested category doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		transactions
			.aggregate([
				{
					$match: {
						username: req.params.username,
						type: req.params.category,
					},
				},
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
			])
			.then((result) => {
				let data = result.map((el) =>
					Object.assign(
						{},
						{
							username: el.username,
							amount: el.amount,
							type: el.type,
							color: el.categories_info.color,
							date: el.date,
						}
					)
				);
				return res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
	try {
		//check that the requested group exists
		const targetGroup = await Group.findOne({ name: req.params.name });
		if (!targetGroup) {
			return res.status(400).json({
				error: "The requested group doesn't exist",
			});
		}

		//fetch the email for each member of the group
		const emailsList = targetGroup.members.map((el) => el.email);

		//get to which endpoint was the request sent
		const requestedEndpoint = req.url.split("?")[0];
		const userEndpoint = "/groups/" + req.params.name + "/transactions";

		//based on the endpoint, check if the user is a `Regular` trying to access their own page or an `Admin`
		let check;
		if (requestedEndpoint === userEndpoint) {
			//the request was sent to the user's endpoint
			check = verifyAuth(req, res, {
				authType: "Group",
				emails: emailsList,
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

		//fetch the username for each member of the group
		const users = await User.find({ email: { $in: emailsList } });
		const usernamesList = users.map((user) => user.username);

		//fetch the transactions whose username belongs to the list of the usernames of the group's members
		transactions
			.aggregate([
				{
					$match: {
						username: { $in: usernamesList },
					},
				},
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
			])
			.then((result) => {
				let data = result.map((el) =>
					Object.assign(
						{},
						{
							username: el.username,
							amount: el.amount,
							type: el.type,
							color: el.categories_info.color,
							date: el.date,
						}
					)
				);
				return res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 401 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
	try {
		//check that the requested group exists
		const targetGroup = await Group.findOne({ name: req.params.name });
		if (!targetGroup) {
			return res.status(400).json({
				error: "The requested group doesn't exist",
			});
		}

		//fetch the email for each member of the group
		const emailsList = targetGroup.members.map((el) => el.email);

		//get to which endpoint was the request sent
		const requestedEndpoint = req.url.split("?")[0]; //remove the query (if any)
		const userEndpoint =
			"/groups/" +
			req.params.name +
			"/transactions/category/" +
			req.params.category;

		//based on the endpoint, check if the user is a `Regular` trying to access their own page or an `Admin`
		let check;
		if (requestedEndpoint === userEndpoint) {
			//the request was sent to the user's endpoint
			check = verifyAuth(req, res, {
				authType: "Group",
				emails: emailsList,
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

		//check that the requested category exists
		const targetCategory = await categories.findOne({
			type: req.params.category,
		});
		if (!targetCategory) {
			return res.status(400).json({
				error: "The requested category doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//fetch the username for each member of the group
		const users = await User.find({ email: { $in: emailsList } });
		const usernamesList = users.map((user) => user.username);

		//fetch the transactions whose username belongs to the group's members' usernames list
		transactions
			.aggregate([
				{
					$match: {
						username: { $in: usernamesList },
						type: req.params.category,
					},
				},
				{
					$lookup: {
						from: "categories",
						localField: "type",
						foreignField: "type",
						as: "categories_info",
					},
				},
				{ $unwind: "$categories_info" },
			])
			.then((result) => {
				let data = result.map((el) =>
					Object.assign(
						{},
						{
							username: el.username,
							amount: el.amount,
							type: el.type,
							color: el.categories_info.color,
							date: el.date,
						}
					)
				);
				return res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
    - error 401 is returned if the user or the transaction does not exist
 */
export const deleteTransaction = async (req, res) => {
	try {
		const { _id } = req.body;

		//check if the user that sent the request is authorized
		const check = verifyAuth(req, res, {
			authType: "User",
			username: req.params.username,
		});
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (!_id || _id.length === 0) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain a non-empty `_id`",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that the target user exists
		const targetUser = await User.findOne({
			username: req.params.username,
		});
		if (!targetUser) {
			return res.status(400).json({
				error: "The requested user doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that the transaction to be deleted exists and belongs to the user
		const targetTransaction = await transactions.findById(_id);
		if (!targetTransaction) {
			return res.status(400).json({
				error: "The requested transaction doesn't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		} else if (targetTransaction.username !== req.params.username) {
			return res.status(400).json({
				error: "The requested transaction doesn't belong to you",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		await transactions.findByIdAndDelete(_id);
		return res.status(200).json({
			data: {
				message: "Transaction deleted",
			},
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Delete multiple transactions identified by their ids
  - Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 401 is returned if at least one of the `_ids` does not have a corresponding transaction. Transactions that have an id are not deleted in this case
 */
export const deleteTransactions = async (req, res) => {
	try {
		const { _ids } = req.body;

		//check if the user that sent the request is authorized
		const check = verifyAuth(req, res, {
			authType: "Admin",
		});
		if (!check.flag) {
			return res.status(401).json({
				error: check.cause,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		if (!_ids || _ids.length === 0) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain a non-empty array `_ids`",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that no element of the array is an empty string
		if (_ids.indexOf("") > -1) {
			return res.status(400).json({
				error: "Request's body is incomplete: every element of `_ids` should not be an empty string",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		//check that all the requested transactions exist
		const targetTransactions = await transactions.find({
			_id: { $in: _ids },
		});
		if (targetTransactions.length !== _ids.length) {
			return res.status(400).json({
				error: "One or more of the requested transactions don't exist",
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		}

		await transactions.deleteMany({ _id: { $in: _ids } });
		return res.status(200).json({
			data: { message: "Transactions deleted" },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};
