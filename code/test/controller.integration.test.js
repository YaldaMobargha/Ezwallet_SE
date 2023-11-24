import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import mongoose, { Model, now } from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { User,Group } from '../models/User.js';
import { response } from 'express';
dotenv.config();
beforeAll(async () => {
  const dbName = "testingDatabaseController";
  const url = `${process.env.MONGO_URI}/${dbName}`;

  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

});
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('createCategory', () => {
    let accessToken, refreshToken, cookie;

  beforeEach(async () => {
    // Clear the categories collection before each test
    await categories.deleteMany({});
    await User.deleteMany({});

    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = new User({
    email: 'admin@example.com',
    password: hashedPassword,
    username: 'admin_1',
    role: 'Admin',
    });
    await adminUser.save();
    const currentUser = await User.findOne({ email: 'admin@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
});


  test('should return 401 if the user is not an admin', async () => {
    const hashedPassword = await bcrypt.hash('user123', 12);
    const regularUser = new User({
        email: 'user@example.com',
        password: hashedPassword, 
        username: 'regular_user',
        role: 'Regular',
      });
    await regularUser.save();
    const currentUser = await User.findOne({ email: 'user@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', cookie)
      .send({
        type: 'Food',
        color: '#FF0000',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('You are not an admin');
  });

  test('should create a new category when valid type and color are provided', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', cookie)
      .send({
        type: 'Food',
        color: '#FF0000',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      type: 'Food',
      color: '#FF0000',
    });
  });

  test('should return 400 if the category type already exists', async () => {
    const existingCategory = new categories({
      type: 'Food',
      color: '#FF0000',
    });
    await existingCategory.save();



    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', cookie)
      .send({
        type: 'Food',
        color: '#00FF00',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('A category of this type already exists');
  });

  test('should return 400 if request body is incomplete', async () => {

    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', cookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Request's body is incomplete: it should contain non-empty `type` and `color`"
    );
  });

//   test('should return 500 if an error occurs', async () => {
//     // Delete the categories collection to simulate a database error
//     await categories.deleteMany({});

//     const response = await request(app)
//       .post('/api/categories')
//       .set('Cookie', cookie)
//       .send({
//         type: 'Food',
//         color: '#FF0000',
//       });

//     expect(response.status).toBe(500);
//     expect(response.body.error).toBe('Internal Server Error');
//   });
});

describe('updateCategory', () => {
  let accessToken,refreshToken,cookie;

  beforeEach(async() => {

    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
    await categories.insertMany(categoryObject);

    const transactionsData = [
      {
        username: 'regular_user1',
        amount: 100,
        type: 'testCategory',
        date: '2023-06-01',
      },
      {
        username: 'regular_user1',
        amount: 200,
        type: 'testCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user1',
        amount: 333,
        type: 'anotherCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user2',
        amount: 400,
        type: 'testCategory',
        date: '2023-06-01',
      },
    ];
    await transactions.insertMany(transactionsData);

    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('should return 401 error if the request is not from an admin', async () => {

    const response = await request(app)
      .patch('/api/categories/test')
      .set('Cookie', cookie)
      .send({type:'', color:''});
  
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error:  "You are not an admin",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 error if the request body is not complete', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  
    const response = await request(app)
      .patch('/api/categories/test')
      .set('Cookie', cookie)
      .send({type:'', color:''});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "Request's body is incomplete: it should contain non-empty `type` and `color`",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the requested category does not exist', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  
    const response = await request(app)
      .patch('/api/categories/nonExistingCategory')
      .set('Cookie', cookie)
      .send({type:'testCategory', color:'#121212'});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The requested category doesn't exists",
      refreshedTokenMessage: undefined
    });
  
  });
  
  test('should return 400 if the new requested category type already exists', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  
    const response = await request(app)
      .patch('/api/categories/testCategory')
      .set('Cookie', cookie)
      .send({type:'anotherCategory', color:'#888888'});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The new category type already belongs to another category",
      refreshedTokenMessage: undefined
    });
  });

  test('should update a category successfully and update the transactions', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
      .patch('/api/categories/testCategory')
      .set('Cookie', cookie)
      .send({type:'newCategory', color:'#777777'});

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      message: "Category updated successfully",
      count: 3,
    });

  });

  test('should update a category successfully (only changing its color) ', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
      .patch('/api/categories/anotherCategory')
      .set('Cookie', cookie)
      .send({type:'anotherCategory', color:'#770077'});

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      message: "Category updated successfully",
      count: 0,
    });

  });
});

