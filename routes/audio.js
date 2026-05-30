const express = require("express");
const ytdl = require("ytdl-core");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    const info = await ytdl.getInfo(url);

    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly"
    });

    res.json({
      status: "success",
      type: "audio",
      title: info.videoDetails.title,
      download: audioFormat.url
    });

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

module.exports = router;