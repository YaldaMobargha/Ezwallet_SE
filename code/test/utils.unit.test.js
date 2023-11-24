import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from '../controllers/utils';
import jwt from 'jsonwebtoken';

// Mock the jwt.verify function
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
    sign: jest.fn(),
}));

describe('handleDateFilterParams', () => {
    test('returns an empty object when no date parameters are provided', () => {
      const req = { query: {} };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({});
    });

    test('throws an error if `date` parameter has an invalid value', () => {
      const req = { query: { date: '2023-13-40' } };
      expect(() => {
        handleDateFilterParams(req);
      }).toThrow('The query parameter `date` has an invalid value: it must be in the form YYYY-MM-DD');
    });

    test('throws an error if "from" parameter has an invalid value', () => {
      const req = { query: { from: '2023-13-40' } };
      expect(() => {
        handleDateFilterParams(req);
      }).toThrow('The query parameter `from` has an invalid value: it must be in the form YYYY-MM-DD');
    });

    test('throws an error if "upTo" parameter has an invalid value', () => {
      const req = { query: { upTo: '2023-13-40' } };
      expect(() => {
        handleDateFilterParams(req);
      }).toThrow('The query parameter `upTo` has an invalid value: it must be in the form YYYY-MM-DD');
    });
  
    test('throws an error if both "date" and ("from" or "to") parameters are present', () => {
      const req = { query: { date: '2023-05-29', from: '2023-05-28' } };
      expect(() => {
        handleDateFilterParams(req);
      }).toThrow('You cannot specify an exact date and a date range');
    });

    test('returns a mongoose query for exact date filtering', () => {
      const req = { query: { date: '2023-05-29' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
            $gte: new Date("2023-05-29T00:00:00.000Z"),
            $lte: new Date("2023-05-29T23:59:59.999Z")
        }
      });
    });

    test('returns a mongoose query for filtering from a specific date', () => {
      const req = { query: { from: '2023-05-29' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $gte: new Date("2023-05-29T00:00:00.000Z")
        }
      });
    });

    test('returns a mongoose query for filtering up to a specific date', () => {
      const req = { query: { upTo: '2023-05-29' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
          $lte: new Date("2023-05-29T23:59:59.999Z")
        }
      });
    });

    test('throws an error for an invalid date range', () => {
      const req = { query: { from: '2023-05-30', upTo: '2023-05-29' } };
      expect(() => {
        handleDateFilterParams(req);
      }).toThrow('Invalid date range');
    });
  
    test('returns a mongoose query for a valid date range', () => {
      const req = { query: { from: '2023-05-29', upTo: '2023-05-30' } };
      const result = handleDateFilterParams(req);
      expect(result).toEqual({
        date: {
            $gte: new Date("2023-05-29T00:00:00.000Z"),
            $lte: new Date("2023-05-30T23:59:59.999Z")
        }
      });
    });
});



describe('handleAmountFilterParams', () => {
  test('returns an empty object if no amount parameters are passed', () => {
    const req = { query: {} };
    const result = handleAmountFilterParams(req);
    expect(result).toEqual({});
  });

  test('throws an error if "min" parameter is not a number', () => {
    const req = { query: { min: 'abc' } };
    expect(() => handleAmountFilterParams(req)).toThrow(
      'The query parameter `min` has an invalid value: it must be a number'
    );
  });

  test('throws an error if "max" parameter is not a number', () => {
    const req = { query: { max: 'def' } };
    expect(() => handleAmountFilterParams(req)).toThrow(
      'The query parameter `max` has an invalid value: it must be a number'
    );
  });

  test('returns the correct query object for range [min, +infinity]', () => {
    const req = { query: { min: '50' } };
    const result = handleAmountFilterParams(req);
    expect(result).toEqual({ amount: { $gte: 50 } });
  });

  test('returns the correct query object for range [-infinity, max]', () => {
    const req = { query: { max: '100' } };
    const result = handleAmountFilterParams(req);
    expect(result).toEqual({ amount: { $lte: 100 } });
  });

  test('throws an error for an invalid amount range [min, max]', () => {
    const req = { query: { min: '200', max: '100' } };
    expect(() => handleAmountFilterParams(req)).toThrow('Invalid amount range');
  });



  test('returns the correct query object for a valid amount range [min, max]', () => {
    const req = { query: { min: '50', max: '100' } };
    const result = handleAmountFilterParams(req);
    expect(result).toEqual({ amount: { $gte: 50, $lte: 100 } });
  });
});



