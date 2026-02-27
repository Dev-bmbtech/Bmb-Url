const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const upload = multer({ 
    dest: os.tmpdir(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

app.use(cors());
app.use(express.static('public'));

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const form = new FormData();
        form.append('fileToUpload', fs.createReadStream(req.file.path), req.file.originalname);
        form.append('reqtype', 'fileupload');

        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        // Cleanup temp file
        fs.unlinkSync(req.file.path);
        
        res.json({ 
            url: response.data.trim(),
            success: true 
        });
        
    } catch (err) {
        console.error('Upload error:', err.message);
        
        // Cleanup on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: 'Upload failed. Please try again.' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 BMB URL Uploader running on port ${PORT}`);
});
