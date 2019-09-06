'use strict';
const AWS = require('aws-sdk'),
  db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'}),
  TableName = process.env.AUTHOR_TABLE,
  uniqid = require('uniqid');

const response = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify(message, null, 2)
});

module.exports.create = async (event, context, callback) => {
  if (event && event.body) {
    const {authorName, birthDate, email} = JSON.parse(event.body);
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
          error: 'Put must have an authorName, a birthDate and an email, and they must not be empty'
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
    const params = {
      TableName,
      Item
    };

    return db.put(params)
      .promise()
      .then(() => {
        callback(null, response(201, Item));
      })
      .catch(err => response(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Put must have a non empty body'
      })
    );
  }
};

module.exports.getAll = async (event, context, callback) => {
  const params = {
    TableName
  };
  return db.scan(params)
    .promise()
    .then(res => {
      callback(null, response(200, res))
    })
    .catch(err => callback(null, response(err.statusCode, err)));
};

module.exports.getAuthorById = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const {authorId} = event.pathParameters;

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
    const params = {
      TableName,
      Key: {
        authorId
      }
    };

    return db.get(params)
      .promise()
      .then(res => {
        callback(null, response(200, res))
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

module.exports.update = async (event, context, callback) => {
  if (event && event.pathParameters && event.body) {
    const {authorId} = event.pathParameters,
      {Item} = JSON.parse(event.body);

    if (
      !authorId ||
      authorId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Update must have an authorId, and must not be empty'
        })
      );
    }
    let UpdateExpression = [], ExpressionAttributeValues = [];
    Object.keys(Item).forEach(k => {
      if (k !== 'updatedAt') {
        UpdateExpression.push(`${k} = :${k}`);
        ExpressionAttributeValues[`:${k}`] = Item[k];
      }
    });
    UpdateExpression.push('updatedAt = :updatedAt');
    ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();

    ExpressionAttributeValues[':authorId'] = authorId;

    const params = {
      TableName,
      Key: {
        authorId
      },
      ConditionExpression: 'authorId = :authorId',
      UpdateExpression: 'set ' + UpdateExpression.join(', '),
      ExpressionAttributeValues,
      ReturnValues: 'UPDATED_NEW',
    };

    return db.update(params)
      .promise()
      .then(res => {
        callback(null, response(200, res.Attributes))
      })
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Update must have a non empty authorId parameter'
      })
    );
  }
};

module.exports.delete = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const {authorId} = event.pathParameters;

    if (
      !authorId ||
      authorId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Delete must have an authorId, and must not be empty'
        })
      );
    }
    const params = {
      TableName,
      Key: {
        authorId
      }
    };

    return db.delete(params)
      .promise()
      .then(res => {
        callback(null, response(200, {message: 'Author deleted successfully'}))
      })
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Delete must have a non empty authorId parameter'
      })
    );
  }
};