import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require("bcryptjs")

jest.mock("bcryptjs")
jest.mock('../models/User.js');

const { register } = require('../controllers/auth');
describe('register', () => { 
    test('should return a 400 error if missing required parameter', async () => {
        const req = {
          body: {
            username: 'james_lin',
            // Missing email and password
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        await register(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`",
        });
    });

    test('should return a 400 error if at least one of the request body parameters is an empty string', async () => {
      const req = {
        body: {
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      await register(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`",
      });
    });

    test('should return a 400 error if missing required parameter', async () => {
      const req = {
        body: {
          password: 'password123',
          // Missing email and username
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      await register(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`",
      });
    });

    test('should return a 400 error when the email format is wrong', async () => {
        const req = {
        body: {
            username: 'james_lin',
            email: 'jamesL.com', 
            password: 'password123',
        },
        };
        const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({  error: "The email given is in the wrong format", });
    });

    test('should return a 400 error if another account with the same username/email is already registered', async () => {
        const req = {
          body: {
            username: "Anna_k",
            email: "existingemail@example.com",
            password: "pass123",
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        const findOneSpy = jest.spyOn(User, "findOne");
        findOneSpy.mockResolvedValue({}); 
    
        await register(req, res);
    
        expect(findOneSpy).toHaveBeenCalledWith({
          $or: [{ username: req.body.username }, { email: req.body.email }],
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Another account with the same username/email is already registered",
        });
    
        findOneSpy.mockRestore();
    });
      
    test('should register a new user and return"User added successfully" message', async() => {
        const req = {
            body: {
              username: 'james_lin',
              email: 'jamesL@example.com',
              password: 'password123',
            },
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
    
    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { message: "User added successfully" } });
    });

    test('should return a 500 response', async () => {
      const req = {
        body: {
          username: "Anna_k",
          email: "existingemail@example.com",
          password: "pass123",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  

      User.findOne.mockRejectedValueOnce(new Error('server error'));    
      await register(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);

  });
});

const { registerAdmin } = require('../controllers/auth');
describe("registerAdmin", () => { 
    test('should return a 400 error if the request body is incomplete', async () => {
        const req = {
          body: {
            username: 'Admin_1',
            // Missing email and password
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        await registerAdmin(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`"
        });
    });

    test('should return a 400 error if at least one of the request body parameters is an empty string', async () => {
      const req = {
        body: {
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      await registerAdmin(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`"
      });
    });

    test('should return a 400 error if the request body is incomplete', async () => {
      const req = {
        body: {
          email: 'Admin1@yahoo.com', 
          password: 'adminpass',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      await registerAdmin(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `username`, `email` and `password`"
      });
    });

    test('should return a 400 error when the email format is wrong', async () => {
        const req = {
        body: {
            username: 'Admin_1',
            email: 'Admin_1.com', 
            password: 'adminpass',
        },
        };
        const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        };

        await registerAdmin(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "The email given is in the wrong format" });
    });

    test('should return a 400 error if another admin account with the same username/email is already registered', async () => {
        const req = {
          body: {
            username: "Admin_5",
            email: "admintestemail@example.com",
            password: "pass123",
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        const findOneSpy = jest.spyOn(User, "findOne");
        findOneSpy.mockResolvedValue({}); 
    
        await register(req, res);
    
        expect(findOneSpy).toHaveBeenCalledWith({
          $or: [{ username: req.body.username }, { email: req.body.email }],
        });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Another account with the same username/email is already registered",
        });
    
        findOneSpy.mockRestore();
    });

    test('should register a new admin and return"success message"', async() => {
        const req = {
            body: {
              username: 'Admin_1',
              email: 'firstAdmin@example.com',
              password: 'adminpass',
              role: "Admin",
            },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        
        await registerAdmin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: "Admin added successfully" } });
    });

    test('should return a 500 response', async() => {
      const req = {
          body: {
            username: 'Admin_1',
            email: 'firstAdmin@example.com',
            password: 'adminpass',
            role: "Admin",
          },
      };
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      User.findOne.mockRejectedValueOnce(new Error('server error'));
      
      await registerAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
  });
})

const { login } = require('../controllers/auth');
describe('login', () => { 
    test('should return a 400 response if the request body is incomplete', async () => {
        const req = {
          body: {
            password: 'password123',
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
    
        await login(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Request's body is incomplete: it should contain non-empty `email` and `password`"
        });
    });

    test('should return a 400 response if the request body is incomplete', async () => {
      const req = {
        body: {
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
  
      await login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `email` and `password`"
      });
    });

    test('should return a 400 response if the request body is incomplete', async () => {
      const req = {
        body: {
          email: 'usernumber4@example.com'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
  
      await login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Request's body is incomplete: it should contain non-empty `email` and `password`"
      });
    });

    test('should return a 400 error when the email format is wrong', async () => {
      const req = {
      body: {
          username: 'jack44',
          email: 'jackgmail.com', 
          password: 'userpassword',
      },
      };
      const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      };

      await registerAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "The email given is in the wrong format" });
    });

    test('should return a 400 response if there is no existing account with entered email', async () => {
        User.findOne.mockResolvedValue(null);
    
        const req = {
          body: {
            email: 'thereisnot@example.com',
            password: 'password123',
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        await login(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "This email is not associated with any account"
        });
    });
    
    test('should return a 400 response if the entered password is not right', async () => {
        User.findOne.mockResolvedValue({
          email: 'mailtest@example.com',
          password: 'passwordTest',
          id: 'user_id',
          username: 'user_name',
          role: 'user',
        });
    
        bcrypt.compare.mockResolvedValue(false);
    
        const req = {
          body: {
            email: 'mailtest@example.com',
            password: 'wrong_password',
          },
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
    
        await login(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Wrong password"
        });
    });    

    test('should return a 500 response', async () => {
      User.findOne.mockRejectedValueOnce(new Error('server error'));
  
      const req = {
        body: {
          email: 'thereisnot@example.com',
          password: 'password123',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
  
      await login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);

  });
});
const { logout } = require('../controllers/auth');
describe('logout', () => { 
    test("should return a 400 response if no refreshToken is provided", async () => {
        const req = {
          cookies: {}
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
    
        await logout(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Refresh token not found"
        });
    });
    
    test("should return a 400 response if the user is not found", async () => {
        const req = {
          cookies: {
            refreshToken: "invalidRefreshToken"
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
    
        User.findOne = jest.fn().mockResolvedValue(null);
    
        await logout(req, res);
    
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "User not found"
        });
    });
    
    test("should return a 200 response and successfully log out the user", async () => {
        const req = {
          cookies: {
            refreshToken: "validRefreshToken"
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          cookie: jest.fn()
        };
    
        const user = {
          refreshToken: "validRefreshToken",
          save: jest.fn()
        };
    
        User.findOne = jest.fn().mockResolvedValue(user);
    
        await logout(req, res);
    
        expect(user.refreshToken).toBeNull();
        expect(res.cookie).toHaveBeenCalledWith("accessToken", "", {
          httpOnly: true,
          path: "/api",
          maxAge: 0,
          sameSite: "none",
          secure: true
        });
        expect(res.cookie).toHaveBeenCalledWith("refreshToken", "", {
          httpOnly: true,
          path: "/api",
          maxAge: 0,
          sameSite: "none",
          secure: true
        });
        expect(user.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          data: {
            message: "User logged out"
          }
        });
    });

    test("should return a 500 response", async () => {
      const req = {
        cookies: {
          refreshToken: "invalidRefreshToken"
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
  
      User.findOne.mockRejectedValueOnce(new Error('server error'));        
      await logout(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
  });
});