const { AmplifyClient, CreateDeploymentCommand, StartDeploymentCommand } = require('@aws-sdk/client-amplify');
const https = require('https');
const fs = require('fs');
const path = require('path');

const APP_ID = 'd2nbsjhv8lzch9';
const BRANCH_NAME = 'main';
const REGION = 'us-east-1';

// Build credentials: prefer explicit env vars, fall back to default chain (e.g. ~/.aws/credentials)
const clientConfig = { region: REGION };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID.replace(/[^\x20-\x7E]/g, '').trim();
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY.replace(/[^\x20-\x7E]/g, '').trim();
  console.log(`AWS_ACCESS_KEY_ID length: ${accessKey.length} (expected: 20)`);
  console.log(`AWS_SECRET_ACCESS_KEY length: ${secretKey.length} (expected: 40)`);
  clientConfig.credentials = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  };
}
const client = new AmplifyClient(clientConfig);

function uploadToUrl(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'PUT',
      headers: {
        'Content-Length': data.length,
        'Content-Type': 'application/zip'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ File uploaded successfully');
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function deploy() {
  try {
    console.log('🚀 Starting deployment to AWS Amplify...\n');

    // Read the ZIP file
    const zipPath = path.join(__dirname, 'dist-deploy.zip');
    const zipData = fs.readFileSync(zipPath);
    console.log(`📦 ZIP file loaded: ${(zipData.length / 1024).toFixed(2)} KB\n`);

    // Step 1: Create deployment
    console.log('📤 Step 1: Creating deployment...');
    const createCommand = new CreateDeploymentCommand({
      appId: APP_ID,
      branchName: BRANCH_NAME
    });

    const createResponse = await client.send(createCommand);
    console.log('✅ Deployment created');
    console.log(`   Job ID: ${createResponse.jobId}`);

    if (!createResponse.zipUploadUrl) {
      throw new Error('No upload URL received from Amplify');
    }

    // Step 2: Upload ZIP file
    console.log('\n📤 Step 2: Uploading ZIP file to Amplify...');
    await uploadToUrl(createResponse.zipUploadUrl, zipData);

    // Step 3: Start deployment
    console.log('\n🚀 Step 3: Starting deployment...');
    const startCommand = new StartDeploymentCommand({
      appId: APP_ID,
      branchName: BRANCH_NAME,
      jobId: createResponse.jobId
    });

    const startResponse = await client.send(startCommand);
    console.log('✅ Deployment started successfully!');
    console.log(`   Status: ${startResponse.jobSummary.status}`);

    console.log('\n🎉 Deployment Complete!');
    console.log(`\n🔗 Your app URL: https://${BRANCH_NAME}.${APP_ID}.amplifyapp.com`);
    console.log('\n⏳ Please wait 2-3 minutes for build to complete');
    console.log('📊 Check build status: https://console.aws.amazon.com/amplify/home?region=us-east-1#/' + APP_ID);

    console.log('\n🔐 Test Login:');
    console.log('   Username: superadmin');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

deploy();
