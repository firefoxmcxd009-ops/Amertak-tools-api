module.exports = (req, res, next) => {
  const key = req.headers["x-api-key"];
  
  console.log("API KEY RECEIVED:", key); // 🔥 debug
  
  if (!key || key !== process.env.API_KEY) {
    return res.status(403).json({
      status: "error",
      message: "Invalid API Key"
    });
  }
  
  next();
};