require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// auth
const auth = require("./middleware/auth");

// routes
app.use("/api/video", auth, require("./routes/video"));
app.use("/api/audio", auth, require("./routes/audio"));
app.use("/api/image", auth, require("./routes/image"));
app.use("/api/social", auth, require("./routes/social"));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🔥 Amertak PRO API Running"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});