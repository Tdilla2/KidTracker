const { AmplifyClient, CreateDeploymentCommand, StartDeploymentCommand } = require('@aws-sdk/client-amplify');
const fs = require('fs');
const path = require('path');

const APP_ID = 'd2nbsjhv8lzch9';
const BRANCH_NAME = 'main';
const REGION = 'us-east-1';

async function deployToAmplify() {
  console.log('🚀 Starting deployment to AWS Amplify...');

  const client = new AmplifyClient({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    // Read the ZIP file
    const zipPath = path.join(__dirname, 'dist-deploy.zip');
    const zipBuffer = fs.readFileSync(zipPath);

    console.log(`📦 ZIP file size: ${zipBuffer.length} bytes`);

    // Create deployment
    console.log('📤 Creating deployment...');
    const createCommand = new CreateDeploymentCommand({
      appId: APP_ID,
      branchName: BRANCH_NAME,
      fileMap: {
        '/': zipBuffer.toString('base64')
      }
    });

    const createResponse = await client.send(createCommand);
    console.log('✅ Deployment created!');
    console.log('Deployment ID:', createResponse.jobId);

    // Start deployment
    console.log('🎯 Starting deployment...');
    const startCommand = new StartDeploymentCommand({
      appId: APP_ID,
      branchName: BRANCH_NAME,
      jobId: createResponse.jobId
    });

    const startResponse = await client.send(startCommand);
    console.log('✅ Deployment started!');
    console.log('Job Summary:', startResponse.jobSummary);

    console.log('\n🎉 Deployment initiated successfully!');
    console.log(`🔗 Your app will be live at: https://${BRANCH_NAME}.${APP_ID}.amplifyapp.com`);
    console.log('\n⏳ Deployment typically takes 2-3 minutes.');
    console.log('Check status at: https://console.aws.amazon.com/amplify/home?region=us-east-1');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

deployToAmplify();
