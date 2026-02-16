import zipfile, os

dist = r'C:\Users\thoma\Downloads\Kidtracker\dist'
out = r'C:\Users\thoma\Downloads\Kidtracker\deploy2.zip'

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist):
        for f in files:
            full = os.path.join(root, f)
            arc = os.path.relpath(full, dist).replace(os.sep, '/')
            zf.write(full, arc)
            print(arc)

print('Done:', out)