describe('deleteCategory', () =>{
  let accessToken, refreshToken, cookie;
  beforeEach(async() => {
    // Clean up the test data
    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' },{ type: 'firstCategory', color: '#505050' }];
    await categories.insertMany(categoryObject);

    // Create test transactions for the user and category
    const transactionsData = [
      {
        username: 'regular_user1',
        amount: 100,
        type: 'testCategory',
        date: '2023-06-01',
      },
      {
        username: 'regular_user1',
        amount: 200,
        type: 'testCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user1',
        amount: 333,
        type: 'anotherCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user2',
        amount: 400,
        type: 'testCategory',
        date: '2023-06-01',
      },
    ];
    await transactions.insertMany(transactionsData);


    const currentUser = await User.findOne({ email: 'admin@example.com' });
    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });
  
  test('should return 401 error if the request is not from an admin', async () => {
    const currentUser = await User.findOne({ email: 'user1@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:''});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error:  "You are not an admin",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 error if the request body is not complete', async () => { 
      const response = await request(app)
        .delete('/api/categories')
        .set('Cookie', cookie)
        .send({types:''});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error:  "Request's body is incomplete: it should contain a non-empty array `types`",
        refreshedTokenMessage: undefined
      });
  });

  test('should return 400 error if at least one type is empty', async () => { 
    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:['testCategory','']});
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "Request's body is incomplete: every element of `types` should not be an empty string",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 error if admin try to delete the only available category', async () => {
    //delete all the categories stored in DB and add one category. so there will be just one category at this moment
    await categories.deleteMany();
    const categoryObject = [{ type: 'testCategory', color: '#121212' }];
    await categories.insertMany(categoryObject);

    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:['testCategory']});
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "There is only one category in the database and it cannot be deleted",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 error if a non existing category type is sent in the request body', async () => {
    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:['testCategory','anotherCategory','nonExistingCategory']});
    
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The category of type nonExistingCategory doesn't exist",
      refreshedTokenMessage: undefined
    });    
  });

  test('should return 200 and delete requested categories V1', async () => {
    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:['testCategory']});
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        count: 3,
        message: "Categories deleted"
      },
      refreshedTokenMessage: undefined
    });    
  });

  test('should return 200 and delete requested categories V2(try to delete all categories)', async () => {
    const response = await request(app)
      .delete('/api/categories')
      .set('Cookie', cookie)
      .send({types:['testCategory','firstCategory','anotherCategory']});
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        count: 1,
        message: "Categories deleted"
      },
      refreshedTokenMessage: undefined
    });    
  });

})

describe('getCategories', () =>{
  let accessToken, refreshToken, cookie;
  beforeEach(async() => {
    // Clean up the test data
    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' },{ type: 'firstCategory', color: '#505050' }];
    await categories.insertMany(categoryObject);

    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('should return 401 if the user is not authorized', async () => {
    const currentUser = await User.findOne({ email: 'user1@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    cookie = 'accessToken='+accessToken+';';

    const response = await request(app)
    .get('/api/categories')
    .set('Cookie', cookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'One of the tokens is missing',
      refreshedTokenMessage: undefined,
    });
  });
  test('should return categories successfully', async () => {
    const response = await request(app)
    .get('/api/categories')
    .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { type: 'testCategory', color: '#121212' },
        { type: 'anotherCategory', color: '#888888' },
        { type: 'firstCategory', color: '#505050' },
      ],
      refreshedTokenMessage: undefined,
    });
  });
})

