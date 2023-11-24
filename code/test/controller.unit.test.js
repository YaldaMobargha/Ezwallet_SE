import { createCategory,updateCategory,getTransactionsByUser,getAllTransactions,createTransaction,getCategories,deleteCategory,
  getTransactionsByUserByCategory,getTransactionsByGroup,getTransactionsByGroupByCategory,deleteTransaction,deleteTransactions } from '../controllers/controller';
import { verifyAuth,handleAmountFilterParams,handleDateFilterParams } from '../controllers/utils';
import { categories, transactions } from '../models/model';
import { User,Group } from '../models/User';


jest.mock('../models/User', () => ({
  Group: {
      findOne: jest.fn(),
  },
  User: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
}));  
jest.mock('../controllers/utils', () => ({
  handleDateFilterParams: jest.fn(),
  handleAmountFilterParams: jest.fn(),
  verifyAuth: jest.fn(),
}));
jest.mock('../models/model', () => ({
  categories: {
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
  transactions: {
    aggregate: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));




describe('createCategory', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {
        type: 'Test Type',
        color: 'Test Color',
      },
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 if user is not an admin', async () => {
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'You are not an admin' });

    await createCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'You are not an admin',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 400 if request body is incomplete', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    req.body = {};

    await createCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Request\'s body is incomplete: it should contain non-empty `type` and `color`',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 400 if category of the same type already exists', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    categories.findOne.mockResolvedValueOnce({ type: 'Test Type', color: 'Existing Color' });

    await createCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.body.type });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'A category of this type already exists',
      refreshedTokenMessage: undefined
    });
  });

  test('creates a new category and returns it in the response', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    categories.findOne.mockResolvedValueOnce(null);
    categories.create.mockResolvedValueOnce({
      type: 'Test Type',
      color: 'Test Color',
    });

    await createCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.body.type });
    expect(categories.create).toHaveBeenCalledWith({
      type: req.body.type,
      color: req.body.color,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        type: 'Test Type',
        color: 'Test Color',
      },
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 500 if an error occurs', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    categories.findOne.mockRejectedValueOnce(new Error('server error'));

    await createCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.body.type });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'server error' });
  });
});


describe('updateCategory', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {
        type: 'new-type',
        color: 'new-color',
      },
      params: {
        type: 'old-type',
      },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Refreshed token',
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should update the category successfully', async () => {
    const foundCategory = {
      type: 'old-type',
      color: 'old-color',
      save: jest.fn(),
    };

    verifyAuth.mockReturnValueOnce({ flag: true });
    categories.findOne.mockResolvedValueOnce(foundCategory);
    transactions.updateMany.mockResolvedValueOnce({ modifiedCount: 3 });

    await updateCategory(req, res);

    expect(categories.findOne).toHaveBeenCalledWith(expect.objectContaining({ type: 'old-type' }));

    expect(transactions.updateMany).toHaveBeenCalledWith(
      { type: 'old-type' },
      { $set: { type: 'new-type' } }
    );
    expect(foundCategory.color).toBe('new-color');
    expect(foundCategory.type).toBe('new-type');
    expect(foundCategory.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        message: 'Category updated successfully',
        count: 3,
      },
      refreshedTokenMessage: 'Refreshed token',
    });
  });

  test('should return an error if the user is not an admin', async () => {
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'Unauthorized' });
   
    await updateCategory(req, res);

     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      refreshedTokenMessage: 'Refreshed token',
    });
  });

  test('should return an error if the request body is incomplete', async () => {
    req.body = {};

    verifyAuth.mockReturnValueOnce({ flag: true });
    
    await updateCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: it should contain non-empty `type` and `color`",
      refreshedTokenMessage: 'Refreshed token',
    });
  });

  test('should return an error if the requested category does not exist', async () => {
    categories.findOne.mockResolvedValueOnce(null);
    verifyAuth.mockReturnValueOnce({ flag: true });  

    await updateCategory(req, res);

    expect(categories.findOne).toHaveBeenCalledWith({ type: 'old-type' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested category doesn't exists",
      refreshedTokenMessage: 'Refreshed token',
    });
  });

  test('should return an error if the new category type already exists', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    
    const mockFindOne = jest.fn();
    mockFindOne
      .mockResolvedValueOnce({ type: 'old-type' })
      .mockResolvedValueOnce({ type: 'new-type' });
    const originalFindOne = categories.findOne;
    categories.findOne = mockFindOne;

    await updateCategory(req, res);

    expect(categories.findOne).toHaveBeenCalledWith({ type: 'old-type' });
    expect(categories.findOne).toHaveBeenCalledWith({ type: 'new-type' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'The new category type already belongs to another category',
      refreshedTokenMessage: 'Refreshed token',
    });
    categories.findOne = originalFindOne;
  });

  test('should return an error if an exception is thrown', async () => {
    
    const errorMessage = 'Something went wrong';
    verifyAuth.mockReturnValueOnce({ flag: true });
    const mockFindOne = jest.spyOn(categories, 'findOne').mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const originalFindOne = categories.findOne;
  
    await updateCategory(req, res);
  
    expect(mockFindOne).toHaveBeenCalledWith({ type: 'old-type' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: errorMessage });

    jest.spyOn(categories, 'findOne').mockRestore();//++
    categories.findOne = originalFindOne;
  });
});


