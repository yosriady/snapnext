const _ = require('lodash');
const AWS = require('aws-sdk');

const db = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  console.log('Retrieving all images');
  const params = {
    TableName: process.env.IMAGES_TABLE_NAME,
  };
  return db.scan(params).promise()
    .then(({ Items }) => {
      console.log(Items);
      const body = _.map(Items, item => Object({
        id: item.id,
        original: `https://s3.amazonaws.com/${process.env.IMAGES_BUCKET_NAME}/${process.env.ORIGINAL_FOLDER_NAME}/${item.id}.png`,
        processed: `https://s3.amazonaws.com/${process.env.IMAGES_BUCKET_NAME}/${process.env.PROCESSED_FOLDER_NAME}/${item.id}.png`,
        timestamp: item.timestamp,
      }));
      const response = {
        statusCode: 200,
        body: JSON.stringify(body),
      };
      callback(null, response);
    })
    .catch((err) => {
      const response = {
        statusCode: 500,
        error: err.message,
      };
      console.log(err.message);
      callback(null, response);
    });
};
