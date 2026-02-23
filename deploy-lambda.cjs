// Packages the Lambda function and uploads it to AWS
// Run: node deploy-lambda.cjs
//
// Prerequisites:
//   npm install archiver @aws-sdk/client-lambda   (in project root, not lambda/)
//   AWS credentials configured (aws configure or environment variables)

const fs   = require('fs');
const path = require('path');

async function run() {
  // ── Step 1: Install Lambda dependencies ───────────────────────────────────
  console.log('Step 1: Installing Lambda dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install --omit=dev', {
    cwd: path.join(__dirname, 'lambda'),
    stdio: 'inherit',
  });
  console.log('Dependencies installed.\n');

  // ── Step 2: Zip the Lambda directory ──────────────────────────────────────
  console.log('Step 2: Creating lambda.zip...');
  const archiver = require('archiver');
  const zipPath  = path.join(__dirname, 'lambda.zip');

  await new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => {
      console.log(`lambda.zip created: ${(archive.pointer() / 1024).toFixed(1)} KB\n`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    // Add entire lambda/ directory contents at zip root
    archive.directory(path.join(__dirname, 'lambda'), false);
    archive.finalize();
  });

  // ── Step 3: Upload to AWS Lambda ──────────────────────────────────────────
  console.log('Step 3: Uploading to AWS Lambda (kidtracker-api)...');
  try {
    const { LambdaClient, UpdateFunctionCodeCommand } = require('@aws-sdk/client-lambda');
    const client = new LambdaClient({ region: 'us-east-1' });
    const zipBuffer = fs.readFileSync(zipPath);

    const result = await client.send(new UpdateFunctionCodeCommand({
      FunctionName: 'kidtracker-api',
      ZipFile: zipBuffer,
    }));

    console.log('Lambda updated successfully!');
    console.log('Function ARN:', result.FunctionArn);
    console.log('State:', result.State);
    console.log('\nDone. The new QB routes are now live.');
  } catch (err) {
    console.error('\nFailed to auto-deploy. Upload manually instead:');
    console.log('1. Go to: https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/kidtracker-api');
    console.log('2. Code tab → Upload from → .zip file');
    console.log(`3. Select: ${zipPath}`);
    console.log('\nError was:', err.message);
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