describe('deleteCategory', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {types: 'type',},
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 status if user is not an admin', async () => {
    const verifyAuth = jest.fn().mockReturnValueOnce({ flag: false, cause: 'Unauthorized' });
    const originalVerifyAuth = require('../controllers/utils').verifyAuth; 
    require('../controllers/utils').verifyAuth = verifyAuth;

    await deleteCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });

    require('../controllers/utils').verifyAuth = originalVerifyAuth;
  });

  test('should return 400 status if request body is incomplete', async () => {
    req.body = {}; 
    verifyAuth.mockReturnValueOnce({ flag: true });

    await deleteCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: it should contain a non-empty array `types`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return 400 status if there is only one category in the database', async () => {
    const countDocumentsMock = jest.fn().mockResolvedValue(1);
    categories.countDocuments = countDocumentsMock;
    verifyAuth.mockReturnValueOnce({ flag: true });

    req.body.types = ['type1', 'type2']; 

    await deleteCategory(req, res);

    expect(categories.countDocuments).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'There is only one category in the database and it cannot be deleted',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if any element of "types" array is an empty string', async () => {
    const req = {
      body: {
        types: ['type1', '', 'type2'],
      },
    };

    verifyAuth.mockReturnValueOnce({ flag: true });
    await deleteCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: every element of `types` should not be an empty string",
      refreshedTokenMessage: res.locals.refreshedTokenMessage, 
    });
  });


  test('should return 400 status if a category to be deleted does not exist', async () => {
    const countDocumentsMock = jest.fn().mockResolvedValue(2); 
    categories.countDocuments = countDocumentsMock;
    verifyAuth.mockReturnValueOnce({ flag: true });

    const findOneMock = jest.fn().mockResolvedValue(null);
    categories.findOne = findOneMock;

    req.body.types = ['type1', 'type2']; 

    await deleteCategory(req, res);

    expect(categories.countDocuments).toHaveBeenCalled();
    expect(categories.findOne).toHaveBeenCalledWith({ type: 'type1' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'The category of type type1 doesn\'t exist',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return 400 status if a category to be deleted does not exist', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });

    categories.findOne.mockRejectedValueOnce(new Error('server error'));    
    req.body.types = ['type1', 'type2']; 

    await deleteCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

  });
});