describe('createTransaction', () =>{
  let accessToken, refreshToken, cookie;
  beforeEach(async() => {
    // Clean up the test data
    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' },{ type: 'firstCategory', color: '#505050' }];
    await categories.insertMany(categoryObject);


    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  
  test('should return 401 if the request is not from a User', async () => {
    //we mock a not registered user
    const notRegisteredUser = 'accessToken=;refreshToken=;';

    const response = await request(app)
      .post('/api/users/fakeuser/transactions')
      .set('Cookie', notRegisteredUser)
      .send({
        username: '',
        amount: 100,
        type: '',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("One of the tokens is missing");
  });

  test('should return 400 if the request body is incomplete or the amount is not an integer', async () => {
    const response = await request(app)
      .post('/api/users/regular_user1/transactions')
      .set('Cookie', cookie)
      .send({
          username: 'regular_user1',
          amount: 'onehundred',
          type: '',});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "Request's body is incomplete: it should contain non-empty `username` and `type`, while `amount` should be an integer or float",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the username inserted in transaction does not match the users', async () => {
  const response = await request(app)
    .post('/api/users/regular_user1/transactions')
    .set('Cookie', cookie)
    .send({
        username: 'regular_userX',
        amount: 100,
        type: 'anotherCategory',});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The requested user in the body doesn't exist",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the username inserted in transaction does not exist', async () => {
    const fakeRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkzMDE1Njc3fQ.t77ZJs_S0P-0mov868Cxe1F8V-R7is6X8LqarJk5B98';
    const fakeAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkxODkyNDc3fQ._lMSZ6SOWEkarA-45sQpHXjdzTbJVtXAMrT1HMbxyTE';
    const fakeCookie = 'accessToken='+fakeAccessToken+';'+'refreshToken='+fakeRefreshToken+';';

    const response = await request(app)
      .post('/api/users/fakeUser/transactions')
      .set('Cookie', fakeCookie)
      .send({
          username: 'regular_user1',
          amount: 100,
          type: 'anotherCategory',});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The requested user in the parameters doesn't exist",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the username inserted in transaction does not match the users', async () => {
    const response = await request(app)
      .post('/api/users/regular_user1/transactions')
      .set('Cookie', cookie)
      .send({
          username: 'regular_user2',
          amount: 100,
          type: 'anotherCategory',});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The username in the URL and that in the request's body don't match",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the requested category type does not exist', async () => {
    const response = await request(app)
      .post('/api/users/regular_user1/transactions')
      .set('Cookie', cookie)
      .send({
          username: 'regular_user1',
          amount: 100,
          type: 'nonExistingCategory',});
  
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error:  "The requested category type doesn't exist",
      refreshedTokenMessage: undefined
    });
  
  });

  test('should create a new transaction successfully', async () => {
    const response = await request(app)
      .post('/api/users/regular_user1/transactions')
      .set('Cookie', cookie)
      .send({
        username: 'regular_user1',
        amount: 100,
        type: 'testCategory',
       });

    expect(response.status).toBe(200);
    expect(response.body.data.username).toBe('regular_user1');
    expect(response.body.data.amount).toBe(100);
    expect(response.body.data.type).toBe('testCategory');
  });
  
})

describe('getAllTransactions', () =>{
  let accessToken, refreshToken, cookie;
  beforeEach(async() => {
    // Clean up the test data
    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' },{ type: 'firstCategory', color: '#505050' }];
    await categories.insertMany(categoryObject);


  // Create test transactions for the user and category
  const transactionsData = [
    {
      username: 'regular_user1',
      amount: 100,
      type: 'testCategory',
      date: '2023-06-01',
    },
    {
      username: 'regular_user1',
      amount: 200,
      type: 'testCategory',
      date: '2023-06-04',
    },
    {
      username: 'regular_user1',
      amount: 333,
      type: 'anotherCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user2',
      amount: 400,
      type: 'testCategory',
      date: '2023-06-08',
    },
  ];
  await transactions.insertMany(transactionsData);


    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  
  test('should return 401 if a non-admin user try to perform this method', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', cookie);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("You are not an admin");
  });

  test('should return all the users\' transactions to admin', async () => {
    const currentUser = await User.findOne({ email: 'admin@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        username: 'regular_user1',
        amount: 100,
        color: '#121212',
        type: 'testCategory',
        date: '2023-06-01T00:00:00.000Z',
      },
      {
        username: 'regular_user1',
        amount: 200,
        color: '#121212',
        type: 'testCategory',
        date: '2023-06-04T00:00:00.000Z',
      },
      {
        username: 'regular_user1',
        amount: 333,
        color: '#888888',
        type: 'anotherCategory',
        date: '2023-06-02T00:00:00.000Z',
      },
      {
        username: 'regular_user2',
        amount: 400,
        color: '#121212',
        type: 'testCategory',
        date: '2023-06-08T00:00:00.000Z',
      },
    ]);
  });

})

describe('getTransactionsByUser', () => {
  let accessToken,refreshToken, cookie;

  beforeEach(async () => {
    await User.deleteMany();
    await transactions.deleteMany();
    await categories.deleteMany();

  //---------------------------------------------------------------------------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('user123', 12);
  // Create a test user
  const users = [{
      email: 'user1@example.com',
      password: hashedPassword, 
      username: 'regular_user1',
      role: 'Regular',
  },{
      email: 'user2@example.com',
      password: hashedPassword, 
      username: 'regular_user2',
  },{
      email: 'user3@example.com',
      password: hashedPassword, 
      username: 'regular_user3',
  },{
      email: 'admin@example.com',
      password: hashedPassword,
      username: 'admin_1',
      role: 'Admin',    
  }];
  await User.insertMany(users);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create a test category
  const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
  await categories.insertMany(categoryObject);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create test transactions for the user and category
  const transactionsData = [
    {
      username: 'regular_user1',
      amount: 100,
      type: 'testCategory',
      date: '2023-06-01',
    },
    {
      username: 'regular_user1',
      amount: 200,
      type: 'testCategory',
      date: '2023-06-04',
    },
    {
      username: 'regular_user1',
      amount: 333,
      type: 'anotherCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user2',
      amount: 400,
      type: 'testCategory',
      date: '2023-06-08',
    },
  ];
  await transactions.insertMany(transactionsData);
  //---------------------------------------------------------------------------------------------------------------------------------------------

  const currentUser = await User.findOne({ email: 'user1@example.com' });

  //CREATE ACCESS TOKEN
  accessToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "1h" }
  );

  //CREATE REFRESH TOKEN
  refreshToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "7d" }
  );

  cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('return a 401 error if a non-admin user try to access admin-only endpoint', async () => {
    const response = await request(app)
      .get(`/api/transactions/users/regular_user1?from=2023-06-04`)
      .set('Cookie', cookie);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "You are not an admin",
        refreshedTokenMessage: undefined,
      });
    });

  test('should return 400 if the user does not exist', async () => {
      const fakeRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkzMDE1Njc3fQ.t77ZJs_S0P-0mov868Cxe1F8V-R7is6X8LqarJk5B98';
      const fakeAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkxODkyNDc3fQ._lMSZ6SOWEkarA-45sQpHXjdzTbJVtXAMrT1HMbxyTE';
      const fakeCookie = 'accessToken='+fakeAccessToken+';'+'refreshToken='+fakeRefreshToken+';';

      const response = await request(app)
      .get(`/api/users/fakeUser/transactions`)
      .set('Cookie', fakeCookie);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "The requested user doesn't exist",
        refreshedTokenMessage: undefined,
      });
    });
  

  test('should return all transactions made by a specific user', async () => {
    const response = await request(app)
      .get(`/api/users/regular_user1/transactions?from=2023-06-04&max=300`)
      .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
          [{"amount": 200, "color": "#121212", "date": "2023-06-04T00:00:00.000Z", "type": "testCategory", "username": "regular_user1"}]
      );
    });

});

