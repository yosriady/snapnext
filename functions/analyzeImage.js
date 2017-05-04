const AWS = require('aws-sdk');

const rek = new AWS.Rekognition();
const db = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  const s3Key = event.Records[0].s3.object.key;
  const imageId = (s3Key.replace(`${process.env.ORIGINAL_FOLDER_NAME}/`, '').replace('.png', ''));
  console.log(`Triggered by S3 event ${s3Key}`);

  const detectFacesParams = {
    Image: {
      S3Object: {
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Name: s3Key,
      },
    },
    Attributes: [
      'ALL',
    ],
  };
  const detectLabelsParams = {
    Image: {
      S3Object: {
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Name: s3Key,
      },
    },
  };
  return Promise.all([
    rek.detectFaces(detectFacesParams).promise(),
    rek.detectLabels(detectLabelsParams).promise(),
  ])
    .then(([facialAnalysisResult, sceneAnalysisResult]) => {
      console.log('Analyzed images!');
      const putParams = {
        Item: {
          id: imageId,
          facialAnalysis: facialAnalysisResult,
          sceneAnalysis: sceneAnalysisResult,
          timestamp: Date.now(),
        },
        TableName: process.env.IMAGES_TABLE_NAME,
      };
      console.log(putParams);
      return db.put(putParams).promise();
    })
    .then(() => {
      console.log('Inserted analysis results to DB!');
      const response = {
        statusCode: 201,
        body: JSON.stringify({ success: true }),
      };
      callback(null, response);
    });
};