describe('getCategories', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 status if user is not authorized', async () => {
    const verifyAuth = jest.fn().mockReturnValue({ flag: false, cause: 'Unauthorized' });
    const originalVerifyAuth = require('../controllers/utils').verifyAuth;
    require('../controllers/utils').verifyAuth = verifyAuth;

    await getCategories(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Simple' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });

    require('../controllers/utils').verifyAuth = originalVerifyAuth;
  });

  test('should return all categories with status 200', async () => {
    const mockCategories = [
      { type: 'type1', color: 'color1' },
      { type: 'type2', color: 'color2' },
    ];
    const findMock = jest.fn().mockResolvedValue(mockCategories);
    categories.find = findMock;
    verifyAuth.mockReturnValueOnce({ flag: true });

    await getCategories(req, res);

    expect(categories.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: mockCategories.map((el) => ({ type: el.type, color: el.color })),
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

});


describe('createTransaction', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: {
        username: 'testuser',
      },
      body: {
        username: 'testuser',
        amount: 100,
        type: 'category1',
      },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 status if user is not authorized', async () => {
    const verifyAuth = jest.fn().mockReturnValue({ flag: false, cause: 'Unauthorized' });
    const originalVerifyAuth = require('../controllers/utils').verifyAuth;
    require('../controllers/utils').verifyAuth = verifyAuth;

    await createTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testuser' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });

    require('../controllers/utils').verifyAuth = originalVerifyAuth;
  });

  test('should return 400 status if request body is incomplete', async () => {
    req.body = {}; 
    verifyAuth.mockReturnValueOnce({ flag: true });

    await createTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: it should contain non-empty `username` and `type`, while `amount` should be an integer or float",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return 400 status if username in URL and request body do not match', async () => {
    req.body.username = 'differentuser';
    verifyAuth.mockReturnValueOnce({ flag: true });

    await createTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user in the body doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return 400 status if requested user does not exist', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    User.findOne = jest.fn().mockResolvedValue(null);

    await createTransaction(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user in the body doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return 400 status if requested category type does not exist', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    User.findOne = jest.fn().mockResolvedValue({ username: 'testuser' });
    categories.findOne = jest.fn().mockResolvedValue(null);
    
    await createTransaction(req, res);

    expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested category type doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should create a new transaction and return it with status 200', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    const mockUser = { username: 'testuser' };
    const mockCategory = { type: 'category1' };
    const mockTransaction = {
      username: 'testuser',
      type: 'category1',
      amount: 100,
      date: new Date(),
    };

    User.findOne = jest.fn().mockResolvedValue(mockUser);
    categories.findOne = jest.fn().mockResolvedValue(mockCategory);
    transactions.create = jest.fn().mockResolvedValue(mockTransaction);
    
    await createTransaction(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
    expect(transactions.create).toHaveBeenCalledWith({
      username: 'testuser',
      type: 'category1',
      amount: 100,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        username: 'testuser',
        type: 'category1',
        amount: 100,
        date: mockTransaction.date,
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return a 500 response', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    User.findOne.mockRejectedValueOnce(new Error('server error'));    

    await createTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});


describe('getAllTransactions', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 status if user is not an admin', async () => {
    const verifyAuth = jest.fn().mockReturnValue({ flag: false, cause: 'Unauthorized' });
    const originalVerifyAuth = require('../controllers/utils').verifyAuth; 
    require('../controllers/utils').verifyAuth = verifyAuth;

    await getAllTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });

    require('../controllers/utils').verifyAuth = originalVerifyAuth;
  });

  test('should return all transactions with category information with status 200', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });
    const mockTransactions = [
      {
        username: 'user1',
        amount: 100,
        type: 'category1',
        date: new Date(),
        categories_info: {
          color: 'red',
        },
      },
      {
        username: 'user2',
        amount: 200,
        type: 'category2',
        date: new Date(),
        categories_info: {
          color: 'blue',
        },
      },
    ];

    transactions.aggregate = jest.fn().mockResolvedValue(mockTransactions);

    await getAllTransactions(req, res);

    expect(transactions.aggregate).toHaveBeenCalledWith([
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          username: 'user1',
          amount: 100,
          type: 'category1',
          date: mockTransactions[0].date,
          color: 'red',
        },
        {
          username: 'user2',
          amount: 200,
          type: 'category2',
          date: mockTransactions[1].date,
          color: 'blue',
        },
      ],
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return a 500 response', async () => {
    verifyAuth.mockReturnValueOnce({ flag: true });

    transactions.aggregate.mockImplementationOnce(()=>{
      throw new Error('server error');
    });    

    await getAllTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  
  });
});


