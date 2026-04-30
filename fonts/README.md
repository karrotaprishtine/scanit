# Folder Fonts

Drop your `.ttf`, `.otf`, `.woff`, or `.woff2` files into this `fonts` folder.

Then edit `manifest.json` and list each font you want in the app.

Example:

```json
{
  "fonts": [
    {
      "family": "My Barcode Regular",
      "file": "MyBarcode-Regular.ttf",
      "weight": 400,
      "style": "normal"
    },
    {
      "family": "My Barcode Bold",
      "file": "MyBarcode-Bold.otf",
      "weight": 700,
      "style": "normal"
    }
  ]
}
```

Notes:

- `family` is the name that appears in the app font list.
- `file` is the exact filename inside this folder.
- `weight` is optional, but `400` and `700` are the most useful.
- `style` is usually `normal`. Use `italic` only if the font is italic.

After you upload the site to GitHub Pages, these folder fonts load automatically in the barcode font picker.
