import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require("bcryptjs")
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
  const dbName = "testingDatabaseAuth";
  const url = `${process.env.MONGO_URI}/${dbName}`;

  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
});

describe('register', () => {
  // Clean up the test database before each test
  beforeEach(async () => {
    await User.deleteMany();
  });

  test('should register a new user', async () => {
    const userData = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
    };

    const response = await request(app)
      .post("/api/register")
      .send(userData)
      .expect(200);
    const newUser = await User.findOne({ username: userData.username });
    expect(newUser).toBeDefined();
    expect(newUser.email).toBe(userData.email);
    expect(await bcrypt.compare(userData.password, newUser.password)).toBe(true);
  });

  test('should return an error if username or email already exists', async () => {
    const existingUser = new User({
      username: 'existinguser',
      email: 'existinguser@example.com',
      password: 'password456',
    });
    await existingUser.save();

    const userData = {
      username: 'existinguser', // Use the existing username
      email: 'newuser@example.com',
      password: 'password789',
    };

    const response = await request(app)
      .post('/api/register')
      .send(userData)
      .expect(400);

    expect(response.body.error).toBe('Another account with the same username/email is already registered');
  });

  test('should return an error if email has wrong format', async () => {
    const userData = {
      username: 'testuser',
      email: 'invalidemail',
      password: 'password123',
    };

    const response = await request(app)
      .post('/api/register')
      .send(userData)
      .expect(400);

    expect(response.body.error).toBe('The email given is in the wrong format');
  });

  test('Incomplete request body', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'testadmin',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`"
    );
  });
  test('Successful registration with valid inputs', async () => {
    const response = await request(app)
      .post('/api/register')
      .send({
        username: 'testadmin',
        email: 'testadmin@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('User added successfully');

    // Additional assertion: Check if the user exists in the database with the correct details
    const createdUser = await User.findOne({ username: 'testadmin' });
    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe('testadmin@example.com');
    expect(createdUser.role).toBe('Regular');
  });

});

//-------------------------------------------------------------------------------------------------------------

describe('registerAdmin', () => {
  beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
  });

  test('Successful registration', async () => {
    const response = await request(app)
      .post('/api/admin')
      .send({
        username: 'testadmin',
        email: 'testadmin@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Admin added successfully');
  });

  test('Incomplete request body', async () => {
    const response = await request(app)
      .post('/api/admin')
      .send({
        username: '',
        email: '',
        password: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`"
    );
  });

  test('Invalid email format', async () => {
    const response = await request(app)
      .post('/api/admin')
      .send({
        username: 'testadmin',
        email: 'invalidemail',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('The email given is in the wrong format');
  });

  test('Existing username', async () => {
    // Create a user with the same username
    await User.create({
      username: 'testadmin',
      email: 'existingemail@example.com',
      password: 'testpassword',
      role: 'Admin',
    });

    const response = await request(app)
      .post('/api/admin')
      .send({
        username: 'testadmin',
        email: 'newemail@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Another account with the same username/email is already registered'
    );
  });

  test('Existing email', async () => {
    // Create a user with the same email
    await User.create({
      username: 'existingadmin',
      email: 'testadmin@example.com',
      password: 'testpassword',
      role: 'Admin',
    });

    const response = await request(app)
      .post('/api/admin')
      .send({
        username: 'newadmin',
        email: 'testadmin@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'Another account with the same username/email is already registered'
    );
  });

  test('Successful registration with valid inputs', async () => {
    const response = await request(app)
      .post('/api/admin')
      .send({
        username: 'testadmin',
        email: 'testadmin@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('Admin added successfully');

    // Additional assertion: Check if the user exists in the database with the correct details
    const createdUser = await User.findOne({ username: 'testadmin' });
    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe('testadmin@example.com');
    expect(createdUser.role).toBe('Admin');
  });

});
//-------------------------------------------------------------------------------------------
describe('login', () => {
  beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
  });

  test('Successful login', async () => {
    // Create a user for testing
    const hashedPassword = await bcrypt.hash('testpassword', 12);
    await User.create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: hashedPassword,
    });

    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.header['set-cookie']).toHaveLength(2);
  });

  test('Incomplete request body', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: '',
        password: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain non-empty `email` and `password`"
    );
  });

  test('Invalid email format', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'invalidemail',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('The email given is in the wrong format');
  });

  test('Non-existing email', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'nonexistingemail@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('This email is not associated with any account');
  });

  test('Wrong password', async () => {
    // Create a user with a different password
    const hashedPassword = await bcrypt.hash('differentpassword', 12);
    await User.create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: hashedPassword,
    });

    const response = await request(app)
      .post('/api/login')
      .send({
        email: 'testuser@example.com',
        password: 'testpassword',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Wrong password');
  });
});

//----------------------------------------------------------------------------------
describe('logout', () => {
  beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
  });

  test('Successful logout', async () => {
    // Create a user for testing
    const user = await User.create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'testpassword',
      refreshToken: 'testrefreshtoken',
    });

    const response = await request(app)
      .get('/api/logout')
      .set('Cookie', [`refreshToken=${user.refreshToken}`]);

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe('User logged out');
    expect(response.header['set-cookie']).toHaveLength(2);
    expect(response.header['set-cookie'][0]).toContain('accessToken=');
    expect(response.header['set-cookie'][1]).toContain('refreshToken=');
    expect(response.header['set-cookie'][0]).toContain('Max-Age=0');
    expect(response.header['set-cookie'][1]).toContain('Max-Age=0');
  });

  test('Refresh token not found', async () => {
    const response = await request(app).get('/api/logout');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Refresh token not found');
  });

  test('User not found', async () => {
    const response = await request(app)
      .get('/api/logout')
      .set('Cookie', ['refreshToken=invalidtoken']);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('User not found');
  });
});