describe('getTransactionsByUser', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      url: '/users/testuser/transactions',
      params: {
        username: 'testuser',
      },
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {refreshedTokenMessage: 'refreshed-token-message'},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return an error if the user is not authorized', async () => {
    // Mock the verifyAuth function to return authentication failure
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'You are not flag to access this user\'s data' });

    await getTransactionsByUser(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: 'testuser',
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'You are not flag to access this user\'s data',
      refreshedTokenMessage: 'refreshed-token-message',
    });
  });

  test('should return an error if the requested user does not exist', async () => {
    //test admin endpoint
    req.url = '/transactions/users/testuser'
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return null
    User.findOne.mockResolvedValueOnce(null);

    await getTransactionsByUser(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'Admin',
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user doesn't exist",
      refreshedTokenMessage: 'refreshed-token-message',
    });
  });

  test('should return an empty array if no transactions are found for the user', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return a user
    User.findOne.mockResolvedValueOnce({ username: 'testuser' });

    // Mock the transactions.aggregate function to return an empty array
    transactions.aggregate.mockResolvedValueOnce([]);

    await getTransactionsByUser(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: 'testuser',
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    expect(transactions.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      refreshedTokenMessage: 'refreshed-token-message',
    });
  });

  test('should return filtered transactions if query parameters are provided for a regular user', async () => {
    //setting url parameters to filter results
    req.url = '/users/testuser/transactions?from=2022-01-01&max=100'
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return a user
    User.findOne.mockResolvedValueOnce({ username: 'testuser' });

    // Mock the handleDateFilterParams and handleAmountFilterParams functions to return query filters
    handleDateFilterParams.mockReturnValueOnce({ date: { $gte: new Date('2022-01-01') } });
    handleAmountFilterParams.mockReturnValueOnce({ amount: { $lte: 100 } });

    // Mock the transactions.aggregate function to return filtered transactions
    transactions.aggregate.mockResolvedValueOnce([
      {
        username: 'testuser',
        amount: 50,
        type: 'expense',
        categories_info: { color: 'red' },
        date: new Date('2022-05-01'),
      },
      {
        username: 'testuser',
        amount: 80,
        type: 'income',
        categories_info: { color: 'green' },
        date: new Date('2022-03-15'),
      },
    ]);

    await getTransactionsByUser(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: 'testuser',
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    expect(handleDateFilterParams).toHaveBeenCalledWith(req);
    expect(handleAmountFilterParams).toHaveBeenCalledWith(req);
    expect(transactions.aggregate).toHaveBeenCalledWith([
      { $match: { username: 'testuser', date: { $gte: new Date('2022-01-01') }, amount: { $lte: 100 } } },
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          username: 'testuser',
          amount: 50,
          type: 'expense',
          color: 'red',
          date: new Date('2022-05-01'),
        },
        {
          username: 'testuser',
          amount: 80,
          type: 'income',
          color: 'green',
          date: new Date('2022-03-15'),
        },
      ],
      refreshedTokenMessage: 'refreshed-token-message',
    });
  });

  test('should handle errors and return a 500 status', async () => {
    // Mock the verifyAuth function to throw an error
    verifyAuth.mockImplementationOnce(() => {
      throw new Error('Authentication error');
    });

    await getTransactionsByUser(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: 'testuser',
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication error' });
  });

});


describe('getTransactionsByUserByCategory', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      url: '/users/testUser/transactions/category/testCategory',
      params: {
        username: 'testUser',
        category: 'testCategory',
      },
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 if regular user tries to access another user\'s transactions', async () => {
    const verifyAuthResponse = {
      flag: false,
      cause: 'You are not flag to access this user\'s data',
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testUser' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'You are not flag to access this user\'s data',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 401 if admin tries to access transactions without authorization', async () => {
    req = {
        url: '/transactions/users/testUser/category/testCategory',
        params: {
          username: 'testUser',
          category: 'testCategory',
        },
    };
    const verifyAuthResponse = {
      flag: false,
      cause: 'You are not an admin',
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'You are not an admin',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 400 if requested user does not exist', async () => {
    const verifyAuthResponse = {
      flag: true,
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);
    User.findOne.mockResolvedValueOnce(null);

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testUser' });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'The requested user doesn\'t exist',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 400 if requested category does not exist', async () => {
    const verifyAuthResponse = {
      flag: true,
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);
    User.findOne.mockResolvedValueOnce({});
    categories.findOne.mockResolvedValueOnce(null);

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testUser' });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'The requested category doesn\'t exist',
      refreshedTokenMessage: undefined,
    });
  });

  test('returns transactions for the requested user and category', async () => {
    const verifyAuthResponse = {
      flag: true,
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);
    User.findOne.mockResolvedValueOnce({});
    categories.findOne.mockResolvedValueOnce({});
    const aggregateResult = [
      {
        username: 'testUser',
        amount: 10,
        type: 'testCategory',
        categories_info: {
          color: '#121212',
        },
        date: '2023-01-01',
      },
      {
        username: 'testUser',
        amount: 20,
        type: 'testCategory',
        categories_info: {
          color: '#888888',
        },
        date: '2023-01-02',
      },
    ];
    transactions.aggregate.mockResolvedValueOnce(aggregateResult);

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testUser' });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(transactions.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          username: req.params.username ,
          type: req.params.category ,
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          username: 'testUser',
          amount: 10,
          type: 'testCategory',
          color: '#121212',
          date: '2023-01-01',
        },
        {
          username: 'testUser',
          amount: 20,
          type: 'testCategory',
          color: '#888888',
          date: '2023-01-02',
        },
      ],
      refreshedTokenMessage: undefined,
    });
  });

  test('returns 500 if an error occurs during the process', async () => {
    const verifyAuthResponse = {
      flag: true,
    };
    verifyAuth.mockReturnValueOnce(verifyAuthResponse);
    User.findOne.mockResolvedValueOnce({});
    categories.findOne.mockResolvedValueOnce({});
    transactions.aggregate.mockReturnValueOnce(new Error('error'));

    await getTransactionsByUserByCategory(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'User', username: 'testUser' });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(transactions.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          username: 'testUser',
          type: 'testCategory',
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: '_model.transactions.aggregate(...).then is not a function' });
  });
});


