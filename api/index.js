const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');
require('dotenv').config();

const app = express();
const upload = multer({ dest: os.tmpdir() });

// ========== SUPABASE CONNECTION ==========
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL au SUPABASE_KEY haipo kwenye .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.static('public'));

// ========== TEST ENDPOINT ==========
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ BMB CDN imewasha!', 
    status: 'active',
    storage: 'Supabase'
  });
});

// ========== UPLOAD ENDPOINT ==========
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Hakuna file iliyochaguliwa' });
  }

  try {
    const file = req.file;
    const fileExt = file.originalname.split('.').pop().toLowerCase();
    const allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'pdf'];
    
    // Check extension
    if (!allowedExt.includes(fileExt)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        error: 'Aina ya file hairuhusiwi. Tuma: ' + allowedExt.join(', ')
      });
    }

    // 🔥 BMB STYLE ID: bmb_ + random 7 chars
    const fileId = 'bmb_' + Math.random().toString(36).substring(2, 9);
    const fileName = `${fileId}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    
    console.log('📦 Inapakia:', fileName);
    
    // Read file
    const fileBuffer = fs.readFileSync(file.path);
    
    // 🔥 Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('bmb-files')
      .upload(filePath, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw error;
    }
    
    // 🔥 Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bmb-files')
      .getPublicUrl(filePath);
    
    // Cleanup temp file
    fs.unlinkSync(file.path);
    
    console.log('✅ Imepakia:', publicUrl);
    
    // Response
    res.json({
      url: publicUrl,
      id: fileId,
      filename: fileName,
      size: file.size,
      type: file.mimetype,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Imeshindwa kupakia. Jaribu tena.' 
    });
  }
});

// ========== GET FILE INFO ==========
app.get('/file/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Tafuta file kwenye storage
    const { data: files, error } = await supabase.storage
      .from('bmb-files')
      .list('uploads', {
        search: fileId
      });
    
    if (error || !files || files.length === 0) {
      return res.status(404).json({ error: 'File haipo' });
    }
    
    const fileName = files[0].name;
    const filePath = `uploads/${fileName}`;
    
    const { data: { publicUrl } } = supabase.storage
      .from('bmb-files')
      .getPublicUrl(filePath);
    
    res.json({
      url: publicUrl,
      id: fileId,
      filename: fileName
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DELETE FILE ==========
app.delete('/file/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    const { data: files, error: listError } = await supabase.storage
      .from('bmb-files')
      .list('uploads', {
        search: fileId
      });
    
    if (listError || !files || files.length === 0) {
      return res.status(404).json({ error: 'File haipo' });
    }
    
    const fileName = files[0].name;
    const filePath = `uploads/${fileName}`;
    
    const { error } = await supabase.storage
      .from('bmb-files')
      .remove([filePath]);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'File imefutwa' 
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Imeshindwa kufuta' });
  }
});

// ========== LIST ALL FILES ==========
app.get('/files', async (req, res) => {
  try {
    const { data: files, error } = await supabase.storage
      .from('bmb-files')
      .list('uploads', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) throw error;
    
    const fileList = files.map(file => {
      const filePath = `uploads/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('bmb-files')
        .getPublicUrl(filePath);
      
      return {
        name: file.name,
        url: publicUrl,
        size: file.metadata?.size,
        created: file.created_at
      };
    });
    
    res.json({
      total: fileList.length,
      files: fileList
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Imeshindwa kupata files' });
  }
});

// ========== DOWNLOAD COUNT ==========
app.post('/api/stats/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Hii inahitaji table kwenye Supabase database
    // Kama huna table, itarudisha hata hivyo
    
    res.json({ success: true });
    
  } catch (error) {
    res.json({ success: true }); // Don't break if stats fail
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 ============================');
  console.log('✅ BMB CDN imewasha!');
  console.log('📦 Supabase:', supabaseUrl);
  console.log('💾 Bucket: bmb-files');
  console.log(`🌐 Port: ${PORT}`);
  console.log('============================\n');
});

// For Vercel serverless
module.exports = app;
