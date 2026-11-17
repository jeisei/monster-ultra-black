# Deployment

## Netlify

The repository includes `netlify.toml`:

- Node.js: 24
- Build command: `npm run build`
- Publish directory: `dist`

To enable continuous deployment, import the GitHub repository in Netlify and select `main`. Netlify supplies the site origin through `URL`; `vite.config.ts` uses it for canonical and Open Graph URLs. `SITE_URL`, when set, takes precedence.

For a manual deployment with the Netlify CLI:

```sh
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
```

Run `npm run check` and `npm run test:browser` before deploying. A manual upload does not automatically enable deployment from GitHub pushes.

## Other static hosts

Set `SITE_URL` to the final HTTPS origin, then build and upload only the contents of `dist/` at the domain root. For example, in PowerShell:

```powershell
$env:SITE_URL = 'https://your-domain.example/'
npm run build
```

Replace the example domain with the real address. Without a configured origin, local builds omit canonical metadata and use a relative social-image path.

Serve GLB, WOFF2, SVG, PNG, CSS and JS as static files. Enable gzip or Brotli. Hashed files under `/assets/` can be cached immutably; `index.html` must be revalidated. Model and image filenames are not hashed, so do not apply immutable caching to them without versioning their names.

## Release checks

- Check the public page, label deep link, replay link and model request over HTTPS.
- Inspect the social preview and canonical URL after the final domain is known.
- Check Safari on an iPhone using mobile data as well as Wi-Fi.
- Keep the independent-concept disclaimer. Label values remain concept-artwork transcriptions unless verified against a specific regional package.

The large Three.js chunk is loaded separately from the initial page. Vite's chunk-size warning is expected and has not been suppressed.
