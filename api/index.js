const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const os = require('os');
const cors = require('cors');

const app = express();
const upload = multer({ dest: os.tmpdir() });

app.use(cors());
app.use(express.static('public')); // Serve frontend

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(req.file.path), req.file.originalname);
    form.append('reqtype', 'fileupload');

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
    });

    fs.unlinkSync(req.file.path); // cleanup
    res.json({ url: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
                
