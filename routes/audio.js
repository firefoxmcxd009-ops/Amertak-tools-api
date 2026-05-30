const express = require("express");
const ytdl = require("ytdl-core");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { url } = req.body;
    
    const info = await ytdl.getInfo(url);
    
    const audio = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
      quality: "highestaudio"
    });
    
    res.json({
      status: "success",
      type: "audio",
      title: info.videoDetails.title,
      download: audio.url
    });
    
  } catch (err) {
    res.json({
      status: "error",
      message: err.message
    });
  }
});

module.exports = router;