describe('getTransactionsByUserByCategory', () => {
  let accessToken,refreshToken,cookie;

//    afterAll(async () => {});
    beforeEach(async() => {
    // Clean up the test data
    await transactions.deleteMany();
    await User.deleteMany();
    await categories.deleteMany();

    const hashedPassword = await bcrypt.hash('user123', 12);

    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);

    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
    await categories.insertMany(categoryObject);

    // Create test transactions for the user and category
    const transactionsData = [
      {
        username: 'regular_user1',
        amount: 100,
        type: 'testCategory',
        date: '2023-06-01',
      },
      {
        username: 'regular_user1',
        amount: 200,
        type: 'testCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user1',
        amount: 333,
        type: 'anotherCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user2',
        amount: 400,
        type: 'testCategory',
        date: '2023-06-01',
      },
    ];
    await transactions.insertMany(transactionsData);



    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });


  test('should return transactions by user and category', async () => {
    const response = await request(app)
    .get('/api/users/regular_user1/transactions/category/testCategory')
    .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          username: 'regular_user1',
          amount: 100,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-01T00:00:00.000Z',
        },
        {
          username: 'regular_user1',
          amount: 200,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-02T00:00:00.000Z',
        },
      ],
      refreshedTokenMessage: undefined,
    });
  });

  test('should return empty array if no transactions exist', async () => {
    // Delete the test transactions
    let a = 1;
    await transactions.deleteMany({ username: 'regular_user1' });
    a =2 ;
    const response = await request(app)
    .get('/api/users/regular_user1/transactions/category/testCategory')
    .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      refreshedTokenMessage: undefined,
    });
  });

  test('should return error 400 if user does not exist', async () => {
    // Delete the test user
    await User.deleteMany({ username: 'regular_user1' });

    const response = await request(app)
    .get('/api/users/regular_user1/transactions/category/testCategory')
    .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The requested user doesn't exist",
      refreshedTokenMessage: undefined,
    });
  });

  test('should return error 400 if category does not exist', async () => {
    // Delete the test category
    await categories.deleteMany({ type: 'testCategory' });

    const response = await request(app)
    .get('/api/users/regular_user1/transactions/category/testCategory')
    .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The requested category doesn't exist",
      refreshedTokenMessage: undefined,
    });
  });

  test('should return error 401 if a regular user try to access admin-specific functions', async () => {
    const response = await request(app)
    .get('/api/transactions/users/regular_user1/category/testCategory')
    .set('Cookie', cookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "You are not an admin",
      refreshedTokenMessage: undefined,
    });
  });

});

