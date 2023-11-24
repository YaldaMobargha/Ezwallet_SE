import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from '../controllers/utils';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
describe('handleDateFilterParams', () => {
    test('should return an empty object when no date parameters are provided', () => {
      const req = { query: {} };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({});
    });
  
    test('should throw an error for invalid date parameter', () => {
      const req = { query: { date: '2023-25-40' } };
      expect(() => handleDateFilterParams(req)).toThrow(
        'The query parameter `date` has an invalid value: it must be in the form YYYY-MM-DD'
      );
    });
  
    test('should throw an error for conflicting date parameters', () => {
      const req = { query: { date: '2023-06-01', from: '2023-06-01' } };
      expect(() => handleDateFilterParams(req)).toThrow(
        'You cannot specify an exact date and a date range'
      );
    });
  
    test('should return query for specific date', () => {
      const req = { query: { date: '2023-06-01' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $gte: new Date('2023-06-01T00:00:00.000Z'),
          $lte: new Date('2023-06-01T23:59:59.999Z')
        }
      });
    });
  
    test('should return query for date range [from, +infinity]', () => {
      const req = { query: { from: '2023-06-01' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $gte: new Date('2023-06-01T00:00:00.000Z')
        }
      });
    });
  
    test('should return query for date range [-infinity, upTo]', () => {
      const req = { query: { upTo: '2023-06-01' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $lte: new Date('2023-06-01T23:59:59.999Z')
        }
      });
    });
  
    test('should return query for valid date range [from, upTo]', () => {
      const req = { query: { from: '2023-06-01', upTo: '2023-06-10' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $gte: new Date('2023-06-01T00:00:00.000Z'),
          $lte: new Date('2023-06-10T23:59:59.999Z')
        }
      });
    });
  
    test('should throw an error for invalid date range', () => {
      const req = { query: { from: '2023-06-10', upTo: '2023-06-01' } };
      expect(() => handleDateFilterParams(req)).toThrow('Invalid date range');
    });
  });

  describe('handleAmountFilterParams', () => {
    test('should return an empty object when no amount parameters are provided', () => {
      const req = { query: {} };
      const result = handleAmountFilterParams(req);
      expect(result).toEqual({});
    });
  
    test('should throw an error for invalid min parameter', () => {
      const req = { query: { min: 'abc' } };
      expect(() => handleAmountFilterParams(req)).toThrow(
        'The query parameter `min` has an invalid value: it must be a number'
      );
    });
  
    test('should throw an error for invalid max parameter', () => {
      const req = { query: { max: 'xyz' } };
      expect(() => handleAmountFilterParams(req)).toThrow(
        'The query parameter `max` has an invalid value: it must be a number'
      );
    });
  
    test('should return query for min amount', () => {
      const req = { query: { min: '100' } };
      const result = handleAmountFilterParams(req);
      expect(result).toEqual({
        amount: {
          $gte: 100
        }
      });
    });
  
    test('should return query for max amount', () => {
      const req = { query: { max: '500' } };
      const result = handleAmountFilterParams(req);
      expect(result).toEqual({
        amount: {
          $lte: 500
        }
      });
    });
  
    test('should return query for valid amount range', () => {
      const req = { query: { min: '100', max: '500' } };
      const result = handleAmountFilterParams(req);
      expect(result).toEqual({
        amount: {
          $gte: 100,
          $lte: 500
        }
      });
    });
  
    test('should throw an error for invalid amount range', () => {
      const req = { query: { min: '500', max: '100' } };
      expect(() => handleAmountFilterParams(req)).toThrow('Invalid amount range');
    });
  });
  
  
  describe('verifyAuth', () => {
    let adminAccessToken,adminRefreshToken,user1AccessToken,user1RefreshToken;
    const req = {
        cookies: {
          accessToken: '',
          refreshToken: '',
        },
        params: {
          username: '',
        },
    };
    const res = {
        cookie: jest.fn(),
        locals: {},
    };
    beforeEach(() => {
        jest.clearAllMocks();
        
        //creating cookies for a user and one admin to test different combination of code flow
        user1AccessToken  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXIxQGV4YW1wbGUuY29tIiwiaWQiOiIwMDAxMzY2Njk0ODAyMGVkMWJlNGJhMDAiLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZSI6IlJlZ3VsYXIiLCJpYXQiOjE2ODYzMTEyNDEsImV4cCI6MTY5MTA2MzI0MX0.Q3RJP3NFYwflA2w_9GKpwOXJxlzn3ezqqkRxJh9uMvg';
        user1RefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXIxQGV4YW1wbGUuY29tIiwiaWQiOiIwMDAxMzY2Njk0ODAyMGVkMWJlNGJhMDAiLCJ1c2VybmFtZSI6InVzZXIxIiwicm9sZSI6IlJlZ3VsYXIiLCJpYXQiOjE2ODYzMTEyNDEsImV4cCI6MTY5MzkxNDQ0MX0.G0Z6mZHEmZe_12VgcS_8FaR-ldlKuG0aLlKkx8a4Id4';

        adminAccessToken  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWQiOiIwMDAwMDA2Njk0ODAyMGVkMWJlNGJhMDAiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNjg2MzExNDQ4LCJleHAiOjE2OTEwNjM0NDh9.ykzfBL6N9DTB1-gFvll7b-oBiacSefuOJ7X5igpwlyg';
        adminRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWQiOiIwMDAwMDA2Njk0ODAyMGVkMWJlNGJhMDAiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNjg2MzExNDQ4LCJleHAiOjE2OTM5MTQ2NDh9.pNQ856AjOqz9FzH2WqkEaYN3epC9L8Wa5ZJTJyzRNQc';
    });


    test('should return false if at least one token is missing', async () => {
        req.cookies.accessToken = '';
        req.cookies.refreshToken = '';
        const result = verifyAuth(req,res,{ authType: 'User',username: 'user1'});

        expect(result).toEqual({ flag: false, cause: "One of the tokens is missing" });
    });
    test('should return false if at least one property of accessToken is missing', async () => {
        const tempAccessToken = jwt.sign(
            {
              username: 'adminuser',
              email: 'adminuser@example.com',
              role: '',
            },
            process.env.ACCESS_KEY,
            { expiresIn: '55d' }
          );
      
          const tempRefreshToken = jwt.sign(
            {
              username: 'adminuser',
              email: 'adminuser@example.com',
              role: 'Admin',
            },
            process.env.ACCESS_KEY,
            { expiresIn: '88d' }
          );
        req.cookies.accessToken = tempAccessToken;
        req.cookies.refreshToken = tempRefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: false, cause: "Token is missing information" });
    });
    test('should return false if at least one property of refreshToken is missing', async () => {
        const tempAccessToken = jwt.sign(
            {
              username: 'adminuser',
              email: 'adminuser@example.com',
              role: 'Admin',
            },
            process.env.ACCESS_KEY,
            { expiresIn: '55d' }
          );
      
          const tempRefreshToken = jwt.sign(
            {
              username: 'adminuser',
              email: 'adminuser@example.com',
              role: '',
            },
            process.env.ACCESS_KEY,
            { expiresIn: '88d' }
          );
        req.cookies.accessToken = tempAccessToken;
        req.cookies.refreshToken = tempRefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: false, cause: "Token is missing information" });
    });
    test('should return false if at least one of the variables\' value of accessToken and refreshToken doesn\'t match', async () => {
        req.cookies.accessToken = adminAccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: false, cause: "Mismatched tokens" });
    });
    test('should return true if a user try to verify him/herself', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'User',username: 'user1'});

        expect(result).toEqual({ flag: true});
    });
    test('should return false if a user try to access verifyAuth with other user\'s username', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'User',username: 'user2'});

        expect(result).toEqual({ flag: false ,cause: "You are not flag to access this user's data"});
    });
    test('should return true if an admin try to verify', async () => {
        req.cookies.accessToken = adminAccessToken;
        req.cookies.refreshToken = adminRefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: true});
    });
    test('should return false if a non-admin user try to verify with admin priviledge', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: false ,cause: "You are not an admin"});
    });
    test('should return true if a member of the group try to reach group specific functions', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Group', emails: ['user1@example.com']});

        expect(result).toEqual({ flag: true});
    });
    test('should return false if a user non-included in the group try to reach group specific functions', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Group', emails: []});

        expect(result).toEqual({ flag: false ,cause: "You are not member of this group"});
    });
    test('should return true in case of Simple or default authentication', async () => {
        req.cookies.accessToken = user1AccessToken;
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Simple'});

        expect(result).toEqual({ flag: true});

        const result2 = verifyAuth(req,res,{ authType: ''});

        expect(result2).toEqual({ flag: true});
    });


    test('should return false in case of a General Error ', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
          const err =new Error();
          err.name = "GeneralError";
          throw err;
        });
        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = ' ';
        const result = verifyAuth(req,res);

        expect(result).toEqual({ flag: false, cause: "GeneralError" });
    });
    test('should return false in case of a General Error happens twice', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
          const err =new Error();
          err.name = "TokenExpiredError";
          throw err;
        }).mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredAndAgainGeneralError";
            throw err;
        });
        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = ' ';
        const result = verifyAuth(req,res);

        expect(result).toEqual({ flag: false, cause: "TokenExpiredAndAgainGeneralError" });
    });
    test('should return false in case of TokenExpiredError happens twice ', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
          const err =new Error();
          err.name = "TokenExpiredError";
          throw err;
        }).mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
          });
        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = ' ';
        const result = verifyAuth(req,res);

        expect(result).toEqual({ flag: false, cause: "Perform login again" });
    });


    test('should return false in case of accessToken expired and at least one of the refreshToken properties is missing', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
          });
          const tempRefreshToken = jwt.sign(
          {
            username: 'adminuser',
            email: 'adminuser@example.com',
            role: '',
          },
          process.env.ACCESS_KEY,
          { expiresIn: '88d' }
        );

      req.cookies.accessToken = ' ';
      req.cookies.refreshToken = tempRefreshToken;
      const result = verifyAuth(req,res);

      expect(result).toEqual({ flag: false, cause: "Token is missing information" });
    });
    test('in case of accessToken expired but refreshToken is ok, should return true if a user try to verify him/herself', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        req.params.username = 'user1';
      const result = verifyAuth(req, res, { authType: 'User', username: 'user1' });

        expect(result).toEqual({ flag: true });
    });
    test('in case of accessToken expired but refreshToken is ok, should return false if a user try to access other users\'s data', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        req.params.username = 'user2';
        const result = verifyAuth(req,res,{ authType: 'User'});

        expect(result).toEqual({ flag: false, cause: "You are not authorized to access this user's data" });
    });
    test('in case of accessToken expired but refreshToken is ok, should return true if an admin try to verify', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = adminRefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: true });
    });
    test('in case of accessToken expired but refreshToken is ok, should return false if a non-admin user try to verify', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Admin'});

        expect(result).toEqual({ flag: false, cause:"You are not an admin" });
    });
    test('in case of accessToken expired but refreshToken is ok, should return true if a member of the group try to reach group specific functions', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Group', emails: ['user1@example.com']});

        expect(result).toEqual({ flag: true });
    });
    test('in case of accessToken expired but refreshToken is ok, sshould return false if a user non-included in the group try to reach group specific functions', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Group', emails: []});

        expect(result).toEqual({ flag: false, cause:"You are not member of this group" });
    });
    test('in case of accessToken expired but refreshToken is ok, should return true  in case of Simple or default authentication', async () => {
        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });

        req.cookies.accessToken = ' ';
        req.cookies.refreshToken = user1RefreshToken;
        const result = verifyAuth(req,res,{ authType: 'Simple'});
        expect(result).toEqual({ flag: true });

        jest.spyOn(jwt,'verify').mockImplementationOnce(() => {
            const err =new Error();
            err.name = "TokenExpiredError";
            throw err;
        });
        const result2 = verifyAuth(req,res,{ authType: ''});
        expect(result2).toEqual({ flag: true });
    });

});
  





























  