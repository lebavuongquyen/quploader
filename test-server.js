const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(__dirname));

const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
const tempDir = isVercel ? '/tmp/temp' : path.join(__dirname, 'temp');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({ dest: tempDir });

function generateHashedName(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${hash}${ext}`;
}

// Standard Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (req.body && req.body.base64) {
    const { base64, fileName } = req.body;
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let originalName = fileName || 'base64_upload.dat';
    
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64, 'base64');
    }

    const hashedName = generateHashedName(originalName);
    const finalPath = path.join(uploadDir, hashedName);
    
    fs.writeFileSync(finalPath, buffer);
    
    setTimeout(() => {
      res.json({ success: true, key: hashedName, message: 'File uploaded successfully (base64)' });
    }, 1000);
    return;
  }

  if (!req.file) return res.status(400).send('No file uploaded');
  
  const originalName = req.file.originalname || req.file.filename;
  const hashedName = generateHashedName(originalName);
  const finalPath = path.join(uploadDir, hashedName);
  
  fs.renameSync(req.file.path, finalPath);
  
  // Simulate delay
  setTimeout(() => {
    res.json({ success: true, key: hashedName, message: 'File uploaded successfully' });
  }, 1000);
});

// Chunk Upload
app.post('/api/chunk-upload', upload.single('file'), (req, res) => {
  let fileName, chunkIndex, totalChunks, chunkBuffer;

  if (req.body && req.body.base64) {
    fileName = req.body.fileName;
    chunkIndex = req.body.chunkIndex;
    totalChunks = req.body.totalChunks;
    
    const base64 = req.body.base64;
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      chunkBuffer = Buffer.from(matches[2], 'base64');
    } else {
      chunkBuffer = Buffer.from(base64, 'base64');
    }
  } else {
    fileName = req.body.fileName;
    chunkIndex = req.body.chunkIndex;
    totalChunks = req.body.totalChunks;
    
    const chunk = req.file;
    if (!chunk) return res.status(400).send('No chunk received');
    chunkBuffer = fs.readFileSync(chunk.path);
    fs.unlinkSync(chunk.path);
  }

  // Safely use uploadId (or fileName) for temp directory name
  const safeTempName = path.basename(req.body.uploadId || fileName);
  const chunkDir = path.join(tempDir, safeTempName);
  
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir);
  
  const chunkPath = path.join(chunkDir, chunkIndex);
  fs.writeFileSync(chunkPath, chunkBuffer);

  // If this is the last chunk, assemble the file
  if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
    const hashedName = generateHashedName(fileName);
    const finalPath = path.join(uploadDir, hashedName);
    const writeStream = fs.createWriteStream(finalPath);
    
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(chunkDir, i.toString());
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p);
        writeStream.write(data);
        fs.unlinkSync(p); // delete chunk
      }
    }
    writeStream.end();
    fs.rmdirSync(chunkDir); // clean up temp dir
    
    res.json({ success: true, key: hashedName, message: 'All chunks uploaded and assembled (base64)' });
  } else {
    // Acknowledge chunk
    res.json({ success: true, message: `Chunk ${chunkIndex} received` });
  }
});

// Cancel
app.post('/api/cancel', (req, res) => {
  const { uploadId } = req.body;
  console.log('Server received cancel request for uploadId:', uploadId);
  
  if (!uploadId) {
    return res.status(400).json({ success: false, message: 'No uploadId provided' });
  }

  const safeTempName = path.basename(uploadId);
  const chunkDir = path.join(tempDir, safeTempName);

  if (fs.existsSync(chunkDir)) {
    try {
      const files = fs.readdirSync(chunkDir);
      for (const file of files) {
        fs.unlinkSync(path.join(chunkDir, file));
      }
      fs.rmdirSync(chunkDir);
      console.log(`Cleaned up temp chunk directory: ${chunkDir}`);
      res.json({ success: true, message: 'Cleaned up upload session: ' + safeTempName });
    } catch (err) {
      console.error('Error cleaning up chunk directory:', err);
      res.status(500).json({ success: false, message: 'Could not cancel upload' });
    }
  } else {
    res.json({ success: true, message: 'No active upload session found' });
  }
});

// Delete
app.post('/api/delete', (req, res) => {
  const { key } = req.body;
  console.log('Server received delete request for key:', key);
  
  if (!key) {
    return res.status(400).json({ success: false, message: 'No key provided' });
  }

  // Prevent path traversal attacks
  const safeKey = path.basename(key);
  const filePath = path.join(uploadDir, safeKey);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
      res.json({ success: true, message: 'Deleted ' + safeKey });
    } catch (err) {
      console.error(`Error deleting file:`, err);
      res.status(500).json({ success: false, message: 'Could not delete file' });
    }
  } else {
    console.warn(`File not found for deletion: ${filePath}`);
    // Still return success to clean up client UI
    res.json({ success: true, message: 'File not found on server' });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
    console.log('Use this port to test the uploader UI with actual backend integration.');
  });
}

module.exports = app;