describe('getTransactionsByGroup', () => {
  let accessToken,refreshToken, cookie;

  beforeEach(async () => {
    await Group.deleteMany();
    await User.deleteMany();
    await transactions.deleteMany();
    await categories.deleteMany();

//---------------------------------------------------------------------------------------------------------------------------------------------
    const hashedPassword = await bcrypt.hash('user123', 12);
    // Create a test user
    const users = [{
        email: 'user1@example.com',
        password: hashedPassword, 
        username: 'regular_user1',
        role: 'Regular',
    },{
        email: 'user2@example.com',
        password: hashedPassword, 
        username: 'regular_user2',
    },{
        email: 'user3@example.com',
        password: hashedPassword, 
        username: 'regular_user3',
    },{
        email: 'admin@example.com',
        password: hashedPassword,
        username: 'admin_1',
        role: 'Admin',    
    }];
    await User.insertMany(users);
//---------------------------------------------------------------------------------------------------------------------------------------------
    // Create a test category
    const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
    await categories.insertMany(categoryObject);
//---------------------------------------------------------------------------------------------------------------------------------------------
    // Create test transactions for the user and category
    const transactionsData = [
      {
        username: 'regular_user1',
        amount: 100,
        type: 'testCategory',
        date: '2023-06-01',
      },
      {
        username: 'regular_user1',
        amount: 200,
        type: 'testCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user1',
        amount: 333,
        type: 'anotherCategory',
        date: '2023-06-02',
      },
      {
        username: 'regular_user2',
        amount: 400,
        type: 'testCategory',
        date: '2023-06-01',
      },
    ];
    await transactions.insertMany(transactionsData);
//---------------------------------------------------------------------------------------------------------------------------------------------
const user1 = User.findOne({ email: 'user1@example.com' });
const user2 = User.findOne({ email: 'user2@example.com' });
// Insert test data into the database
const group = await Group.create({ name: 'testGroup', members: [{email:'user1@example.com', user: user1.id},{email:'user2@example.com', user: user2.id}] });
//---------------------------------------------------------------------------------------------------------------------------------------------

    const currentUser = await User.findOne({ email: 'user1@example.com' });

    //CREATE ACCESS TOKEN
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );

    //CREATE REFRESH TOKEN
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );

    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('should return a 400 error if no group with the mentioned name exist', async () => {
    const response = await request(app)
    .get('/api/groups/anotherGroup/transactions');


    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The requested group doesn't exist",
    });
  });

  test('should return an array of transactions made by members of a specific group', async () => {
    const response = await request(app)
    .get('/api/groups/testGroup/transactions')
    .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          username: 'regular_user1',
          amount: 100,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-01T00:00:00.000Z',
        },
        {
          username: 'regular_user1',
          amount: 200,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-02T00:00:00.000Z',
        },
        {
          username: 'regular_user1',
          amount: 333,
          type: 'anotherCategory',
          color: '#888888',
          date: '2023-06-02T00:00:00.000Z',
        },
        {
          username: 'regular_user2',
          amount: 400,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-01T00:00:00.000Z',
        },
      ],
      refreshedTokenMessage: undefined,
    });
  });

  test('should return an empty array if there are no transactions made by the group', async () => {
    await transactions.deleteMany();
    const response = await request(app)
    .get('/api/groups/testGroup/transactions')
    .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      refreshedTokenMessage: undefined,
    });
  });

  test('should return an error 401 if a non-member user try to retrieve group\'s transactions', async () => {
    const currentUser = await User.findOne({ email: 'user3@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
    .get('/api/groups/testGroup/transactions')
    .set('Cookie', cookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "You are not member of this group",
      refreshedTokenMessage: undefined
    });

  });
});

