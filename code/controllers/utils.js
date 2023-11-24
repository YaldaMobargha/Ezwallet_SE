import jwt from "jsonwebtoken";

//IMPORTANT: the following two functions need the parameter `date` to be acceptable for the `Date` constructor
//function to calculate the beginning of the given day
const startOfDay = (date) => {
	const dateUNIX = new Date(date).getTime(); //given date in UNIX time (ms)
	const dayLength = 86400000; //length of a day in UNIX time (ms)
	const hour = dateUNIX % dayLength; //the current hour in the day
	return new Date(dateUNIX - hour);
};

//function to calculate the end of the given day (minus 1 ms)
const endOfDay = (date) => {
	const dateUNIX = new Date(date).getTime(); //given date in UNIX time (ms)
	const dayLength = 86400000; //length of a day in UNIX time (ms)
	const hour = dateUNIX % dayLength; //the current hour in the day
	return new Date(dateUNIX - hour + dayLength - 1);
};

/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (req) => {
	const query = req.query;

	//check if any date parameter has been passed: if not, return an empty object
	if (!query.date && !query.from && !query.upTo) {
		return {};
	}

	//check that valid dates has been passed:
	//it has to be in the form YYYY-MM-YY and the fields need to have valid values
	//the fields don't have valid values (e.g. month is `25`) then isNaN(date) returns true
	const regex = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
	if (query.date) {
		if (!regex.test(query.date) || isNaN(new Date(query.date))) {
			throw new Error(
				"The query parameter `date` has an invalid value: it must be in the form YYYY-MM-DD"
			);
		}
	}
	if (query.from) {
		if (!regex.test(query.from) || isNaN(new Date(query.from))) {
			throw new Error(
				"The query parameter `from` has an invalid value: it must be in the form YYYY-MM-DD"
			);
		}
	}
	if (query.upTo) {
		if (!regex.test(query.upTo) || isNaN(new Date(query.upTo))) {
			throw new Error(
				"The query parameter `upTo` has an invalid value: it must be in the form YYYY-MM-DD"
			);
		}
	}

	//some parameters have been passed

	//check if the query dates are conflicting
	if (query.date && (query.from || query.upTo)) {
		throw new Error("You cannot specify an exact date and a date range");
	}

	//check if the requested date is a specific day
	//since the date in the DB is a timestamp which includes hour, minutes and seconds and we want the transactions recorded in a whole day, we need to get the transactions whose date is between the beginning and the end of the given day
	if (query.date) {
		const mongooseQuery = {
			date: { $gte: startOfDay(query.date), $lte: endOfDay(query.date) },
		};
		return mongooseQuery;
	}

	//check if the range is [query.from, +infinity]
	if (query.from && !query.upTo) {
		const mongooseQuery = { date: { $gte: startOfDay(query.from) } };
		return mongooseQuery;
	}

	//check if the range is [-infinity, query.upTo]
	if (!query.from && query.upTo) {
		const mongooseQuery = { date: { $lte: endOfDay(query.upTo) } };
		return mongooseQuery;
	}

	//check if date range is a valid range [query.from, query.upTo]
	if (new Date(query.from) > new Date(query.upTo)) {
		throw new Error("Invalid date range");
	} else {
		const mongooseQuery = {
			date: { $gte: startOfDay(query.from), $lte: endOfDay(query.upTo) },
		};
		return mongooseQuery;
	}
};

/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 * @throws an error if the query parameters include `min` and `max`, with `min` > `max`
 */
export const handleAmountFilterParams = (req) => {
	const query = req.query;

	//check if any amount parameter has been passed: if not, return an empty object
	if (!query.min && !query.max) {
		return {};
	}

	//check that the parameters are numbers: isNaN returns true if a string is not a valid number
	if (query.min && isNaN(query.min)) {
		throw new Error(
			"The query parameter `min` has an invalid value: it must be a number"
		);
	}
	if (query.max && isNaN(query.max)) {
		throw new Error(
			"The query parameter `max` has an invalid value: it must be a number"
		);
	}

	//some parameters have been passed

	//check if the range is [query.min, +infinity]
	if (query.min && !query.max) {
		const mongooseQuery = { amount: { $gte: Number(query.min) } };
		return mongooseQuery;
	}

	//check if the range is [-infinity, query.max]
	if (!query.min && query.max) {
		const mongooseQuery = { amount: { $lte: Number(query.max) } };
		return mongooseQuery;
	}

	//check if amount range is a valid range [query.from, query.upTo]
	if (Number(query.min) > Number(query.max)) {
		throw new Error("Invalid amount range");
	} else {
		const mongooseQuery = {
			amount: { $gte: Number(query.min), $lte: Number(query.max) },
		};
		return mongooseQuery;
	}
};

