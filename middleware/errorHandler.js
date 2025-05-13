const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 21614) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number. Please check and try again.'
    });
  }

  if (err.code === 20003) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please contact support.'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// ❌ Don't use module.exports
// module.exports = errorHandler;

// ✅ Use ES module export
export default errorHandler;
