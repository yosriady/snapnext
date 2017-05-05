const AWS = require('aws-sdk');

const db = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event));
  const imageId = event.pathParameters.id;

  console.log(`Retrieving ${imageId} from dynamoDB`);
  const params = {
    Key: {
      id: imageId,
    },
    TableName: process.env.IMAGES_TABLE_NAME,
  };
  return db.get(params).promise()
    .then(({ Item }) => {
      console.log(Item);
      const body = {
        id: imageId,
        original: `https://s3.amazonaws.com/${process.env.IMAGES_BUCKET_NAME}/${process.env.ORIGINAL_FOLDER_NAME}/${imageId}.png`,
        processed: `https://s3.amazonaws.com/${process.env.IMAGES_BUCKET_NAME}/${process.env.PROCESSED_FOLDER_NAME}/${imageId}.png`,
        timestamp: Item.timestamp,
        analysis: {
          facial: Item.facialAnalysis,
          scene: Item.sceneAnalysis,
        },
      };
      const response = {
        statusCode: 200,
        body: JSON.stringify(body),
      };
      console.log(response);
      callback(null, response);
    });
};
