const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const Haikunator = require('haikunator');

const s3 = new AWS.S3();
const haikunator = new Haikunator();

module.exports.handler = (event, context, callback) => {
  console.log(event);
  const args = JSON.parse(event.body); console.log(args);
  const imageId = haikunator.haikunate(); console.log(imageId);
  return fetch(args.imageUrl) // Download image from Url
    .then((res) => {
      console.log(`Fetched image from ${args.imageUrl}`);
      if (res.ok) {
        return res;
      }
      return Promise.reject(new Error(
            `Failed to fetch ${res.url}: ${res.status} ${res.statusText}`));
    })
    .then(res => res.buffer())
    .then((buffer) => { // Upload image
      const bucketName = process.env.IMAGES_BUCKET_NAME;
      console.log(`Uploading object to s3 bucket ${bucketName}`);
      return s3.putObject({
        Bucket: bucketName,
        Key: `originals/${imageId}.png`,
        Body: buffer,
        ACL: 'public-read',
      }).promise()
        .catch(err => console.log(err.message));
    })
    .then((res) => { // Success response
      console.log(res);
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          id: imageId,
        }),
      };
      callback(null, response);
    })
    .catch((err) => { // Error response
      const response = {
        statusCode: 500,
        error: err.message,
      };
      callback(null, response);
    });
};