describe('getTransactionsByGroupByCategory', () => {
  let accessToken,refreshToken, cookie;

  beforeEach(async () => {
    await Group.deleteMany();
    await User.deleteMany();
    await transactions.deleteMany();
    await categories.deleteMany();

  //---------------------------------------------------------------------------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('user123', 12);
  // Create a test user
  const users = [{
      email: 'user1@example.com',
      password: hashedPassword, 
      username: 'regular_user1',
      role: 'Regular',
  },{
      email: 'user2@example.com',
      password: hashedPassword, 
      username: 'regular_user2',
  },{
      email: 'user3@example.com',
      password: hashedPassword, 
      username: 'regular_user3',
  },{
      email: 'admin@example.com',
      password: hashedPassword,
      username: 'admin_1',
      role: 'Admin',    
  }];
  await User.insertMany(users);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create a test category
  const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
  await categories.insertMany(categoryObject);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create test transactions for the user and category
  const transactionsData = [
    {
      username: 'regular_user1',
      amount: 100,
      type: 'testCategory',
      date: '2023-06-01',
    },
    {
      username: 'regular_user1',
      amount: 200,
      type: 'testCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user1',
      amount: 333,
      type: 'anotherCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user2',
      amount: 400,
      type: 'testCategory',
      date: '2023-06-01',
    },
  ];
  await transactions.insertMany(transactionsData);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  const user1 = User.findOne({ email: 'user1@example.com' });
  const user2 = User.findOne({ email: 'user2@example.com' });
  // Insert test data into the database
  const group = await Group.create({ name: 'testGroup', members: [{email:'user1@example.com', user: user1.id},{email:'user2@example.com', user: user2.id}] });
  //---------------------------------------------------------------------------------------------------------------------------------------------

  const currentUser = await User.findOne({ email: 'user1@example.com' });

  //CREATE ACCESS TOKEN
  accessToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "1h" }
  );

  //CREATE REFRESH TOKEN
  refreshToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "7d" }
  );

  cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('should return an array of transactions made by members of a specific group filtered by category', async () => {
    const response = await request(app)
      .get(`/api/groups/testGroup/transactions/category/testCategory`)
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          username: 'regular_user1',
          amount: 100,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-01T00:00:00.000Z',
        },
        {
          username: 'regular_user1',
          amount: 200,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-02T00:00:00.000Z',
        },
        {
          username: 'regular_user2',
          amount: 400,
          type: 'testCategory',
          color: '#121212',
          date: '2023-06-01T00:00:00.000Z',
        },
      ],
      refreshedTokenMessage: undefined,
    });
  });

  test('should return 400 if the requested group does not exist', async () => {
    const response = await request(app)
    .get(`/api/groups/anotherGroup/transactions/category/testCategory`)
    .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The requested group doesn't exist",
    });

  });

  test('should return 400 if the requested category does not exist', async () => {
    const response = await request(app)
    .get(`/api/groups/testGroup/transactions/category/aNonExistingCategory`)
    .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "The requested category doesn't exist",
    });
  });

  test('should return 401 if the user is not authorized to access the endpoint', async () => {
    const currentUser = await User.findOne({ email: 'user3@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
    .get(`/api/groups/testGroup/transactions/category/testCategory`)
    .set('Cookie', cookie);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "You are not member of this group",
      refreshedTokenMessage: undefined
    });
  });
});

