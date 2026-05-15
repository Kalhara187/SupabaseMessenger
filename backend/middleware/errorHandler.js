const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message || err);

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.status || 500;
  let message = err.message || 'Internal server error';

  // Check for common Supabase errors
  if (message.includes('Could not find the table') || message.includes('PGRST')) {
    statusCode = 503;
    message = 'Database tables are not configured. Please create them in your Supabase dashboard using the SQL editor.';
  }

  return res.status(statusCode).json({
    message,
  });
};

module.exports = errorHandler;
