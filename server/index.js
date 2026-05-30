const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// កំណត់ Port សម្រាប់ Render (បើគ្មានទេ យក 4000)
const PORT = process.env.PORT || 4000;

app.use(cors());

// កំណត់ផ្លូវទៅកាន់ yt-dlp ផ្អែកលើបរិស្ថាន (Local ឬនៅលើ Render)
const YTDLP_PATH = process.env.RENDER ? '/opt/render/project/src/bin/yt-dlp' : 'yt-dlp';

function formatDuration(seconds) {
    if (!seconds) return "មិនច្បាស់";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
    if (!bytes) return "ស្វ័យប្រវត្តិតាមការទាញយក";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

// 1. API សម្រាប់ផ្តល់ព័ត៌មានលម្អិត
app.get('/info', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp4';

    if (!videoURL) {
        return res.status(400).json({ error: "សូមបញ្ចូល URL" });
    }

    const ytDlp = spawn(YTDLP_PATH, ['--dump-json', videoURL]);
    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => { stdoutData += data.toString(); });
    ytDlp.stderr.on('data', (data) => { stderrData += data.toString(); });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp error: ${stderrData}`);
            return res.status(500).json({ error: "មិនអាចអានទិន្នន័យលីងនេះបានទេ" });
        }

        try {
            const json = JSON.parse(stdoutData);
            let rawSize = json.filesize || json.filesize_approx;
            
            if (format === 'mp3' && json.duration) {
                rawSize = (json.duration * 128000) / 8; // ប៉ាន់ស្មានទំហំ MP3
            }

            res.json({
                title: json.title || "គ្មានចំណងជើង",
                thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
                duration: formatDuration(json.duration),
                size: formatSize(rawSize)
            });
        } catch (e) {
            res.status(500).json({ error: "ការបំប្លែងទិន្នន័យមានកំហុស" });
        }
    });
});

// 2. Endpoint ទាញយក MP3
app.get('/downloadmp3', (req, res) => {
    const videoURL = req.query.url;
    res.header('Content-Disposition', `attachment; filename="audio_${Date.now()}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const ytDlp = spawn(YTDLP_PATH, ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', '-', videoURL]);
    ytDlp.stdout.pipe(res);
});

// 3. Endpoint ទាញយក MP4
app.get('/downloadmp4', (req, res) => {
    const videoURL = req.query.url;
    res.header('Content-Disposition', `attachment; filename="video_${Date.now()}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const ytDlp = spawn(YTDLP_PATH, ['-f', 'b[ext=mp4]/b', '-o', '-', videoURL]);
    ytDlp.stdout.pipe(res);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
