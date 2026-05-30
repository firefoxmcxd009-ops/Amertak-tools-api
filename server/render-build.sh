#!/usr/bin/env bash
# ចេញពីដំណើរការភ្លាមបើមាន Error
set -o errexit

# ១. ដំឡើង Node Modules ធម្មតា
npm install

# ២. បង្កើតថតសម្រាប់ដាក់កម្មវិធី CLI ខាងក្រៅ
mkdir -p /opt/render/project/src/bin
export PATH=/opt/render/project/src/bin:$PATH

# ៣. ទាញយក yt-dlp ជំនាន់ចុងក្រោយ
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /opt/render/project/src/bin/yt-dlp
chmod a+rx /opt/render/project/src/bin/yt-dlp

# ៤. ទាញយក ffmpeg (Static Build សម្រាប់ Linux) ដើម្បីឱ្យ yt-dlp អាចបំប្លែងឯកសារបានល្អ
echo "Downloading ffmpeg..."
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-*-static/ffmpeg /opt/render/project/src/bin/
mv ffmpeg-*-static/ffprobe /opt/render/project/src/bin/
chmod a+rx /opt/render/project/src/bin/ffmpeg /opt/render/project/src/bin/ffprobe

# សម្អាតហ្វាយដែលមិនចាំបាច់
rm -rf ffmpeg.tar.xz ffmpeg-*-static

echo "Build pre-requirements completed successfully!"