describe("getTransactionsByGroup", () => {
  let req, res;

  beforeEach(() => {
    req = {
        url: "/groups/example-group/transactions",
        params: {
          name: "example-group",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return an error if the requested group doesn't exist", async () => {
    Group.findOne.mockResolvedValueOnce(null);

    await getTransactionsByGroup(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
    });
  });

  test("should return an error if authorization check fails", async () => {
    req = {
        url: "/transactions/groups/example-group",
        params: {
          name: "example-group",
      },
    };
    const targetGroup = {
      name: "example-group",
      members: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
    };
    const verifyAuthResult = {
      flag: false,
      cause: "You are not member of this group",
    };

    Group.findOne.mockResolvedValueOnce(targetGroup);
    verifyAuth.mockReturnValueOnce(verifyAuthResult);

    await getTransactionsByGroup(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: "Admin",
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "You are not member of this group",
      refreshedTokenMessage: undefined,
    });
  });

  test("should return transactions data for the requested group", async () => {
    const verifyAuthResult = {
      flag: true,
    };
    const targetGroup = {
        name: "example-group",
        members: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
    };
    const users = [
      { username: "user1" },
      { username: "user2" },
    ];
    const usernamesList = ["user1", "user2"];
    const transactionsResult = [
      {
        username: "user1",
        amount: 10,
        type: "category1",
        categories_info: { color: "#121212" },
        date: "2023-05-29",
      },
      {
        username: "user2",
        amount: 20,
        type: "category2",
        categories_info: { color: "#888888" },
        date: "2023-05-30",
      },
    ];

    Group.findOne.mockResolvedValueOnce(targetGroup);
    verifyAuth.mockReturnValueOnce(verifyAuthResult);
    User.find.mockResolvedValueOnce(users);
    transactions.aggregate.mockResolvedValueOnce(transactionsResult);

    await getTransactionsByGroup(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: "Group",
      emails: ["user1@example.com", "user2@example.com"],
    });
    expect(User.find).toHaveBeenCalledWith({ email: { $in: ["user1@example.com", "user2@example.com"] } });
    expect(transactions.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          username: { $in: ["user1", "user2"] },
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
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          username: "user1",
          amount: 10,
          type: "category1",
          color: "#121212",
          date: "2023-05-29",
        },
        {
          username: "user2",
          amount: 20,
          type: "category2",
          color: "#888888",
          date: "2023-05-30",
        },
      ],
      refreshedTokenMessage: undefined,
    });
  });

  test("should handle errors and return a 500 response", async () => {
    const targetGroup = {
      name: "example-group",
      members: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
    };

    Group.findOne.mockResolvedValueOnce(targetGroup);
    verifyAuth.mockImplementation(() => {
      throw new Error("Verification failed");
    });

    await getTransactionsByGroup(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: "example-group" });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: "Group",
      emails: ["user1@example.com", "user2@example.com"],
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Verification failed" });
  });
});


