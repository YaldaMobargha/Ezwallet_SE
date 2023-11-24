import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import jwt from "jsonwebtoken";

/**
 * Register a new user in the system
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const register = async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (
			!username ||
			username.length === 0 ||
			!email ||
			email.length === 0 ||
			!password ||
			password.length === 0
		) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`",
			});
		}

		//check that the email is in a valid format:
		//at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
		const regex = /^\w+@\w+\.\w+$/;
		if (!regex.test(email)) {
			//wrong format
			return res.status(400).json({
				error: "The email given is in the wrong format",
			});
		}

		const existingUser = await User.findOne({
			$or: [{ username: username }, { email: email }],
		});
		if (existingUser)
			return res.status(400).json({
				error: "Another account with the same username/email is already registered",
			});
		const hashedPassword = await bcrypt.hash(password, 12);
		await User.create({
			username: username,
			email: email,
			password: hashedPassword,
		});
		return res
			.status(200)
			.json({ data: { message: "User added successfully" } });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Register a new user in the system with an Admin role
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const registerAdmin = async (req, res) => {
	try {
		const { username, email, password } = req.body;

		if (
			!username ||
			username.length === 0 ||
			!email ||
			email.length === 0 ||
			!password ||
			password.length === 0
		) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`",
			});
		}

		//check that the email is in a valid format:
		//at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
		const regex = /^\w+@\w+\.\w+$/;
		if (!regex.test(email)) {
			//wrong format
			return res.status(400).json({
				error: "The email given is in the wrong format",
			});
		}

		const existingUser = await User.findOne({
			$or: [{ username: username }, { email: email }],
		});
		if (existingUser)
			return res.status(400).json({
				error: "Another account with the same username/email is already registered",
			});
		const hashedPassword = await bcrypt.hash(password, 12);
		await User.create({
			username: username,
			email: email,
			password: hashedPassword,
			role: "Admin",
		});
		return res
			.status(200)
			.json({ data: { message: "Admin added successfully" } });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Perform login 
  - Request Body Content: An object having attributes `email` and `password`
  - Response `data` Content: An object with the created accessToken and refreshToken
  - Optional behavior:
    - error 400 is returned if the user does not exist
    - error 400 is returned if the supplied password does not match with the one in the database
 */
export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (
			!email ||
			email.length === 0 ||
			!password ||
			password.length === 0
		) {
			return res.status(400).json({
				error: "Request's body is incomplete: it should contain non-empty `email` and `password`",
			});
		}

		//check that the email is in a valid format:
		//at least one char in [A - Za - z_0 - 9], @, at least one char in [A - Za - z_0 - 9], dot, at least one char in [A - Za - z_0 - 9]
		const regex = /^\w+@\w+\.\w+$/;
		if (!regex.test(email)) {
			//wrong format
			return res.status(400).json({
				error: "The email given is in the wrong format",
			});
		}

		const existingUser = await User.findOne({ email: email });
		if (!existingUser)
			return res.status(400).json({
				error: "This email is not associated with any account",
			});

		const match = await bcrypt.compare(password, existingUser.password);
		if (!match) {
			return res.status(400).json({ error: "Wrong password" });
		}

		//CREATE ACCESS TOKEN
		const accessToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "1h" }
		);

		//CREATE REFRESH TOKEN
		const refreshToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: "7d" }
		);

		//SAVE REFRESH TOKEN TO DB
		existingUser.refreshToken = refreshToken;
		await existingUser.save();
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			domain: "localhost",
			path: "/api",
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: "none",
			secure: true,
		});

		return res.status(200).json({
			data: { accessToken: accessToken, refreshToken: refreshToken },
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

/**
 * Perform logout
  - Auth type: Simple
  - Request Body Content: None
  - Response `data` Content: A message confirming successful logout
  - Optional behavior:
    - error 400 is returned if the user does not exist
 */
export const logout = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;
		if (!refreshToken) {
			return res.status(400).json({ error: "Refresh token not found" });
		}
		const user = await User.findOne({ refreshToken: refreshToken });
		if (!user) {
			return res.status(400).json({ error: "User not found" });
		}

		user.refreshToken = null;
		res.cookie("accessToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});
		res.cookie("refreshToken", "", {
			httpOnly: true,
			path: "/api",
			maxAge: 0,
			sameSite: "none",
			secure: true,
		});
		await user.save();
		return res.status(200).json({ data: { message: "User logged out" } });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};
