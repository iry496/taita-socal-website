# TAITA SoCal Website

Official website for the Southern California chapter of the Taiwanese American Industrial Technology Association.

## Local preview

Serve the `public` directory with any static web server, then open `index.html`
in a browser. For example:

```sh
python3 -m http.server 8000 --directory public
```

To test the Cloudflare contact endpoint locally, run Wrangler with a simulated
recipient binding:

```sh
npx wrangler dev --var CONTACT_RECIPIENT:test@example.com
```

The production site is published from the `main` branch through Cloudflare
Workers Builds. Static assets remain free; only requests to `/api/contact`
invoke the Worker. Production requires the `CONTACT_RECIPIENT` Worker variable
to contain a verified Cloudflare Email Routing destination address.

The root `index.html` is a compatibility redirect for the legacy GitHub Pages
URL; the production assets live in `public/`.
