const AWS = require('aws-sdk-mock');
const LambdaTester = require('lambda-tester');
const handler = require('../../functions/viewImage').handler;

describe('viewImage', () => {
  beforeEach(() => {
    AWS.mock('DynamoDB.DocumentClient', 'get', (params, callback) => {
      callback(null, {
        Item: {
          id: 'test-item-0000',
          facialAnalysis: {},
          sceneAnalysis: {},
          timestamp: 1493964150207,
        },
      });
    });
  });
  afterEach(() => AWS.restore('DynamoDB.DocumentClient'));

  describe('success cases', () => {
    test('returns result', () => LambdaTester(handler)
      .event({
        pathParameters: {
          id: 'lucky-fire-4427',
        },
      })
      .expectResult(data => expect(data).toMatchSnapshot()),
    );
  });
});
