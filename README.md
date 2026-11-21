# Arrant HR Solutions — separated full-stack project

This project separates the existing Arrant HR Solutions website into maintainable files while preserving its current UI, page structure, styling, and application behaviour.

## Project structure

```text
arrant_hr_solutions_fullstack/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── tailwind.config.js
│       ├── supabase-config.js
│       └── app.js
├── supabase/
│   └── admin_setup.sql
├── .gitignore
└── README.md
```

## Run locally

1. Extract this ZIP.
2. Open the extracted `arrant_hr_solutions_fullstack` folder in VS Code.
3. Open `index.html` with the VS Code Live Server extension (recommended), or serve the folder with any static web server.
4. Keep the folder structure unchanged; the HTML loads CSS and JavaScript from the relative paths shown above.

## Supabase configuration

The browser-safe Supabase Project URL and publishable key are in `assets/js/supabase-config.js`. The publishable key is designed to be public. **Never place a Supabase `service_role` or `sb_secret_...` key in frontend files.**

The application expects the existing Supabase tables and columns:
- `job_seekers`
- `job_providers`
- `contact_enquiries`
- `job_posters`

It also uses the private `resumes` Storage bucket. The admin setup SQL is provided at `supabase/admin_setup.sql`; review it against your current policies before running it. Do not blindly rerun SQL if policies already exist unless you understand the script's drop-and-recreate behaviour.

## Deploy to Vercel

1. Import this project folder/repository into Vercel.
2. Framework Preset: **Other**.
3. Build Command: leave empty.
4. Output Directory: `.` (project root).
5. Deploy.

This is a static frontend connected directly to Supabase through its browser client. Supabase Auth, Row Level Security, and Storage policies provide the backend access controls. No service-role secret is included.

## Important

- Existing inline styles and application scripts have been moved into separate files; the existing interface and feature logic are retained.
- Keep any images or other assets referenced by the original HTML in their expected relative locations if they are part of your deployment.
- Test candidate registration, resume upload, contact form, employer form, admin login, admin dashboard, and signed resume downloads after deployment.
- A successful code split does not by itself prove the live Supabase policies or administrator credentials are correct. Those must be tested in your Supabase project.
