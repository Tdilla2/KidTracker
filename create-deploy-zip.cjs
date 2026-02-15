const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, 'dist-deploy.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('Zip created: ' + archive.pointer() + ' bytes');
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);

// Add the dist directory contents at the root of the zip (with forward slashes)
archive.directory(path.join(__dirname, 'dist/'), false);

archive.finalize();
