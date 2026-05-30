const express = require("express");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    let image = "";

    // YouTube thumbnail
    if (url.includes("youtu")) {
      let id;

      if (url.includes("watch?v=")) {
        id = new URL(url).searchParams.get("v");
      } else {
        id = url.split("/").pop().split("?")[0];
      }

      image = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    }

    // fallback
    if (!image) {
      return res.json({
        status: "error",
        message: "Image not supported"
      });
    }

    res.json({
      status: "success",
      type: "image",
      url: image
    });

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

module.exports = router;