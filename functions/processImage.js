const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  console.log('Triggered by DB event');
  const { facialAnalysis, sceneAnalysis, id } = event.Records[0].dynamodb.NewImage;
  const fileName = id.S;
  const s3SourceKey = `${process.env.ORIGINAL_FOLDER_NAME}/${fileName}`;
  const s3DestinationKey = `${process.env.PROCESSED_FOLDER_NAME}/${fileName}`;

  console.log(`Downloading source image from ${s3SourceKey}`);
  console.log(JSON.stringify(facialAnalysis));
  console.log(JSON.stringify(sceneAnalysis));

  const params = { // Download image from S3
    Bucket: process.env.IMAGES_BUCKET_NAME,
    Key: s3SourceKey,
  };
  console.log(params);
  return s3.getObject(params).promise()
    .catch(err => console.log(err.message))
    .then((data) => { // Write file to /tmp folder
      console.log(data);
      const destPath = path.join('/tmp', fileName);
      console.log(`Writing downloaded file to ${destPath}`);
      fs.writeFileSync(destPath, data.Body);
      return destPath;
    }) // TODO: imagemagick
    .then((filePath) => { // Open processed file at filePath as buffer
      console.log(`Opening file at ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      return fileBuffer;
    })
    .then((buffer) => { // Save new processed image to S3
      console.log(`Uploading processed file to ${s3DestinationKey}`);
      return s3.putObject({
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Key: s3DestinationKey,
        Body: buffer,
        ACL: 'public-read',
      }).promise()
        .catch(err => console.log(err.message));
    })
    .then((res) => {
      console.log(res);
      callback(null, { success: true });
    });
};
