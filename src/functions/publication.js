'use strict';
const AWS = require('aws-sdk'),
  db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'}),
  TableName = process.env.PUBLICATION_TABLE,
  AuthorTableName = process.env.AUTHOR_TABLE,
  uniqid = require('uniqid');

const response = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify(message, null, 2)
});

module.exports.create = async (event, context, callback) => {
  if (event && event.body) {
    const {title, body, publicationDate, authors} = JSON.parse(event.body);
    if (
      !title ||
      title.trim() === '' ||
      !body ||
      body.trim() === '' ||
      !publicationDate ||
      publicationDate.trim() === '' ||
      !authors ||
      authors.length === 0
    ) {
      return callback(
        null,
        response(400, {
          error: 'Put must have a title, a body, a publicationDate and authors, and they must not be empty'
        })
      );
    }

    const Item = {
      publicationId: uniqid(),
      title,
      body,
      publicationDate,
      authors,
      createdAt: new Date().toISOString(),
    };
    const params = {
      TableName,
      Item
    };

    return db.put(params)
      .promise()
      .then(() => callback(null, response(201, Item)))
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
    .then(res => callback(null, response(200, res)))
    .catch(err => callback(null, response(err.statusCode, err)));
};

module.exports.getAllOrdered = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const { order } = event.pathParameters;

    if (
      !order ||
      order.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Scan must have an order, and must not be empty'
        })
      );
    }

    const sortByPublicationDateAsc = (a, b) => a.publicationDate - b.publicationDate,
      sortByPublicationDateDesc = (a, b) => b.publicationDate - a.publicationDate,
      params = {
        TableName
      };
    return await db.scan(params)
      .promise()
      .then(res => {
        const ascDesc = order ? (order === 'asc' ? sortByPublicationDateAsc : sortByPublicationDateDesc) : sortByPublicationDateAsc,
          resItems = res.Items.map(item => ({
            ...item,
            authors: item.authors.map(async authorId => {
              const params = {
                TableName: AuthorTableName,
                Key: {
                  authorId
                }
              };

              return await db.get(params)
                .promise()
                .then(resp => callback(null, response(200, resp)))
                .catch(err => callback(null, response(err.statusCode, err)));
            })
          }));
        const items = {
          ...res,
          Items: resItems.sort(ascDesc)
        };
        callback(null, response(200, items));
      })
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Scan must have a non empty body'
      })
    );
  }
};

module.exports.getById = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const {publicationId} = event.pathParameters;

    if (
      !publicationId ||
      publicationId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Get must have a publicationId, and must not be empty'
        })
      );
    }
    const params = {
      TableName,
      Key: {
        publicationId
      }
    };

    return db.get(params)
      .promise()
      .then(res => callback(null, response(200, res)))
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Get must have a non empty publicationId parameter'
      })
    );
  }
};

module.exports.getByAuthorId = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const {authorId} = event.pathParameters;

    if (
      !authorId ||
      authorId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Get must have a authorId, and must not be empty'
        })
      );
    }
    const params = {
      TableName
    };
    return await db.scan(params)
      .promise()
      .then(res => {
        const Items = res.Items.filter(item => item.authors.indexOf(authorId) > -1),
        items = {
          ...res,
          Items
        };
        callback(null, response(200, items))
      })
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Get must have a non empty publicationId parameter'
      })
    );
  }
};

module.exports.update = async (event, context, callback) => {
  if (event && event.pathParameters && event.body) {
    const {publicationId} = event.pathParameters,
      {Item} = JSON.parse(event.body);

    if (
      !publicationId ||
      publicationId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Update must have a publicationId, and must not be empty'
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

    ExpressionAttributeValues[':publicationId'] = publicationId;

    const params = {
      TableName,
      Key: {
        publicationId
      },
      ConditionExpression: 'publicationId = :publicationId',
      UpdateExpression: 'set ' + UpdateExpression.join(', '),
      ExpressionAttributeValues,
      ReturnValues: 'UPDATED_NEW',
    };

    return db.update(params)
      .promise()
      .then(res => callback(null, response(200, res.Attributes)))
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Update must have a non empty publicationId parameter'
      })
    );
  }
};

module.exports.delete = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const {publicationId} = event.pathParameters;

    if (
      !publicationId ||
      publicationId.trim() === ''
    ) {
      return callback(
        null,
        response(400, {
          error: 'Delete must have a publicationId, and must not be empty'
        })
      );
    }
    const params = {
      TableName,
      Key: {
        publicationId
      }
    };

    return db.delete(params)
      .promise()
      .then(res => callback(null, response(200, {message: 'Publication deleted successfully'})))
      .catch(err => callback(null, response(err.statusCode, err)));
  } else {
    return callback(
      null,
      response(400, {
        error: 'Delete must have a non empty publicationId parameter'
      })
    );
  }
};