describe('deleteTransaction', () => {
  let accessToken,refreshToken, cookie;

  beforeEach(async () => {
    await User.deleteMany();
    await transactions.deleteMany();
    await categories.deleteMany();

  //---------------------------------------------------------------------------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('user123', 12);
  // Create a test user
  const users = [{
      email: 'user1@example.com',
      password: hashedPassword, 
      username: 'regular_user1',
      role: 'Regular',
  },{
      email: 'user2@example.com',
      password: hashedPassword, 
      username: 'regular_user2',
  },{
      email: 'user3@example.com',
      password: hashedPassword, 
      username: 'regular_user3',
  },{
      email: 'admin@example.com',
      password: hashedPassword,
      username: 'admin_1',
      role: 'Admin',    
  }];
  await User.insertMany(users);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create a test category
  const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
  await categories.insertMany(categoryObject);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create test transactions for the user and category
  const transactionsData = [
    {
      username: 'regular_user1',
      amount: 100,
      type: 'testCategory',
      date: '2023-06-01',
    },
    {
      username: 'regular_user1',
      amount: 200,
      type: 'testCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user1',
      amount: 333,
      type: 'anotherCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user2',
      amount: 400,
      type: 'testCategory',
      date: '2023-06-01',
    },
  ];
  await transactions.insertMany(transactionsData);
  //---------------------------------------------------------------------------------------------------------------------------------------------

  const currentUser = await User.findOne({ email: 'user1@example.com' });

  //CREATE ACCESS TOKEN
  accessToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "1h" }
  );

  //CREATE REFRESH TOKEN
  refreshToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "7d" }
  );

  cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });

  test('should delete a transaction for an existing user', async () => {
    const transactionToBeDeleted = await transactions.find({username: 'regular_user1'});

    const response = await request(app)
      .delete(`/api/users/regular_user1/transactions`)
      .set('Cookie', cookie)
      .send({ _id: transactionToBeDeleted[0]._id });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('message', 'Transaction deleted');
  });

  test('should return 401 if the requested transaction does not belong to the user', async () => {
    const transactionToBeDeleted = await transactions.find({username: 'regular_user2'});

    //here user1 tries to delete a transaction that belongs to user2
    const response = await request(app)
      .delete(`/api/users/regular_user2/transactions`)
      .set('Cookie', cookie)
      .send({ _id: transactionToBeDeleted[0]._id });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "You are not flag to access this user's data",
        refreshedTokenMessage: undefined
      });
  
  });

  test('should return 400 if the transaction id is empty or not sent', async () => {
    const response = await request(app)
      .delete(`/api/users/regular_user1/transactions`)
      .set('Cookie', cookie)
      .send({ _id: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(
        "Request's body is incomplete: it should contain a non-empty `_id");
  });

  test('should return 400 if the requested transaction does not belong to the user, V2', async () => {
    const transactionToBeDeleted = await transactions.find({username: 'regular_user2'});

    //here user1 tries to delete a transaction that belongs to user2
    const response = await request(app)
      .delete(`/api/users/regular_user1/transactions`)
      .set('Cookie', cookie)
      .send({ _id: transactionToBeDeleted[0]._id });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "The requested transaction doesn't belong to you",
        refreshedTokenMessage: undefined
      });
  
  });

  test('should return 400 if the requested transaction does not exist', async () => {
    const response = await request(app)
      .delete(`/api/users/regular_user1/transactions`)
      .set('Cookie', cookie)
      .send({ _id: '0000d0258615c8d000000000' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "The requested transaction doesn't exist",
        refreshedTokenMessage: undefined
      });

  });

  test('should return 400 if the requested user does not exist', async () => {
    const fakeRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkzMDE1Njc3fQ.t77ZJs_S0P-0mov868Cxe1F8V-R7is6X8LqarJk5B98';
    const fakeAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20iLCJpZCI6IjY0ODEzNjY2OTQ4MDIwZWQxYmU0YmEwMCIsInVzZXJuYW1lIjoiZmFrZVVzZXIiLCJyb2xlIjoicmVndWxhciIsImlhdCI6MTY4NjE5MDA3NywiZXhwIjoxNjkxODkyNDc3fQ._lMSZ6SOWEkarA-45sQpHXjdzTbJVtXAMrT1HMbxyTE';
    const fakeCookie = 'accessToken='+fakeAccessToken+';'+'refreshToken='+fakeRefreshToken+';';

    const transactionToBeDeleted = await transactions.find({username: 'regular_user1'});

    const response = await request(app)
      .delete(`/api/users/fakeUser/transactions`)
      .set('Cookie', fakeCookie)
      .send({ _id: transactionToBeDeleted[0]._id });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "The requested user doesn't exist",
        refreshedTokenMessage: undefined
      });
  });

});

