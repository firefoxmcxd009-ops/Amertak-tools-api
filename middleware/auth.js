// middleware/auth.js

module.exports = (req, res, next) => {
  const key = req.headers["x-api-key"];

  if (!key || key !== process.env.API_KEY) {
    return res.status(403).json({
      status: "error",
      message: "Invalid API Key"
    });
  }

  next();
};