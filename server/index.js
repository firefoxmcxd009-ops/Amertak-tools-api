const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// កំណត់ Port ឱ្យត្រូវតាម Render (លំនាំដើមយក Port 4000)
const PORT = process.env.PORT || 4000;

app.use(cors());

// កំណត់ផ្លូវទៅកាន់ថត bin ដែលបានបង្កើតឡើងដោយ render-build.sh
const BIN_DIR = '/opt/render/project/src/bin';

// កំណត់លក្ខខណ្ឌស្វែងរកកម្មវិធី (បើនៅលើ Render ឱ្យរត់តាមផ្លូវចំ បើនៅលើម៉ាស៊ីន Local ឱ្យរត់ធម្មតា)
const YTDLP_PATH = process.env.RENDER ? path.join(BIN_DIR, 'yt-dlp') : 'yt-dlp';
const FFMPEG_PATH = process.env.RENDER ? path.join(BIN_DIR, 'ffmpeg') : 'ffmpeg';

// មុខងារជំនួយសម្រាប់បំប្លែងវិនាទី (Seconds) ទៅជាទម្រង់ នាទី:វិនាទី (MM:SS)
function formatDuration(seconds) {
    if (!seconds) return "មិនច្បាស់";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// មុខងារជំនួយសម្រាប់បំប្លែង Bytes ទៅជា Megabytes (MB)
function formatSize(bytes) {
    if (!bytes) return "ស្វ័យប្រវត្តិតាមការទាញយក";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
}

/**
 * 1. API Endpoint: សម្រាប់ទាញយកព័ត៌មានលម្អិតរបស់វីដេអូ/សំឡេង (Metadata Info)
 * URL: /info?url=<SOCIAL_MEDIA_URL>&format=<mp3/mp4>
 */
app.get('/info', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp4';

    if (!videoURL) {
        return res.status(400).json({ error: "សូមបញ្ចូល URL វីដេអូ!" });
    }

    console.log(`[Info Request] កំពុងពិនិត្យលីង: ${videoURL}`);

    // ហៅ yt-dlp មកដំណើរការទាញយកទិន្នន័យ JSON សង្ខេប
    const ytDlp = spawn(YTDLP_PATH, ['--dump-json', videoURL]);
    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => { stdoutData += data.toString(); });
    ytDlp.stderr.on('data', (data) => { stderrData += data.toString(); });

    ytDlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`[yt-dlp Error]: ${stderrData}`);
            return res.status(500).json({ error: "មិនអាចអានទិន្នន័យពីលីងនេះបានទេ! សូមប្រាកដថាវាជាលីងសាធារណៈ (Public)។" });
        }

        try {
            const json = JSON.parse(stdoutData);
            
            // គណនាទំហំហ្វាយប្រហាក់ប្រហែល
            let rawSize = json.filesize || json.filesize_approx;
            
            // បើអ្នកប្រើប្រាស់ជ្រើសរើសយក MP3 យើងធ្វើការប៉ាន់ស្មានទំហំសំឡេង (128kbps audio ស៊ីប្រហែល 1MB/នាទី)
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
 * 2. API Endpoint: សម្រាប់ទាញយកតែសំឡេង (MP3)
 * URL: /downloadmp3?url=<SOCIAL_MEDIA_URL>
 */
app.get('/downloadmp3', (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");
    }

    // កំណត់ Header សម្រាប់ប្រាប់ Browser ឱ្យទាញយកជាហ្វាយអូឌីយ៉ូ .mp3
    res.header('Content-Disposition', `attachment; filename="audio_${Date.now()}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    // កំណត់ Arguments សម្រាប់បំប្លែងវីដេអូទៅជា MP3 គុណភាពខ្ពស់
    const args = ['-x', '--audio-format', 'mp3', '--audio-quality', '0'];
    
    // បើនៅលើ Render ត្រូវប្រាប់ឱ្យ yt-dlp ស្គាល់ទីតាំង ffmpeg ឱ្យចំ
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    
    // បញ្ជូនទិន្នន័យទម្រង់ Stream ទៅកាន់អ្នកប្រើប្រាស់ (Real-time Streaming)
    ytDlp.stdout.pipe(res);

    ytDlp.on('close', (code) => {
        if (code !== 0) console.log(`[MP3 Download] បានបញ្ចប់ជាមួយ Error Code: ${code}`);
    });
});

/**
 * 3. API Endpoint: សម្រាប់ទាញយកវីដេអូ (MP4)
 * URL: /downloadmp4?url=<SOCIAL_MEDIA_URL>
 */
app.get('/downloadmp4', (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).send("សូមបញ្ចូល URL វីដេអូ!");
    }

    // កំណត់ Header សម្រាប់ប្រាប់ Browser ឱ្យទាញយកជាហ្វាយវីដេអូ .mp4
    res.header('Content-Disposition', `attachment; filename="video_${Date.now()}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    // កំណត់យកទម្រង់ MP4 ដែលមានទាំងរូបភាព និងសំឡេងស្រាប់ (Single file container)
    const args = ['-f', 'b[ext=mp4]/b'];
    
    if (process.env.RENDER) {
        args.push('--ffmpeg-location', FFMPEG_PATH);
    }
    args.push('-o', '-', videoURL);

    const ytDlp = spawn(YTDLP_PATH, args);
    
    // បញ្ជូនទិន្នន័យទម្រង់ Stream
    ytDlp.stdout.pipe(res);

    ytDlp.on('close', (code) => {
        if (code !== 0) console.log(`[MP4 Download] បានបញ្ចប់ជាមួយ Error Code: ${code}`);
    });
});

// បើកដំណើរការ Web Server
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Universal Backend Server is running on port ${PORT}`);
    console.log(`=======================================================`);
});
