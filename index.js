const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const crypto = require('crypto');

const app = express();
app.use(cors()); // Allows your frontend to connect
app.use(express.json());

const SECRET_KEY = "maison_ethos_key_2026"; 

// The endpoint your frontend will ping
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
            noCallHome: true,
            noCheckCertificate: true,
            youtubeSkipDashManifest: true,
            format: 'bestaudio',
            extractorArgs: 'youtube:client=android'
        });

        const rawUrl = output.url;
        if (!rawUrl) throw new Error("yt-dlp could not extract the raw URL.");

        const hmac = crypto.createHmac('sha256', SECRET_KEY);
        hmac.update(rawUrl);
        const signature = hmac.digest('hex');

        console.log("[API] Extraction successful. Sending payload to frontend.");
        
        // Send the signed data back to the client
        res.json({
            url: rawUrl,
            signature: signature
        });
        
    } catch (err) {
        console.error("[API] Extraction failed:", err.message);
        res.status(500).json({ error: "Extraction failed" });
    }
});

// Use Render's port or default to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Extractor API is running and listening on port ${PORT}`);
});
