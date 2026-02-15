const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const distPath = path.join(__dirname, 'dist');
const zipPath = path.join(__dirname, 'kidtracker-node.zip');

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('Zip created successfully: ' + archive.pointer() + ' bytes');
  console.log('Location: ' + zipPath);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(distPath, false);
archive.finalize();
