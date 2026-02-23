// Tests whether Lambda correctly stores and returns a photo
// Run: node test-photo-upload.cjs

const API = 'https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api';

// Tiny 1x1 red pixel JPEG in base64 (100 bytes total - definitely under any limit)
const TINY_PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';

async function testPhotoUpload() {
  // Use a known child ID from the daycare
  const DAYCARE_ID = 'a28ec843-4a8b-4bb2-bc4d-7d27f9db6528';

  // First, get a valid child ID
  console.log('Fetching children...');
  const childRes = await fetch(`${API}/children`);
  const children = await childRes.json();
  const daycareChildren = children.filter(c => c.daycare_id === DAYCARE_ID);
  if (daycareChildren.length === 0) {
    console.error('No children found for daycare');
    return;
  }
  const child = daycareChildren[0];
  console.log(`Using child: ${child.first_name} ${child.last_name} (${child.id})\n`);

  // Insert test photo
  console.log(`Sending photo (${TINY_PHOTO.length} chars)...`);
  const insertRes = await fetch(`${API}/activity_photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      child_id: child.id,
      date: '2026-02-23',
      photo: TINY_PHOTO,
      caption: 'test',
      daycare_id: DAYCARE_ID,
    }),
  });

  console.log(`Response status: ${insertRes.status}`);
  const responseText = await insertRes.text();
  console.log(`Response body length: ${responseText.length}`);

  try {
    const row = JSON.parse(responseText);
    console.log(`\nInserted row id: ${row.id}`);
    console.log(`photo field in response: ${row.photo ? row.photo.substring(0, 40) + '...' : 'NULL/EMPTY'}`);
    console.log(`photo field length: ${row.photo?.length || 0}`);

    // Verify by fetching back
    console.log('\nFetching back from DB...');
    const getRes = await fetch(`${API}/activity_photos/${row.id}`);
    const fetched = await getRes.json();
    console.log(`photo in DB: ${fetched.photo ? fetched.photo.substring(0, 40) + '...' : 'NULL/EMPTY'}`);
    console.log(`photo length in DB: ${fetched.photo?.length || 0}`);

    // Clean up
    await fetch(`${API}/activity_photos/${row.id}`, { method: 'DELETE' });
    console.log('\nTest record cleaned up.');
  } catch (e) {
    console.error('Failed to parse response:', responseText.substring(0, 200));
  }
}

testPhotoUpload().catch(err => console.error('Error:', err.message));