describe('deleteTransactions', () => {
  let accessToken,refreshToken, cookie;

  beforeEach(async () => {
    await User.deleteMany();
    await transactions.deleteMany();
    await categories.deleteMany();

  //---------------------------------------------------------------------------------------------------------------------------------------------
  const hashedPassword = await bcrypt.hash('user123', 12);
  // Create a test user
  const users = [{
      email: 'user1@example.com',
      password: hashedPassword, 
      username: 'regular_user1',
      role: 'Regular',
  },{
      email: 'user2@example.com',
      password: hashedPassword, 
      username: 'regular_user2',
  },{
      email: 'user3@example.com',
      password: hashedPassword, 
      username: 'regular_user3',
  },{
      email: 'admin@example.com',
      password: hashedPassword,
      username: 'admin_1',
      role: 'Admin',    
  }];
  await User.insertMany(users);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create a test category
  const categoryObject = [{ type: 'testCategory', color: '#121212' },{ type: 'anotherCategory', color: '#888888' }];
  await categories.insertMany(categoryObject);
  //---------------------------------------------------------------------------------------------------------------------------------------------
  // Create test transactions for the user and category
  const transactionsData = [
    {
      username: 'regular_user1',
      amount: 100,
      type: 'testCategory',
      date: '2023-06-01',
    },
    {
      username: 'regular_user1',
      amount: 200,
      type: 'testCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user1',
      amount: 333,
      type: 'anotherCategory',
      date: '2023-06-02',
    },
    {
      username: 'regular_user2',
      amount: 400,
      type: 'testCategory',
      date: '2023-06-01',
    },
  ];
  await transactions.insertMany(transactionsData);
  //---------------------------------------------------------------------------------------------------------------------------------------------

  const currentUser = await User.findOne({ email: 'admin@example.com' });

  //CREATE ACCESS TOKEN
  accessToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "1h" }
  );

  //CREATE REFRESH TOKEN
  refreshToken = jwt.sign(
      {
          email: currentUser.email,
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
      },
      process.env.ACCESS_KEY,
      { expiresIn: "7d" }
  );

  cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';
  });


  test('should return 401 if a non-admin user try to access deleteTransactions', async () => {
    const currentUser = await User.findOne({ email: 'user1@example.com' });
    accessToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "1h" }
    );
    refreshToken = jwt.sign(
        {
            email: currentUser.email,
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: "7d" }
    );
    cookie = 'accessToken='+accessToken+';'+'refreshToken='+refreshToken+';';

    const response = await request(app)
      .delete('/api/transactions')
      .set('Cookie', cookie)
      .send({ _ids: ''});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "You are not an admin",
        refreshedTokenMessage: undefined
      });

  });

  test('should return 400 if an element of `_ids` is an empty string', async () => {
    const response = await request(app)
    .delete('/api/transactions')
    .set('Cookie', cookie)
    .send({ _ids: ''});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Request's body is incomplete: it should contain a non-empty array `_ids`",
      refreshedTokenMessage: undefined
    });

  });

  test('should return 400 if one or more of the requested transactions do not exist', async () => {
    const response = await request(app)
    .delete('/api/transactions')
    .set('Cookie', cookie)
    .send({ _ids: ['021','051','','0111']});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Request's body is incomplete: every element of `_ids` should not be an empty string",
      refreshedTokenMessage: undefined
    });
  });

  test('should return 400 if the request body is incomplete', async () => {
    const response = await request(app)
    .delete('/api/transactions')
    .set('Cookie', cookie)
    .send({ _ids: ['0000d0258615c8d000000000','111122223333444455556666']});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "One or more of the requested transactions don't exist",
      refreshedTokenMessage: undefined
    });
  });
  
  test('should delete multiple transactions identified by their ids', async () => {
    const transactionsToBeDeleted = await transactions.find({username: 'regular_user1'});

    const response = await request(app)
    .delete('/api/transactions')
    .set('Cookie', cookie)
    .send({ _ids: [transactionsToBeDeleted[0]._id,transactionsToBeDeleted[1]._id]});

    expect(response.status).toBe(200);
    expect(response.body.data.message).toEqual( "Transactions deleted");
  });


});
