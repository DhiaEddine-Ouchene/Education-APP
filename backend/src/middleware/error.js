const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred';

  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
