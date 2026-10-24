function errorHandler(err, req, res, next) {
  console.error('[Unhandled Server Error]:', err);

  // MySQL specific error handling
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected. A unique constraint in the database was violated.',
      error: err.sqlMessage || err.message
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint violation. Associated relational entity not found or still referenced.',
      error: err.sqlMessage || err.message
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
