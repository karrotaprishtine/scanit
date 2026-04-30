# Barcode & QR Studio - GitHub Pages Version

This folder is a separate online-ready copy of your app.

Use this folder when you want to host the app for free on GitHub Pages and open it from anywhere.

## What To Upload

Upload everything inside this folder:

- `index.html`
- `styles.css`
- `app.js`
- `vendor/`
- `fonts/`
- `.nojekyll`

## GitHub Pages Steps

1. Create a new GitHub repository.
2. Upload the full contents of this folder to the repository root.
3. Open the repository on GitHub.
4. Go to `Settings` -> `Pages`.
5. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
6. Save.
7. GitHub will give you a link like:
   - `https://yourname.github.io/your-repo-name/`

## Custom Fonts

Put your `.ttf` or `.otf` files in `fonts/`, then edit `fonts/manifest.json`.

The online app loads those folder fonts automatically.

The `Load this PC fonts` button is separate:

- it tries to read fonts installed on the current computer
- some browsers allow it
- some browsers block it

So for reliable use everywhere, the best option is:

- keep your own fonts inside `fonts/`
- list them in `fonts/manifest.json`

## Important

This GitHub Pages version is separate from your local single-file app.

Your local offline file stays here and is unchanged:

- `C:\Users\PC\Documents\Barcode\barcode-qr-studio.html`
