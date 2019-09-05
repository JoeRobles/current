'use strict';
const AWS = require('aws-sdk'),
db = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'}),
AuthorTableName = process.env.AUTHOR_TABLE,
PublicationTableName = process.env.PUBLICATION_TABLE,
uniqid = require('uniqid');

const response = (statusCode, message) => ({
  statusCode,
  body: JSON.stringify(message, null, 2)
});

module.exports.createAuthor = async (event, context, callback) => {
  if (event && event.body) {
    const { authorName, birthDate, email } = JSON.parse(event.body);
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
      TableName: AuthorTableName,
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

module.exports.getAllAuthors = async (event, context, callback) => {
  const params = {
    TableName: AuthorTableName
  };
  return db.scan(params)
  .promise()
  .then(res => {
    callback(null, response(200, res.Items))
  })
  .catch(err => callback(null, response(err.statusCode, err)));
};

module.exports.getAuthorById = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const { authorId } = event.pathParameters;

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
      TableName: AuthorTableName,
      Key: {
        authorId
      }
    };

    return db.get(params)
    .promise()
    .then(res => {
      callback(null, response(200, res.Item))
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

module.exports.updateAuthor = async (event, context, callback) => {
  if (event && event.pathParameters && event.body) {
    const { authorId } = event.pathParameters,
    { Item } = JSON.parse(event.body);

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
      TableName: AuthorTableName,
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

module.exports.deleteAuthor = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const { authorId } = event.pathParameters;

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
      TableName: AuthorTableName,
      Key: {
        authorId
      }
    };

    return db.delete(params)
        .promise()
        .then(res => {
          callback(null, response(200, { message: 'Author deleted successfully' }))
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

module.exports.createPublication = async (event, context, callback) => {
  if (event && event.body) {
    const { title, body, publicationDate, authors } = JSON.parse(event.body);
    if (
        !title ||
        title.trim() === '' ||
        !body ||
        body.trim() === '' ||
        !publicationDate ||
        publicationDate.trim() === '' ||
        !authors ||
        authors.length() > 0
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
      TableName: PublicationTableName,
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

module.exports.getAllPublications = async (event, context, callback) => {
  const params = {
    TableName: PublicationTableName
  };
  return db.scan(params)
      .promise()
      .then(res => {
        callback(null, response(200, res.Items))
      })
      .catch(err => callback(null, response(err.statusCode, err)));
};

module.exports.getPublicationById = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const { publicationId } = event.pathParameters;

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
      TableName: PublicationTableName,
      Key: {
        publicationId
      }
    };

    return db.get(params)
        .promise()
        .then(res => {
          callback(null, response(200, res.Item))
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

module.exports.updatePublication = async (event, context, callback) => {
  if (event && event.pathParameters && event.body) {
    const { publicationId } = event.pathParameters,
        { Item } = JSON.parse(event.body);

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
      TableName: PublicationTableName,
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
        .then(res => {
          callback(null, response(200, res.Attributes))
        })
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

module.exports.deletePublication = async (event, context, callback) => {
  if (event && event.pathParameters) {
    const { publicationId } = event.pathParameters;

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
      TableName: PublicationTableName,
      Key: {
        publicationId
      }
    };

    return db.delete(params)
        .promise()
        .then(res => {
          callback(null, response(200, { message: 'Publication deleted successfully' }))
        })
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