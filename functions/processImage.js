const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const gm = require('gm').subClass({ imageMagick: true });

const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  console.log('Triggered by DB event');
  const { facialAnalysis, id } = event.Records[0].dynamodb.NewImage;
  const fileName = id.S;
  const s3SourceKey = `${process.env.ORIGINAL_FOLDER_NAME}/${fileName}`;
  const s3DestinationKey = `${process.env.PROCESSED_FOLDER_NAME}/${fileName}`;

  console.log(`Downloading source image from ${s3SourceKey}`);
  console.log(JSON.stringify(facialAnalysis));

  const params = { // Download image from S3
    Bucket: process.env.IMAGES_BUCKET_NAME,
    Key: s3SourceKey,
  };
  console.log(params);
  return s3.getObject(params).promise()
    .catch(err => console.log(err.message))
    .then((data) => { // Write buffer
      console.log(data);
      const buffer = data.Body;
      return cropFace(buffer, facialAnalysis);
    })
    .then((outputBuffer) => { // Save new processed image to S3
      console.log(`Uploading processed file to ${s3DestinationKey}`);
      return s3.putObject({
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Key: s3DestinationKey,
        Body: outputBuffer,
        ACL: 'public-read',
      }).promise()
        .catch(err => console.log(err.message));
    })
    .then((res) => {
      console.log(res);
      callback(null, { success: true });
    });
};

// Image processing helper functions

// Crop a face, if any
const cropFace = (buffer, facialAnalysis) => {
  return sizeImage(buffer)
    .then((image) => {
      console.log(image);
      const face = _.get(facialAnalysis, 'M.FaceDetails.L[0].M.BoundingBox.M', false);
      console.log(face);

      const faceWidth = face.Width.N * image.width;
      const faceHeight = face.Height.N * image.height;
      const faceX = face.Left.N * image.width;
      const faceY = face.Top.N * image.height;

      // If there is a face in the image, return a crop of the face.
      return (face ? cropImage(buffer, faceWidth, faceHeight, faceX, faceY) : buffer);
    })
}

// Get width and height of an image
const sizeImage = (buffer) => {
  console.log('sizeImage');
  return new Promise((resolve, reject) => {
    gm(buffer)
      .size((err, dimensions) => {
        if (err) {
          reject(err);
        } else {
          resolve(dimensions);
        }
      })
  })
};

// Crops an image starting from a given x and y coordinate
const cropImage = (buffer, width, height, x, y) => {
  console.log(`cropImage ${width} ${height} ${x} ${y}`);
  return new Promise((resolve, reject) => {
    gm(buffer)
      .crop(width, height, x, y)
      .toBuffer((err, buf) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf);
        }
      });
  });
}
