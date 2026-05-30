const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/api/video", require("./routes/video"));
app.use("/api/image", require("./routes/image"));
app.use("/api/audio", require("./routes/audio"));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Amertak Downloader API Running"
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));