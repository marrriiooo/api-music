const InvariantError = require('../../exceptions/InvariantError');

const UploadsValidator = {
  validateImageHeaders: (headers) => {
    const validationResult = validateImageHeaders(headers);

    if (validationResult instanceof Error) {
      throw new InvariantError(validationResult.message);
    }
  },
};

const validateImageHeaders = (headers) => {
  const { 'content-type': contentType } = headers;

  if (!contentType) {
    return new Error('Header content-type tidak ditemukan');
  }

  if (!contentType.match(/^image\//)) {
    return new Error('Uploaded file must be an image');
  }

  return true;
};

module.exports = UploadsValidator;