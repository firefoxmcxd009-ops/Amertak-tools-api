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

    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest"
    });

    res.json({
      status: "success",
      type: "video",
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.[0]?.url,
      download: format.url
    });

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

module.exports = router;