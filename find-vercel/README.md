# FIND. — Vercel deployment

A browser-first version of FIND., with serverless endpoints `/api/status` and `/api/search`. No local Node installation is needed.

1. Create a GitHub repository and upload the four files/folders in this project, keeping `api/status.js` and `api/search.js` inside the `api` directory.
2. In Vercel choose Add New > Project, import the GitHub repository, select Other (or no framework preset), and deploy.
3. Under Project Settings > Environment Variables add `SERPAPI_KEY` to Production. Never put the secret key in index.html or GitHub.
4. Redeploy from Deployments (environment variables are applied to the next deployment).
5. Open `/api/status` on your live URL. The response should say `configured:true`, then test Live Discovery in the interface.

Prices are best-effort indexed Google Shopping offers, not reliable product feeds; availability and sizing must be verified at the retailer. Search calls can incur SerpApi costs. There is no authentication/rate limiting on the prototype, so avoid public sharing until these are added.
