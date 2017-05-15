const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  console.log('Triggered by DB event');
  const { facialAnalysis, sceneAnalysis, id } = event.Records[0].dynamodb.NewImage;
  const fileName = id.S;
  const emojiName = 'pigNose.png'
  const s3SourceKey = `${process.env.ORIGINAL_FOLDER_NAME}/${fileName}`;
  const s3DestinationKey = `${process.env.PROCESSED_FOLDER_NAME}/${fileName}`;

  console.log(`Downloading source image from ${s3SourceKey}`);
  console.log(JSON.stringify(facialAnalysis));
  console.log(JSON.stringify(sceneAnalysis));

  const downloadUserImagePromise = s3.getObject({ // Download image from S3
    Bucket: process.env.IMAGES_BUCKET_NAME,
    Key: s3SourceKey,
  }).promise()
    .catch(err => console.log(err.message))
    .then((data) => { // Write file to /tmp folder
      console.log('downloadUserImage');
      const destPath = path.join('/tmp', fileName);
      console.log(`Writing downloaded user file to ${destPath}`);
      fs.writeFileSync(destPath, data.Body);
      return destPath;
    });
  const downloadNoseImagePromise = s3.getObject({ // Download image from S3
    Bucket: process.env.IMAGES_BUCKET_NAME,
    Key: `emojis/${emojiName}`,
  }).promise()
    .catch(err => console.log(err.message))
    .then((data) => { // Write file to /tmp folder
      console.log('downloadNose');
      const destPath = path.join('/tmp', emojiName);
      console.log(`Writing downloaded nose file to ${destPath}`);
      fs.writeFileSync(destPath, data.Body);
      return destPath;
    });

  return Promise.all([
    downloadUserImagePromise,
    downloadNoseImagePromise,
  ])
    .then(([userImageFilePath, noseImageFilePath]) => { // TODO: Imagemagick code
      console.log(userImageFilePath);
      console.log(noseImageFilePath);
      console.log(facialAnalysis);
      // TODO: Read facialAnalysis
      return sharp(userImageFilePath)
        .overlayWith(noseImageFilePath, { gravity: sharp.gravity.southeast } )
        .toBuffer();
    })
    .then((userImageFilePath) => { // Open processed file at userImageFilePath as buffer
      console.log(`Opening file at ${userImageFilePath}`);
      const fileBuffer = fs.readFileSync(userImageFilePath);
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
