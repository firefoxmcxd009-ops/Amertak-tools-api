const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());

// កំណត់ផ្លូវទៅកាន់ថត bin
const BIN_DIR = '/opt/render/project/src/bin';

const YTDLP_PATH = process.env.RENDER ? path.join(BIN_DIR, 'yt-dlp') : 'yt-dlp';
const FFMPEG_PATH = process.env.RENDER ? path.join(BIN_DIR, 'ffmpeg') : 'ffmpeg';

// 🔥 ស្គ្រីបពិសេសជួសជុលសិទ្ធិ (Fix Permission Denied) នៅលើ Render
if (process.env.RENDER) {
    try {
        console.log("🔒 [Permission Fix] កំពុងផ្តល់សិទ្ធិដំណើរការទៅឱ្យ yt-dlp និង ffmpeg...");
        execSync(`chmod a+rx ${YTDLP_PATH} ${FFMPEG_PATH}`);
        console.log("✅ [Permission Fix] ផ្តល់សិទ្ធិជោគជ័យ!");
    } catch (err) {
        console.error("❌ [Permission Fix] បរាជ័យក្នុងការផ្តល់សិទ្ធិ:", err.message);
    }
}

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

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 10%;">
            <h1 style="color: #0084ff;">🎉 Universal Social Media Downloader API is Live!</h1>
            <p style="color: #555;">Your Node.js Backend is running flawlessly on Render.</p>
        </div>
    `);
});

app.get('/info', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp4';

    if (!videoURL) {
        return res.status(400).json({ error: "សូមបញ្ចូល URL វីដេអូ!" });
    }

    console.log(`[Info Fetching] កំពុងអានលីង: ${videoURL}`);

    // បន្ថែម flag '--no-check-certificates' ដើម្បីការពារកុំឱ្យគាំងជាមួយ SSL របស់ Render
    const ytDlp = spawn(YTDLP_PATH, ['--dump-json', '--no-check-certificates', videoURL]);
    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => { stdoutData += data.toString(); });
    ytDlp.stderr.on('data', (data) => { stderrData += data.toString(); });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`[yt-dlp Info Error] Code ${code}: ${stderrData}`);
            return res.status(500).json({ error: "yt-dlp មិនអាចអានលីងនេះបានទេ!", details: stderrData });
        }

        try {
            const json = JSON.parse(stdoutData);
            let rawSize = json.filesize || json.filesize_approx;
            
            if (format === 'mp3' && json.duration) {
                rawSize = (json.duration * 128000) / 8;
            }

            res.json({
                title: json.title || "គ្មានចំណងជើង",
                thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || "",
                duration: formatDuration(json.duration),
                size: formatSize(rawSize)
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "ការបំប្លែងទិន្នន័យ JSON មានកំហុស!" });
        }
    });
});

app.get('/downloadmp3', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");

    res.header('Content-Disposition', `attachment; filename="audio_${Date.now()}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '--no-check-certificates'];
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    ytDlp.stdout.pipe(res);
});

app.get('/downloadmp4', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");

    res.header('Content-Disposition', `attachment; filename="video_${Date.now()}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const args = ['-f', 'b[ext=mp4]/b', '--no-check-certificates'];
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    ytDlp.stdout.pipe(res);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
