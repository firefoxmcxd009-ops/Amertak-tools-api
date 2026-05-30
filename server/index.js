const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// 1. DYNAMIC PORT FOR RENDER: Essential to prevent 502 Bad Gateway errors
const PORT = process.env.PORT || 4000;

app.use(cors());

// 2. ABSOLUTE PATH CONFIGURATION: Points directly to where render-build.sh installs the tools
const BIN_DIR = '/opt/render/project/src/bin';

// Check if running on Render production environment, otherwise fallback to local system paths
const YTDLP_PATH = process.env.RENDER ? path.join(BIN_DIR, 'yt-dlp') : 'yt-dlp';
const FFMPEG_PATH = process.env.RENDER ? path.join(BIN_DIR, 'ffmpeg') : 'ffmpeg';

// Helper function: Converts total seconds into MM:SS format
function formatDuration(seconds) {
    if (!seconds) return "មិនច្បាស់";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function: Converts bytes into human-readable Megabytes (MB)
function formatSize(bytes) {
    if (!bytes) return "ស្វ័យប្រវត្តិតាមការទាញយក";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

/**
 * BASE ROUTE: Home path welcome message
 * URL: https://amertak-tools-api.onrender.com/
 */
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 10%;">
            <h1 style="color: #0084ff;">🎉 Universal Social Media Downloader API is Live!</h1>
            <p style="color: #555;">Your Node.js Backend backend is running flawlessly on Render.</p>
        </div>
    `);
});

/**
 * 1. METADATA ENDPOINT: Fetches Title, Thumbnail, Duration, and estimated size.
 * URL: /info?url=<SOCIAL_URL>&format=<mp3/mp4>
 */
app.get('/info', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp4';

    if (!videoURL) {
        return res.status(400).json({ error: "សូមបញ្ចូល URL វីដេអូ!" });
    }

    console.log(`[Info Fetching] Querying metadata for: ${videoURL}`);

    // Call yt-dlp to dump all raw metadata into clean JSON format string without downloading the media
    const ytDlp = spawn(YTDLP_PATH, ['--dump-json', videoURL]);
    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => { stdoutData += data.toString(); });
    ytDlp.stderr.on('data', (data) => { stderrData += data.toString(); });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`[yt-dlp Info Error]: ${stderrData}`);
            return res.status(500).json({ error: "មិនអាចអានទិន្នន័យពីលីងនេះបានទេ។ សូមប្រាកដថាវាជាលីងសាធារណៈ (Public)!" });
        }

        try {
            const json = JSON.parse(stdoutData);
            
            // Extract file size from standard or approximate parameters inside standard JSON structure
            let rawSize = json.filesize || json.filesize_approx;
            
            // If user demands MP3, media stream payload is downscaled drastically (~1MB/Min at 128kbps)
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

/**
 * 2. AUDIO DOWNLOAD ENDPOINT: Extract and stream purely audio payloads (MP3 format)
 * URL: /downloadmp3?url=<SOCIAL_URL>
 */
app.get('/downloadmp3', (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");
    }

    // Force browsers to trigger immediate file saving attachment download sequences
    res.header('Content-Disposition', `attachment; filename="audio_${Date.now()}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    // Command arguments to isolate sound frequencies, apply high audio compression layouts
    const args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0'];
    
    // Explicitly hook ffmpeg environment locations into operational arguments when running on Render
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    
    // Stream stream data buffer back onto network client response sequentially
    ytDlp.stdout.pipe(res);

    ytDlp.on('close', (code) => {
        if (code !== 0) console.log(`[MP3 Process Ended] Error code variant: ${code}`);
    });
});

/**
 * 3. VIDEO DOWNLOAD ENDPOINT: Fetch integrated video with embedded audio tracks (MP4 format)
 * URL: /downloadmp4?url=<SOCIAL_URL>
 */
app.get('/downloadmp4', (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");
    }

    res.header('Content-Disposition', `attachment; filename="video_${Date.now()}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    // Request direct high standard multiplexed MP4 formats
    const args = ['-f', 'b[ext=mp4]/b'];
    
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    
    // Pipe operational system standard outputs back downstream
    ytDlp.stdout.pipe(res);

    ytDlp.on('close', (code) => {
        if (code !== 0) console.log(`[MP4 Process Ended] Error code variant: ${code}`);
    });
});

// Run server listener
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Universal Backend Server is running on port ${PORT}`);
    console.log(`=======================================================`);
});
