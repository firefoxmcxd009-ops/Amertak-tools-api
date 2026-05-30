const btnSubmit = document.getElementById('btn');
const urlInput = document.querySelector('.URL-input');
const optSelect = document.querySelector('.opt');
const loader = document.getElementById('loader');
const resultBox = document.getElementById('result-box');

const videoPreview = document.getElementById('video-preview');
const audioPreview = document.getElementById('audio-preview');
const thumbImg = document.getElementById('thumb-img');
const mediaTitle = document.getElementById('media-title');
const mediaDuration = document.getElementById('media-duration');
const mediaSize = document.getElementById('media-size');
const downloadBtn = document.getElementById('download-btn');

// ផ្លាស់ប្តូរលីងនេះទៅជាលីង Render Backend របស់អ្នកពេលបានដំឡើងរួច
const serverURL = 'https://ដូរដាក់លីង-render-របស់ដកទីនេះ.onrender.com'; 

let currentDownloadLink = '';

btnSubmit.addEventListener('click', async () => {
    const urlValue = urlInput.value.trim();
    if (!urlValue) {
        alert('សូមបញ្ចូលលីងវីដេអូជាមុនសិន!');
        return;
    }

    loader.classList.remove('hidden');
    resultBox.classList.add('hidden');
    btnSubmit.disabled = true;

    const format = optSelect.value;

    try {
        const response = await fetch(`${serverURL}/info?url=${encodeURIComponent(urlValue)}&format=${format}`);
        if (!response.ok) throw new Error('Error fetching info');

        const data = await response.json();

        mediaTitle.innerText = data.title;
        mediaDuration.innerText = data.duration;
        mediaSize.innerText = data.size;

        if (format === 'mp4') {
            thumbImg.src = data.thumbnail || 'https://via.placeholder.com/300x150?text=No+Thumbnail';
            videoPreview.classList.remove('hidden');
            audioPreview.classList.add('hidden');
        } else {
            videoPreview.classList.add('hidden');
            audioPreview.classList.remove('hidden');
        }

        const endpoint = format === 'mp3' ? 'downloadmp3' : 'downloadmp4';
        currentDownloadLink = `${serverURL}/${endpoint}?url=${encodeURIComponent(urlValue)}`;

        resultBox.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        alert('មានបញ្ហាក្នុងការពិនិត្យលីង! Render Free Instance អាចនឹងចំណាយពេលប្រហែល ១ នាទីដើម្បីដាស់ខ្លួន (Wake up)។ ព្យាយាមម្តងទៀត!');
    } finally {
        loader.classList.add('hidden');
        btnSubmit.disabled = false;
    }
});

downloadBtn.addEventListener('click', () => {
    if (currentDownloadLink) {
        window.location.href = currentDownloadLink;
    }
});