describe('verifyAuth', () => {
    const req = {
      cookies: {
        accessToken: 'validAccessToken',
        refreshToken: 'validRefreshToken',
      },
      params: {
        username: 'testUser',
      },
    };
    const res = {
      cookie: jest.fn(),
      locals: {},
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    test('returns false if one of the tokens is missing', () => {
      const modifiedReq = { ...req, cookies: { accessToken: 'validAccessToken' } };
      const result = verifyAuth(modifiedReq, res, { authType: 'Simple' });
      expect(result).toEqual({ flag: false, cause: 'One of the tokens is missing' });
    });

    test('returns false if either token is missing information', () => {
      jwt.verify.mockImplementationOnce(() => ({ username: 'testUser', email: 'test@example.com' }));

      const result = verifyAuth(req, res, { authType: 'Simple' });
      expect(result).toEqual({ flag: false, cause: 'Token is missing information' });

      jwt.verify.mockImplementationOnce(() => ({ role: 'Admin', email: 'test@example.com' }));
      const result2 = verifyAuth(req, res, { authType: 'Simple' });
      expect(result2).toEqual({ flag: false, cause: 'Token is missing information' });

    });

    test('returns false if tokens do not match', () => {
      jwt.verify.mockImplementationOnce(() => ({
        //accessToken of user1
        username: 'testUser1',
        email: 'user1@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        //refreshToken of user2
        username: 'testUser2',
        email: 'user2@example.com',
        role: 'User',
      }));
      const result = verifyAuth(req, res, { authType: 'Simple' });
      expect(result).toEqual({ flag: false, cause: 'Mismatched tokens' });
    });

    test('returns false if the username does not match the requested user for authType "User"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'anotherUser',
        email: 'test@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'anotherUser',
        email: 'test@example.com',
        role: 'User',
      }));
  
      const result = verifyAuth(req, res, { authType: 'User', username: 'testUser' });
      expect(result).toEqual({ flag: false, cause: "You are not flag to access this user's data" });
    });

    test('returns true if the username matches the requested user for authType "User"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'testUser',
        email: 'test@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'testUser',
        email: 'test@example.com',
        role: 'User',
      }));
  
      const result = verifyAuth(req, res, { authType: 'User', username: 'testUser' });
      expect(result).toEqual({ flag: true });
    });

    test('returns false if the role is not "Admin" for authType "Admin"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'testUser',
        email: 'test@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'testUser',
        email: 'test@example.com',
        role: 'User',
      }));
  
      const result = verifyAuth(req, res, { authType: 'Admin' });
      expect(result).toEqual({ flag: false, cause: 'You are not an admin' });
    });

    test('returns true if the role is "Admin" for authType "Admin"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'admin',
        email: 'admin@example.com',
        role: 'Admin',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'admin',
        email: 'admin@example.com',
        role: 'Admin',
      }));
  
      const result = verifyAuth(req, res, { authType: 'Admin' });
      expect(result).toEqual({ flag: true });
    });

    test('returns false if the email is not in the requested group for authType "Group"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'familyMember',
        email: 'familyMember@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'familyMember',
        email: 'familyMember@example.com',
        role: 'User',
      }));
  
      const result = verifyAuth(req, res, { authType: 'Group', emails: ['familyCreator@example.com'] });
      expect(result).toEqual({ flag: false, cause: 'You are not member of this group' });
    });

    test('returns true if the email is in the requested group for authType "Group"', () => {
      jwt.verify.mockImplementationOnce(() => ({
        username: 'familyMember',
        email: 'familyMember@example.com',
        role: 'User',
      }));
      jwt.verify.mockImplementationOnce(() => ({
        username: 'familyMember',
        email: 'familyMember@example.com',
        role: 'User',
      }));
  
      const result = verifyAuth(req, res, { authType: 'Group', emails: ['familyCreator@example.com','familyMember@example.com'] });
      expect(result).toEqual({ flag: true });
    });

    test('returns false if access token and refresh token are both expired', () => {
      jwt.verify
        .mockImplementationOnce(() => {
          const err =new Error();
          err.name = "TokenExpiredError";
          throw err;
        })
        .mockImplementationOnce(() => {
          const err =new Error();
          err.name = "TokenExpiredError";
          throw err;
        });
  
      const result = verifyAuth(req, res, { authType: 'Simple' });
      expect(result).toEqual({ flag: false, cause: "Perform login again" });
    });

    test('returns true and refreshes the access token if it has expired but the refresh token is still valid', () => {
      const decodedRefreshToken = {
        username: 'testUser',
        email: 'test@example.com',
        role: 'User',
      };
  
      jwt.verify
        .mockImplementationOnce(() => {
          //when accessToken is missed
          const err =new Error();
          err.name = "TokenExpiredError";
          throw err;
        })
        .mockImplementationOnce(() => decodedRefreshToken);
  
      jwt.sign.mockReturnValueOnce('newAccessToken');
  
      const result = verifyAuth(req, res, { authType: 'Simple' });
      expect(result).toEqual({ flag: true });
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          username: decodedRefreshToken.username,
          email: decodedRefreshToken.email,
          id: decodedRefreshToken.id,
          role: decodedRefreshToken.role,
        },
        process.env.ACCESS_KEY,
        { expiresIn: '1h' }
      );
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'newAccessToken', {
        httpOnly: true,
        path: '/api',
        maxAge: 60 * 60 * 1000,
        sameSite: 'none',
        secure: true,
      });
      expect(res.locals.refreshedTokenMessage).toBe(
        'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls'
      );
    });
});
