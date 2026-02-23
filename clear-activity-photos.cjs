// Deletes all activity_photos records via the Lambda API
// Run with: node clear-activity-photos.cjs

const API = 'https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api';

async function clearActivityPhotos() {
  console.log('Fetching all activity photos...');
  const res = await fetch(`${API}/activity_photos`);
  if (!res.ok) {
    console.error('Failed to fetch photos:', res.status, await res.text());
    process.exit(1);
  }

  const photos = await res.json();
  console.log(`Found ${photos.length} photo record(s).`);

  if (photos.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  let deleted = 0;
  for (const photo of photos) {
    const del = await fetch(`${API}/activity_photos/${photo.id}`, { method: 'DELETE' });
    if (del.status === 204 || del.ok) {
      deleted++;
      process.stdout.write(`\rDeleted ${deleted}/${photos.length}...`);
    } else {
      console.error(`\nFailed to delete ${photo.id}: ${del.status}`);
    }
  }

  console.log(`\nDone. Deleted ${deleted} record(s).`);
}

clearActivityPhotos().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
