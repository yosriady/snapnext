const AWS = require('aws-sdk');

const rek = new AWS.Rekognition();
const db = new AWS.DynamoDB.DocumentClient();

module.exports.handler = (event, context, callback) => {
  const s3Key = event.Records[0].s3.object.key;
  console.log(`Triggered by S3 event ${s3Key}`);

  const detectParams = {
    Image: {
      S3Object: {
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Name: s3Key,
      },
    },
  };
  return Promise.all([
    rek.detectFaces(detectParams).promise(),
    rek.detectLabels(detectParams).promise(),
  ])
    .then(([facialAnalysisResult, sceneAnalysisResult]) => {
      console.log('Analyzed images!');
      const putParams = {
        Item: {
          id: (s3Key.replace('originals/', '')),
          facialAnalysis: facialAnalysisResult,
          sceneAnalysis: sceneAnalysisResult,
          status: 'analyzed',
          timestamp: Date.now(),
        },
        TableName: process.env.IMAGES_TABLE_NAME,
      };
      console.log(putParams);
      return db.put(putParams).promise();
    })
    .then(() => {
      console.log('Inserted analysis results to DB!');
      callback(null, { success: true });
    });
};
