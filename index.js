const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(cors()); 
app.use(express.json());

const SECRET_KEY = "maison_ethos_key_2026"; 

// Render's secrets folder is read-only. 
// We must copy the cookies to the writable /tmp directory so yt-dlp can save updates.
const COOKIE_PATH = '/tmp/cookies.txt';
if (fs.existsSync('/etc/secrets/cookies.txt')) {
    fs.copyFileSync('/etc/secrets/cookies.txt', COOKIE_PATH);
    console.log("[API] Secure cookies successfully loaded into memory.");
}

app.post('/extract', async (req, res) => {
    const { videoId } = req.body;
    
    if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
    }

    try {
        const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`\n[API] Extracting stream for: ${fullUrl}`);
        
       const output = await youtubedl(fullUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            format: 'bestaudio',
            extractorArgs: 'youtube:player-client=web',
            ...(fs.existsSync(COOKIE_PATH) && { cookies: COOKIE_PATH })
        });

        const rawUrl = output.url;
        if (!rawUrl) throw new Error("yt-dlp could not extract the raw URL.");

        const hmac = crypto.createHmac('sha256', SECRET_KEY);
        hmac.update(rawUrl);
        const signature = hmac.digest('hex');

        console.log("[API] Extraction successful. Sending payload to frontend.");
        
        res.json({
            url: rawUrl,
            signature: signature
        });
        
    } catch (err) {
        console.error("[API] Extraction failed:", err.message);
        res.status(500).json({ error: "Extraction failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Extractor API is running and listening on port ${PORT}`);
});