/**
 * Handle possible authentication modes depending on `authType`
 * The "Simple" authorisation type is used when the role of the user is not important
 * @param req the request object that contains cookie information
 * @param res the result object of the request and the requested group's members in `res.locals.groupMembers`, if any
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * 			- authType === "Simple":
 * 				- one or more fields of the accessToken or the refreshToken are missing => error 401
 * 				- one or more fields of the accessToken and of the refreshToken don't match => error 401
 * 				- the accessToken and the refreshToken have complete and matching information => success
 * 				- the accessToken is expired and the refreshToken is valid => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid, and in that case performs the authorisation check based solely on the refreshToken
 */
export const verifyAuth = (req, res, info) => {
	const cookie = req.cookies;

	//check if both tokens are present
	if (!cookie.accessToken || !cookie.refreshToken) {
		return { flag: false, cause: "One of the tokens is missing" };
	}
	try {
		//decode both tokens
		const decodedAccessToken = jwt.verify(
			cookie.accessToken,
			process.env.ACCESS_KEY
		);
		const decodedRefreshToken = jwt.verify(
			cookie.refreshToken,
			process.env.ACCESS_KEY
		);

		//check that the tokens are complete and matching
		if (
			!decodedAccessToken.username ||
			!decodedAccessToken.email ||
			!decodedAccessToken.role
		) {
			return {
				flag: false,
				cause: "Token is missing information",
			};
		}
		if (
			!decodedRefreshToken.username ||
			!decodedRefreshToken.email ||
			!decodedRefreshToken.role
		) {
			return {
				flag: false,
				cause: "Token is missing information",
			};
		}
		if (
			decodedAccessToken.username !== decodedRefreshToken.username ||
			decodedAccessToken.email !== decodedRefreshToken.email ||
			decodedAccessToken.role !== decodedRefreshToken.role
		) {
			return {
				flag: false,
				cause: "Mismatched tokens",
			};
		}

		//if we get to this point then the two tokens are valid and matching
		switch (info.authType) {
			case "User":
				if (decodedRefreshToken.username !== info.username) {
					return {
						flag: false,
						cause: "You are not flag to access this user's data",
					};
				} else {
					return { flag: true };
				}
			case "Admin":
				if (decodedRefreshToken.role !== "Admin") {
					return {
						flag: false,
						cause: "You are not an admin",
					};
				} else {
					return { flag: true };
				}
			case "Group":
				if (info.emails.includes(decodedAccessToken.email)) {
					return { flag: true };
				} else {
					return {
						flag: false,
						cause: "You are not member of this group",
					};
				}
			case "Simple":
			default:
				return { flag: true };
		}
	} catch (error) {
		//if we get to this point the access token is expired: we need to check if the refresh token is valid
		if (error.name === "TokenExpiredError") {
			try {
				//decode refresh token
				const decodedRefreshToken = jwt.verify(
					cookie.refreshToken,
					process.env.ACCESS_KEY
				);

				//check that the refresh token is complete
				if (
					!decodedRefreshToken.username ||
					!decodedRefreshToken.email ||
					!decodedRefreshToken.role
				) {
					return {
						flag: false,
						cause: "Token is missing information",
					};
				}

				//create new access token and write it in the cookies
				//this operation is performed before the access level check because the user does have a valid refresh token and needs a new access token regardless
				const newAccessToken = jwt.sign(
					{
						username: decodedRefreshToken.username,
						email: decodedRefreshToken.email,
						id: decodedRefreshToken.id,
						role: decodedRefreshToken.role,
					},
					process.env.ACCESS_KEY,
					{ expiresIn: "1h" }
				);
				res.cookie("accessToken", newAccessToken, {
					httpOnly: true,
					path: "/api",
					maxAge: 60 * 60 * 1000,
					sameSite: "none",
					secure: true,
				});

				res.locals.refreshedTokenMessage =
					"Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls";

				//check if the user is authorized
				switch (info.authType) {
					case "User":
						if (
							decodedRefreshToken.username !== info.username
						) {
							return {
								flag: false,
								cause: "You are not authorized to access this user's data",
							};
						} else {
							return { flag: true };
						}
					case "Admin":
						if (decodedRefreshToken.role !== "Admin") {
							return {
								flag: false,
								cause: "You are not an admin",
							};
						} else {
							return { flag: true };
						}
					case "Group":
						if (info.emails.includes(decodedRefreshToken.email)) {
							return { flag: true };
						} else {
							return {
								flag: false,
								cause: "You are not member of this group",
							};
						}
					case "Simple":
					default:
						return { flag: true };
				}
			} catch (error) {
				//if we get to this point the refresh token is also expired: the user needs to log in again
				if (error.name === "TokenExpiredError") {
					return {
						flag: false,
						cause: "Perform login again",
					};
				} else {
					return { flag: false, cause: error.name };
				}
			}
		} else {
			return { flag: false, cause: error.name };
		}
	}
};
