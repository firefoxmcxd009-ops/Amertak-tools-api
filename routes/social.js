const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { url } = req.body;

    const api = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;

    const response = await axios.get(api);

    res.json({
      status: "success",
      type: "social",
      data: response.data
    });

  } catch (err) {
    res.json({
      status: "error",
      message: "Social download failed"
    });
  }
});

module.exports = router;