describe('getTransactionsByGroupByCategory', () => {
  let req, res;
  beforeEach(() => {
    // Mock the request and response objects
    req = {
        url: '/groups/test-group/transactions/category/test-category',
        params: {
        name: 'test-group',
        category: 'test-category',
        },
    };
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
        refreshedTokenMessage: 'refreshed-token-message', // Update with the expected value if needed
        },
    };  
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  test('should return an error if the requested group does not exist', async () => {
    // Mock the Group.findOne function to return null (group not found)
    Group.findOne.mockResolvedValueOnce(null);

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested group doesn't exist",
    });
  });

  test('should return an error if authentication fails', async () => {
    req = {
        url: '/transactions/groups/test-group/category/test-category',
        params: {
        name: 'test-group',
        category: 'test-category',
        },
    };
    // Mock the Group.findOne function to return a valid group
    Group.findOne.mockResolvedValueOnce({ name: req.params.name, members: [] });

    // Mock the verifyAuth function to return authentication failure
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'Authentication failed' });

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'Admin'
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the requested category does not exist', async () => {
    // Mock the Group.findOne function to return a valid group
    Group.findOne.mockResolvedValueOnce({ name: req.params.name, members: [] });

    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the categories.findOne function to return null (category not found)
    categories.findOne.mockResolvedValueOnce(null);

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'Group',
      emails: [],
    });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested category doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an empty array if there are no transactions for the group with the specified category', async () => {
    // Mock the Group.findOne function to return a valid group
    Group.findOne.mockResolvedValueOnce({ name: req.params.name, members: [] });

    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the categories.findOne function to return a valid category
    categories.findOne.mockResolvedValueOnce({ type: req.params.category });

    // Mock the User.find function to return an empty array of users
    User.find.mockResolvedValueOnce([]);

    // Mock the transactions.aggregate function to return an empty array
    transactions.aggregate.mockResolvedValueOnce([]);

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'Group',
      emails: [],
    });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(User.find).toHaveBeenCalledWith({ email: { $in: [] } });
    expect(transactions.aggregate).toHaveBeenCalledWith([
      { $match: { username: { $in: [] }, type: req.params.category } },
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return the transactions made by the group with the specified category', async () => {
    const targetGroup = {
        name: "test-group",
        members: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
    };
    const users = [
      { username: "user1" },
      { username: "user2" },
    ];
    // Mock the Group.findOne function to return a valid group
    Group.findOne.mockResolvedValueOnce(targetGroup);

    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the categories.findOne function to return a valid category
    categories.findOne.mockResolvedValueOnce({ type: 'test-category' });

    // Mock the User.find function to return an array of users
    User.find.mockResolvedValueOnce(users);

    // Mock the transactions.aggregate function to return the expected result
    const aggregateResult = [
      {
        username: 'user1',
        amount: 10,
        type: 'test-category',
        categories_info: { color: '#121212' },
        date: '2023-05-30',
      },
      {
        username: 'user2',
        amount: 20,
        type: 'test-category',
        categories_info: { color: '#888888' },
        date: '2023-05-31',
      },
    ];
    transactions.aggregate.mockResolvedValueOnce(aggregateResult);

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'Group',
      emails: ["user1@example.com", "user2@example.com"],
    });
    expect(categories.findOne).toHaveBeenCalledWith({ type: req.params.category });
    expect(User.find).toHaveBeenCalledWith({ email: { $in:  ["user1@example.com", "user2@example.com"] } });
    expect(transactions.aggregate).toHaveBeenCalledWith([
      { $match: { username: { $in: ['user1', 'user2'] }, type: req.params.category } },
      {
        $lookup: {
          from: 'categories',
          localField: 'type',
          foreignField: 'type',
          as: 'categories_info',
        },
      },
      { $unwind: '$categories_info' },
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          username: 'user1',
          amount: 10,
          type: 'test-category',
          color: '#121212',
          date: '2023-05-30',
        },
        {
          username: 'user2',
          amount: 20,
          type: 'test-category',
          color: '#888888',
          date: '2023-05-31',
        },
      ],
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should handle unexpected errors and return a 500 status code', async () => {
    // Mock the Group.findOne function to throw an error
    Group.findOne.mockRejectedValueOnce(new Error('Database error'));

    await getTransactionsByGroupByCategory(req, res);

    expect(Group.findOne).toHaveBeenCalledWith({ name: req.params.name });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
  });
});


