'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const TableName = process.env.POSTS_TABLE;
const uniqid = require('uniqid');

const response = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify(message, null, 2)
});

module.exports.createAuthor = async (event, context, callback) => {
  if (event && event.body) {
    const reqBody = JSON.parse(event.body),
    authorName = reqBody.authorName,
    birthDate = reqBody.birthDate,
    email = reqBody.email;
    if (
      !authorName ||
      authorName.trim() === '' ||
      !birthDate ||
      birthDate.trim() === '' ||
      !email ||
      email.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Post must have an authorName a birthDate and an email, and they must not be empty'
        })
      );
    }

    const Item = {
      authorId: uniqid(),
      authorName,
      birthDate,
      email,
      createdAt: new Date().toISOString(),
    };

    return db.put({
      TableName,
      Item
    })
    .promise()
    .then(() => {
      callback(null, response(201, Item));
    })
    .catch(err => response(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Post must have a non empty body'
      })
    );
  }
};

module.exports.getAllAuthors = async (event, context, callback) => {
  return db.scan({
    TableName
  })
  .promise()
  .then(res => {
    callback(null, response(200, res.Items))
  })
  .catch(err => callback(null, response(err.statusCode, err)));
};

module.exports.getAuthorById = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const reqParams = event.pathParameters,
    authorId = reqParams.authorId;

    if (
      !authorId ||
      authorId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
            error: 'Get must have an authorId, and must not be empty'
        })
      );
    }
    return db.get({
      TableName,
      Key: {
        authorId
      }
    })
    .promise()
    .then(res => {
      callback(null, response(200, res.Items))
    })
    .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
          error: 'Get must have a non empty authorId parameter'
      })
    );
  }
};