describe('deleteTransaction', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      params: { username: 'test-user' },
      body: { _id: 'test-transaction-id' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: { refreshedTokenMessage: 'refreshed-token-message' },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return an error if the user is not authorized', async () => {
    // Mock the verifyAuth function to return authentication failure
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'Authorization failed' });

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authorization failed',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the request body is incomplete', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Set an empty _id in the request body
    req.body._id = '';

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: it should contain a non-empty `_id`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the user does not exist', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return null (user not found)
    User.findOne.mockResolvedValueOnce(null);

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested user doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the transaction does not exist', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return a valid user
    User.findOne.mockResolvedValueOnce({ username: req.params.username});

    // Mock the transactions.findById function to return null (transaction not found)
    transactions.findById.mockResolvedValueOnce(null);

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(transactions.findById).toHaveBeenCalledWith(req.body._id);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested transaction doesn't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the transaction does not belong to the user', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return a valid user
    User.findOne.mockResolvedValueOnce({ username: req.params.username });

    // Mock the transactions.findById function to return a transaction belonging to a different user
    transactions.findById.mockResolvedValueOnce({ username: 'other-user' });

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(transactions.findById).toHaveBeenCalledWith(req.body._id);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The requested transaction doesn't belong to you",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should delete the transaction and return a success message', async () => {
    const findByIdResult = {
        _id: '16318',
        username: 'test-user',
        amount: 10,
        type: 'testCategory',
        date: '2023-01-01',
      };
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the User.findOne function to return a valid user
    User.findOne.mockResolvedValueOnce({ username: req.params.username });

    transactions.findById.mockResolvedValueOnce(findByIdResult);
    // Mock the transactions.findByIdAndDelete function
    transactions.findByIdAndDelete.mockResolvedValueOnce();

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(User.findOne).toHaveBeenCalledWith({ username: req.params.username });
    expect(transactions.findById).toHaveBeenCalledWith(req.body._id);
    expect(transactions.findByIdAndDelete).toHaveBeenCalledWith(req.body._id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        message: 'Transaction deleted',
      },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should handle unexpected errors and return a 500 status code', async () => {
    // Mock the verifyAuth function to throw an error
    verifyAuth.mockImplementationOnce(() => {
      throw new Error('Authentication error');
    });

    await deleteTransaction(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, {
      authType: 'User',
      username: req.params.username,
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication error' });
  });
});


describe('deleteTransactions', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: { _ids: ['test-transaction-id-1', 'test-transaction-id-2'] },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: { refreshedTokenMessage: 'refreshed-token-message' },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return an error if the user is not authorized', async () => {
    // Mock the verifyAuth function to return authentication failure
    verifyAuth.mockReturnValueOnce({ flag: false, cause: 'Authorization failed' });

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authorization failed',
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if the request body is incomplete', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Set an empty _ids array in the request body
    req.body._ids = [];

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: it should contain a non-empty array `_ids`",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should return an error if at least one _id is blank inside request body', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    req.body._ids = ['test-transaction-id-1', 'test-transaction-id-2',''];

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Request's body is incomplete: every element of `_ids` should not be an empty string",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });


  test('should return an error if at least one of the transactions does not exist', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the transactions.find function to return only one transaction
    transactions.find.mockResolvedValueOnce([{ _id: 'test-transaction-id-1' }]);

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(transactions.find).toHaveBeenCalledWith({
      _id: { $in: ['test-transaction-id-1', 'test-transaction-id-2'] },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "One or more of the requested transactions don't exist",
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should delete all requested transactions and return a success message', async () => {
    // Mock the verifyAuth function to return authentication success
    verifyAuth.mockReturnValueOnce({ flag: true });

    // Mock the transactions.find function to return both transactions
    transactions.find.mockResolvedValueOnce([
      { _id: 'test-transaction-id-1' },
      { _id: 'test-transaction-id-2' },
    ]);

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(transactions.find).toHaveBeenCalledWith({
      _id: { $in: ['test-transaction-id-1', 'test-transaction-id-2'] },
    });
    expect(transactions.deleteMany).toHaveBeenCalledWith({
      _id: { $in: ['test-transaction-id-1', 'test-transaction-id-2'] },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { message: 'Transactions deleted' },
      refreshedTokenMessage: res.locals.refreshedTokenMessage,
    });
  });

  test('should handle unexpected errors and return a 500 status code', async () => {
    // Mock the verifyAuth function to throw an error
    verifyAuth.mockImplementationOnce(() => {
      throw new Error('Authentication error');
    });

    await deleteTransactions(req, res);

    expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication error' });
  });
});
