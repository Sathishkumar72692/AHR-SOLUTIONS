// =========================================================================
        // 1. SUPABASE BACKEND CONFIGURATION & SCHEMA
        // =========================================================================
        // Replace these two placeholders with your actual Supabase Project URL & Anon Key,
        // or configure them directly inside the Admin Portal -> "Configure Supabase Credentials".

const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- ARRANT HR SOLUTIONS - SUPABASE DATABASE & STORAGE SCHEMA
-- Run this script in your Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Visitor Contact Enquiries Table
CREATE TABLE IF NOT EXISTS public.contact_enquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'New',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Job Seekers Applications Table
CREATE TABLE IF NOT EXISTS public.job_seekers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INTEGER NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL,
    qualification TEXT NOT NULL,
    location TEXT NOT NULL,
    resume_url TEXT,
    resume_name TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Job Providers (Employers / Agencies) Table
CREATE TABLE IF NOT EXISTS public.job_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_name TEXT,
    company_name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    location TEXT NOT NULL,
    job_description TEXT NOT NULL,
    last_date DATE,
    contact_info TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Job Posters Board Table
CREATE TABLE IF NOT EXISTS public.job_posters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    img_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_seekers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_posters ENABLE ROW LEVEL SECURITY;

-- Public Insert Policies (Visitors can submit enquiries & applications)
CREATE POLICY "Public insert enquiries" ON public.contact_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert seekers" ON public.job_seekers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert providers" ON public.job_providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read job posters" ON public.job_posters FOR SELECT USING (true);

-- 6. Create a PRIVATE Storage bucket for Candidate Resumes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 5242880, ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880;

-- Public INSERT policies above are for registration forms only.
-- Do not add public SELECT policies or unrestricted admin policies.
-- Run arrant_hr_supabase_secure_admin_setup.sql to configure the admin allowlist,
-- administrator-only record access, and private resume Storage policies.`;

        let supabaseClient = null;
        let isSupabaseConnected = false;

        // In-memory store synchronized with window.name so demo testing works seamlessly even before Supabase keys are entered
        let appStore = {
            enquiries: [],
            seekers: [],
            providers: [],
            posters: [
                { id: '1', title: "Software Engineer", img: "job-poster-1.svg" },
                { id: '2', title: "HR Executive", img: "job-poster-2.svg" },
                { id: '3', title: "Digital Marketing Executive", img: "job-poster-3.svg" },
                { id: '4', title: "Mechanical Design Engineer", img: "job-poster-4.svg" },
                { id: '5', title: "Accountant", img: "job-poster-5.svg" },
                { id: '6', title: "Customer Support Associate", img: "job-poster-6.svg" },
                { id: '7', title: "Talent Acquisition Specialist", img: "job-poster-7.svg" },
                { id: '8', title: "Sales Executive", img: "job-poster-8.svg" },
                { id: '9', title: "Civil Site Engineer", img: "job-poster-9.svg" },
                { id: '10', title: "Data Analyst", img: "job-poster-10.svg" }
            ],
            sbUrl: DEFAULT_SUPABASE_URL,
            sbKey: DEFAULT_SUPABASE_ANON_KEY,
            adminAuthenticated: false
        };

        function loadSessionStore() {
            try {
                if (window.name && window.name.startsWith('ARRANT_HR_STATE:')) {
                    const parsed = JSON.parse(window.name.replace('ARRANT_HR_STATE:', ''));
                    // Always use the current deployment's configured project credentials.
                    // Ignore stale browser-stored values from previous Supabase projects.
                }
            } catch (e) {
                console.warn('Could not restore Supabase configuration:', e);
            }
            // Authentication and personal records are never restored from window.name.
            appStore.adminAuthenticated = false;
            appStore.enquiries = [];
            appStore.seekers = [];
            appStore.providers = [];
        }

        function saveSessionStore() {
            try {
                // Only the public project URL and browser-safe publishable key are persisted.
                // Never store candidate data, resumes, passwords, or auth tokens here.
                window.name = 'ARRANT_HR_STATE:' + JSON.stringify({
                    sbUrl: appStore.sbUrl,
                    sbKey: appStore.sbKey
                });
            } catch (e) {
                console.warn('Could not save Supabase configuration:', e);
            }
        }

        function initSupabase() {
            loadSessionStore();
            const url = appStore.sbUrl;
            const key = appStore.sbKey;

            const sqlEl = document.getElementById('supabase-sql-code');
            if (sqlEl) sqlEl.textContent = SUPABASE_SQL_SCHEMA;

            if (url && key && !url.includes('YOUR_PROJECT_ID') && !key.includes('sb_publishable_tUcNfssRhEEAF7q2kG-Zsg_HDfC64Hq') && window.supabase) {
                try {
                    supabaseClient = window.supabase.createClient(url, key);
                    isSupabaseConnected = true;
                    updateSupabaseStatusUI(true);
                } catch (err) {
                    isSupabaseConnected = false;
                    updateSupabaseStatusUI(false);
                }
            } else {
                isSupabaseConnected = false;
                updateSupabaseStatusUI(false);
            }
        }

        function updateSupabaseStatusUI(connected) {
            const badge = document.getElementById('sb-status-badge');
            if (!badge) return;
            if (connected) {
                badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Supabase client configured`;
            } else {
                badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30";
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Ready for Supabase (Configure Keys in Setup)`;
            }
        }

        function showToast(message, isError = false) {
            const toast = document.getElementById('global-toast');
            const msgEl = document.getElementById('toast-message');
            const iconEl = document.getElementById('toast-icon');
            if (!toast || !msgEl) return;

            msgEl.textContent = message;
            iconEl.className = isError
                ? "fa-solid fa-circle-exclamation text-red-400 text-xl"
                : "fa-solid fa-circle-check text-emerald-400 text-xl";

            toast.classList.remove('hidden');
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-4', 'opacity-0');
            });

            setTimeout(() => {
                toast.classList.add('translate-y-4', 'opacity-0');
                setTimeout(() => toast.classList.add('hidden'), 300);
            }, 3500);
        }

        // =========================================================================
        // 2. FRONTEND FORM SUBMISSIONS -> SUPABASE BACKEND
        // =========================================================================
        async function handleContactSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = document.getElementById('contact-submit-btn');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending...`;
            try {
                if (!isSupabaseConnected || !supabaseClient) throw new Error('The website is not connected to Supabase. Please try again later.');
                const formData = new FormData(form);
                const { error } = await supabaseClient.from('contact_enquiries').insert([{
                    name: String(formData.get('name') || '').trim(),
                    email: String(formData.get('email') || '').trim(),
                    subject: String(formData.get('subject') || '').trim(),
                    message: String(formData.get('message') || '').trim(),
                    status: 'New'
                }]);
                if (error) throw error;
                showMessage('Message sent successfully! We will get back to you shortly.', 'contact-alert', '#contact-form');
                showToast('Your enquiry was saved successfully.');
                form.reset();
                if (appStore.adminAuthenticated) await refreshAdminData();
            } catch (err) {
                showToast('Error sending enquiry: ' + (err.message || 'Unknown error'), true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        }

        async function handleSeekerSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = document.getElementById('seeker-submit-btn');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Application...`;
            let uploadedPath = null;
            try {
                if (!isSupabaseConnected || !supabaseClient) throw new Error('The website is not connected to Supabase. Please try again later.');
                const formData = new FormData(form);
                const fileInput = document.getElementById('seeker-resume-file');
                const file = fileInput?.files?.[0] || null;
                let resumeUrl = null;
                const resumeName = file ? file.name : null;

                if (file) {
                    const allowedTypes = [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ];
                    if (file.size > 5 * 1024 * 1024) throw new Error('Resume must be 5 MB or smaller.');
                    if (!allowedTypes.includes(file.type)) throw new Error('Only PDF, DOC and DOCX resumes are allowed.');
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    uploadedPath = `${crypto.randomUUID()}/${safeName}`;
                    const { error: uploadError } = await supabaseClient.storage.from('resumes').upload(uploadedPath, file, {
                        contentType: file.type,
                        upsert: false
                    });
                    if (uploadError) throw uploadError;
                    resumeUrl = uploadedPath;
                }

                const { error } = await supabaseClient.from('job_seekers').insert([{
                    first_name: String(formData.get('first_name') || '').trim(),
                    last_name: String(formData.get('last_name') || '').trim(),
                    email: String(formData.get('email') || '').trim(),
                    phone: String(formData.get('phone') || '').trim(),
                    age: parseInt(formData.get('age'), 10),
                    dob: formData.get('dob'),
                    gender: formData.get('gender'),
                    qualification: String(formData.get('qualification') || '').trim(),
                    location: String(formData.get('location') || '').trim(),
                    resume_url: resumeUrl,
                    resume_name: resumeName,
                    status: 'Pending'
                }]);
                if (error) throw error;

                showMessage('Job Seeker registration successful! Your application has been recorded.', 'seeker-alert', '#seeker-form');
                showToast('Your application was saved successfully.');
                form.reset();
                if (appStore.adminAuthenticated) await refreshAdminData();
            } catch (err) {
                if (uploadedPath && supabaseClient) {
                    await supabaseClient.storage.from('resumes').remove([uploadedPath]).catch(() => {});
                }
                showToast('Registration failed: ' + (err.message || 'Unknown error'), true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        }

        async function handleProviderSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const btn = document.getElementById('provider-submit-btn');
            const origText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Request...`;
            try {
                if (!isSupabaseConnected || !supabaseClient) throw new Error('The website is not connected to Supabase. Please try again later.');
                const formData = new FormData(form);
                const { error } = await supabaseClient.from('job_providers').insert([{
                    agency_name: String(formData.get('agency_name') || '').trim(),
                    company_name: String(formData.get('company_name') || '').trim(),
                    job_type: String(formData.get('job_type') || '').trim(),
                    location: String(formData.get('location') || '').trim(),
                    job_description: String(formData.get('job_description') || '').trim(),
                    last_date: formData.get('last_date') || null,
                    contact_info: String(formData.get('contact_info') || '').trim(),
                    status: 'Active'
                }]);
                if (error) throw error;
                showMessage('Job Provider registration successful! Our recruitment team will reach out.', 'provider-alert', '#provider-form');
                showToast('Your job requirement was saved successfully.');
                form.reset();
                if (appStore.adminAuthenticated) await refreshAdminData();
            } catch (err) {
                showToast('Submission failed: ' + (err.message || 'Unknown error'), true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = origText;
            }
        }

        // =========================================================================
        // 3. ADMIN PORTAL AUTHENTICATION & CRUD OPERATIONS
        // =========================================================================
        async function handleAdminLogin(event) {
            event.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;
            if (!isSupabaseConnected || !supabaseClient) {
                showToast('Connect Supabase before signing in.', true);
                return;
            }
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                const { data: isAdmin, error: roleError } = await supabaseClient.rpc('is_admin');
                if (roleError) throw roleError;
                if (!data?.user || isAdmin !== true) {
                    await supabaseClient.auth.signOut();
                    throw new Error('This account is not authorized to access the administrator portal.');
                }
                appStore.adminAuthenticated = true;
                showAdminDashboard();
                showToast('Administrator login successful.');
            } catch (err) {
                appStore.adminAuthenticated = false;
                document.getElementById('admin-dashboard').classList.add('hidden');
                document.getElementById('admin-login-box').classList.remove('hidden');
                showToast('Login failed: ' + (err.message || 'Check your credentials.'), true);
            }
        }

        async function handleAdminLogout() {
            if (supabaseClient) await supabaseClient.auth.signOut();
            appStore.adminAuthenticated = false;
            appStore.enquiries = [];
            appStore.seekers = [];
            appStore.providers = [];
            document.getElementById('admin-dashboard').classList.add('hidden');
            document.getElementById('admin-login-box').classList.remove('hidden');
            showToast('Logged out of Admin Portal.');
        }

        async function showAdminDashboard() {
            document.getElementById('admin-login-box').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
            await refreshAdminData();
        }

        async function refreshAdminData() {
            if (!isSupabaseConnected || !supabaseClient) {
                appStore.adminAuthenticated = false;
                document.getElementById('admin-dashboard').classList.add('hidden');
                document.getElementById('admin-login-box').classList.remove('hidden');
                return;
            }
            try {
                const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
                if (userError || !userResult?.user) throw new Error('Your session has expired. Please sign in again.');
                const { data: isAdmin, error: roleError } = await supabaseClient.rpc('is_admin');
                if (roleError) throw roleError;
                if (isAdmin !== true) throw new Error('Administrator access is not authorized.');

                const [enqRes, seekRes, provRes, postRes] = await Promise.all([
                    supabaseClient.from('contact_enquiries').select('*').order('created_at', { ascending: false }),
                    supabaseClient.from('job_seekers').select('*').order('created_at', { ascending: false }),
                    supabaseClient.from('job_providers').select('*').order('created_at', { ascending: false }),
                    supabaseClient.from('job_posters').select('*').order('created_at', { ascending: false })
                ]);
                for (const result of [enqRes, seekRes, provRes, postRes]) if (result.error) throw result.error;
                appStore.enquiries = enqRes.data || [];
                appStore.seekers = await Promise.all((seekRes.data || []).map(async item => {
                    if (!item.resume_url) return { ...item, resume_signed_url: '' };
                    const { data, error } = await supabaseClient.storage.from('resumes').createSignedUrl(item.resume_url, 300);
                    return { ...item, resume_signed_url: error ? '' : data.signedUrl };
                }));
                appStore.providers = provRes.data || [];
                if (postRes.data) appStore.posters = postRes.data.map(p => ({ id: p.id, title: p.title, img: p.img_url }));
                appStore.adminAuthenticated = true;
                renderAdminTables();
                renderJobPosters();
            } catch (err) {
                console.error('Admin data loading failed:', err);
                appStore.adminAuthenticated = false;
                document.getElementById('admin-dashboard').classList.add('hidden');
                document.getElementById('admin-login-box').classList.remove('hidden');
                showToast(err.message || 'Unable to load administrator data.', true);
            }
        }

        function renderAdminTables() {
            document.getElementById('kpi-enquiries').textContent = appStore.enquiries.length;
            document.getElementById('kpi-seekers').textContent = appStore.seekers.length;
            document.getElementById('kpi-providers').textContent = appStore.providers.length;
            document.getElementById('kpi-jobs').textContent = appStore.posters.length;

            // 1. Render Enquiries
            const enqBody = document.getElementById('enquiries-table-body');
            if (appStore.enquiries.length === 0) {
                enqBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400">No enquiries recorded yet.</td></tr>`;
            } else {
                enqBody.innerHTML = appStore.enquiries.map(item => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="py-3.5 px-4 font-semibold text-navy-900">${escapeHtml(item.name)}</td>
                        <td class="py-3.5 px-4 text-brandBlue-600">${escapeHtml(item.email)}</td>
                        <td class="py-3.5 px-4 font-medium">${escapeHtml(item.subject)}</td>
                        <td class="py-3.5 px-4 text-gray-600 max-w-xs truncate" title="${escapeHtml(item.message)}">${escapeHtml(item.message)}</td>
                        <td class="py-3.5 px-4">
                            <select onchange="updateRecordStatus('contact_enquiries', '${item.id}', this.value)" class="px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-white">
                                <option value="New" ${item.status === 'New' ? 'selected' : ''}>New</option>
                                <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            </select>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                            <button onclick="deleteAdminRecord('contact_enquiries', '${item.id}')" class="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // 2. Render Job Seekers
            const seekBody = document.getElementById('seekers-table-body');
            if (appStore.seekers.length === 0) {
                seekBody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-gray-400">No job seeker applications recorded yet.</td></tr>`;
            } else {
                seekBody.innerHTML = appStore.seekers.map(item => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="py-3.5 px-4 font-semibold text-navy-900">${escapeHtml(item.first_name)} ${escapeHtml(item.last_name)}</td>
                        <td class="py-3.5 px-4">
                            <div class="text-brandBlue-600">${escapeHtml(item.email)}</div>
                            <div class="text-xs text-gray-500">${escapeHtml(item.phone)}</div>
                        </td>
                        <td class="py-3.5 px-4 text-gray-600">${escapeHtml(String(item.age))} yrs • ${escapeHtml(item.gender)}</td>
                        <td class="py-3.5 px-4 font-medium">${escapeHtml(item.qualification)}</td>
                        <td class="py-3.5 px-4 text-gray-600">${escapeHtml(item.location)}</td>
                        <td class="py-3.5 px-4">
                            ${item.resume_signed_url
                                ? `<a href="${escapeHtml(item.resume_signed_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brandBlue-50 text-brandBlue-600 hover:bg-brandBlue-100 text-xs font-semibold"><i class="fa-solid fa-file-arrow-down"></i> ${escapeHtml(item.resume_name || 'Resume')}</a>`
                                : `<span class="text-xs text-gray-500">${escapeHtml(item.resume_name || 'No resume attached')}</span>`}
                        </td>
                        <td class="py-3.5 px-4">
                            <select onchange="updateRecordStatus('job_seekers', '${item.id}', this.value)" class="px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200 bg-white">
                                <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Shortlisted" ${item.status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                                <option value="Interviewed" ${item.status === 'Interviewed' ? 'selected' : ''}>Interviewed</option>
                                <option value="Placed" ${item.status === 'Placed' ? 'selected' : ''}>Placed</option>
                            </select>
                        </td>
                        <td class="py-3.5 px-4 text-right">
                            <button onclick="deleteAdminRecord('job_seekers', '${item.id}')" class="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // 3. Render Job Providers
            const provBody = document.getElementById('providers-table-body');
            if (appStore.providers.length === 0) {
                provBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400">No job provider requests recorded yet.</td></tr>`;
            } else {
                provBody.innerHTML = appStore.providers.map(item => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${new Date(item.created_at).toLocaleDateString()}</td>
                        <td class="py-3.5 px-4">
                            <div class="font-semibold text-navy-900">${escapeHtml(item.company_name)}</div>
                            ${item.agency_name ? `<div class="text-xs text-gray-500">Agency: ${escapeHtml(item.agency_name)}</div>` : ''}
                        </td>
                        <td class="py-3.5 px-4">
                            <span class="inline-block px-2 py-0.5 bg-blue-50 text-brandBlue-600 rounded text-xs font-semibold">${escapeHtml(item.job_type)}</span>
                            <div class="text-xs text-gray-500 mt-1">${escapeHtml(item.location)}</div>
                        </td>
                        <td class="py-3.5 px-4 text-gray-600 max-w-xs truncate" title="${escapeHtml(item.job_description)}">${escapeHtml(item.job_description)}</td>
                        <td class="py-3.5 px-4 text-gray-600 whitespace-nowrap">${item.last_date ? escapeHtml(item.last_date) : 'Open'}</td>
                        <td class="py-3.5 px-4 font-medium text-brandBlue-600">${escapeHtml(item.contact_info)}</td>
                        <td class="py-3.5 px-4 text-right">
                            <button onclick="deleteAdminRecord('job_providers', '${item.id}')" class="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // 4. Render Admin Posters Management Grid
            const postersList = document.getElementById('admin-posters-list');
            postersList.innerHTML = appStore.posters.map((p, idx) => `
                <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)}" class="w-14 h-14 rounded-lg object-cover bg-white border border-gray-200 flex-shrink-0" onerror="this.src='https://placehold.co/100x100/0066cc/ffffff?text=Job'">
                        <div class="truncate">
                            <h4 class="font-bold text-navy-900 text-sm truncate">${escapeHtml(p.title)}</h4>
                            <p class="text-xs text-gray-500 truncate">${escapeHtml(p.img)}</p>
                        </div>
                    </div>
                    <button onclick="deleteJobPoster('${p.id || idx}')" class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 flex-shrink-0" title="Remove Poster">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        async function updateRecordStatus(table, id, newStatus) {
            if (isSupabaseConnected && supabaseClient) {
                const { error } = await supabaseClient.from(table).update({ status: newStatus }).eq('id', id);
                if (error) {
                    showToast('Failed to update status: ' + error.message, true);
                    return;
                }
            }
            const map = { contact_enquiries: 'enquiries', job_seekers: 'seekers', job_providers: 'providers' };
            const list = appStore[map[table]] || [];
            const found = list.find(r => String(r.id) === String(id));
            if (found) found.status = newStatus;
            saveSessionStore();
            showToast('Status updated to ' + newStatus);
        }

        async function deleteAdminRecord(table, id) {
            if (isSupabaseConnected && supabaseClient) {
                const { error } = await supabaseClient.from(table).delete().eq('id', id);
                if (error) {
                    showToast('Delete failed: ' + error.message, true);
                    return;
                }
            }
            const map = { contact_enquiries: 'enquiries', job_seekers: 'seekers', job_providers: 'providers' };
            const key = map[table];
            appStore[key] = appStore[key].filter(r => String(r.id) !== String(id));
            saveSessionStore();
            renderAdminTables();
            showToast('Record deleted');
        }

        async function deleteJobPoster(idOrIdx) {
            if (isSupabaseConnected && supabaseClient) {
                await supabaseClient.from('job_posters').delete().eq('id', idOrIdx);
            }
            appStore.posters = appStore.posters.filter((p, idx) => String(p.id || idx) !== String(idOrIdx));
            saveSessionStore();
            renderAdminTables();
            renderJobPosters();
            showToast('Job poster removed');
        }

        function switchAdminTab(tabName) {
            document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.add('hidden'));
            document.getElementById('admin-tab-' + tabName).classList.remove('hidden');

            document.querySelectorAll('.admin-tab-btn').forEach(btn => {
                btn.className = "admin-tab-btn px-5 py-3 rounded-t-xl font-semibold text-sm text-gray-600 hover:text-navy-900";
            });
            const activeBtn = document.getElementById('tab-btn-' + tabName);
            activeBtn.className = "admin-tab-btn px-5 py-3 rounded-t-xl font-semibold text-sm bg-white text-brandBlue-600 border-t border-x border-gray-200 -mb-px";
        }

        function filterAdminTable(tbodyId, queryText) {
            const q = queryText.toLowerCase();
            const rows = document.querySelectorAll(`#${tbodyId} tr`);
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        }

        function toggleSupabaseConfigModal() {
            const modal = document.getElementById('supabase-config-modal');
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                document.getElementById('sb-url-input').value = appStore.sbUrl.includes('YOUR_PROJECT_ID') ? '' : appStore.sbUrl;
                document.getElementById('sb-key-input').value = appStore.sbKey.includes('sb_publishable_tUcNfssRhEEAF7q2kG-Zsg_HDfC64Hq') ? '' : appStore.sbKey;
            }
        }

        function saveSupabaseCredentials(event) {
            event.preventDefault();
            appStore.sbUrl = document.getElementById('sb-url-input').value.trim();
            appStore.sbKey = document.getElementById('sb-key-input').value.trim();
            saveSessionStore();
            initSupabase();
            toggleSupabaseConfigModal();
            showToast(isSupabaseConnected ? 'Supabase client configured. Connection will be verified on use.' : 'Supabase configuration failed. Check URL and Publishable key.', !isSupabaseConnected);
            if (appStore.adminAuthenticated) refreshAdminData();
        }

        function copySqlSchema() {
            const textarea = document.createElement('textarea');
            textarea.value = SUPABASE_SQL_SCHEMA;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Supabase SQL Schema copied to clipboard!');
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // =========================================================================
        // 4. FULL-STACK ZIP ARCHIVE GENERATOR (Client-Side Download)
        // =========================================================================
        async function downloadFullStackZip() {
            if (typeof JSZip === 'undefined') {
                showToast('ZIP generator is still loading, please try again in a second.', true);
                return;
            }

            showToast('Generating Full-Stack ZIP package...');
            const zip = new JSZip();

            // 1. Main Full-Stack HTML Application
            const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
            zip.file('index.html', fullHtml);

            // 2. Supabase SQL Migration File
            zip.file('supabase/schema.sql', SUPABASE_SQL_SCHEMA);

            // 3. Environment Template
            zip.file('.env.example', `SUPABASE_URL=${appStore.sbUrl}\nSUPABASE_PUBLISHABLE_KEY=sb_publishable_tUcNfssRhEEAF7q2kG-Zsg_HDfC64Hq\n`);

            // 4. Standalone Supabase Client Module (for modular deployments)
            const sbConfigJs = `// Supabase Backend Configuration for Arrant HR Solutions
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = '${appStore.sbUrl}';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tUcNfssRhEEAF7q2kG-Zsg_HDfC64Hq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
`;
            zip.file('js/supabase-client.js', sbConfigJs);

            // 5. Deployment & Setup README
            const readmeMd = `# Arrant HR Solutions - Full-Stack Web Application (Supabase Backend)

## Project Structure
- \`index.html\` - Complete responsive frontend + Admin Portal + Supabase integration (preserves original UI/UX).
- \`supabase/schema.sql\` - SQL script to create tables (\`contact_enquiries\`, \`job_seekers\`, \`job_providers\`, \`job_posters\`), Row-Level Security (RLS) policies, and the \`resumes\` storage bucket.
- \`js/supabase-client.js\` - Standalone ES module configuration for Supabase.
- \`.env.example\` - Environment variable reference.

## Quick Setup Guide
1. **Create a Supabase Project** at [https://supabase.com](https://supabase.com).
2. **Run the Database Schema**:
   - Open your Supabase Dashboard -> **SQL Editor**.
   - Paste the contents of \`supabase/schema.sql\` and click **Run**.
3. **Create an Admin User**:
   - Go to **Authentication -> Users -> Add User** and create your admin login (e.g., \`arrant.hr@gmail.com\`).
4. **Connect the Frontend**:
   - Open \`index.html\`, navigate to **Admin** in the top navigation bar, click **Configure Supabase Credentials**, and enter your **Project URL** and **Publishable Key** (or paste them directly into \`DEFAULT_SUPABASE_URL\` and \`DEFAULT_SUPABASE_ANON_KEY\` inside \`index.html\`).
5. **Host Anywhere**:
   - Upload the files (along with your local image assets like \`AHR.png\`, \`ceo-photo.jpg\`, gallery images, and job posters) to Vercel, Netlify, GitHub Pages, or any web server.
`;
            zip.file('README.md', readmeMd);

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'arrant-hr-solutions-fullstack-supabase.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Downloaded arrant-hr-solutions-fullstack-supabase.zip!');
        }

        // =========================================================================
        // 5. ORIGINAL FRONTEND NAVIGATION, COUNTERS, COUNSELLING & GALLERY LOGIC
        // =========================================================================
        document.getElementById('year').textContent = new Date().getFullYear();

        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const icon = btn.querySelector('i');

        btn.addEventListener('click', () => {
            menu.classList.toggle('open');
            if (menu.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });

        // Counselling reflection: supportive guidance, not a definitive character assessment.
        const counsellingForm = document.getElementById('counselling-form');
        if (counsellingForm) {
            counsellingForm.addEventListener('submit', function(event) {
                event.preventDefault();
                if (!counsellingForm.reportValidity()) return;
                const answers = new FormData(counsellingForm);
                const selected = Array.from(answers.values()).map(Number);
                const themes = {
                    0: { title: 'The thoughtful collaborator', text: 'You may value listening, cooperation, and shared understanding. Keep making space for your own ideas too, and practise stating your needs clearly.' },
                    1: { title: 'The organised planner', text: 'You may feel comfortable creating structure and working toward clear outcomes. Leave room for flexibility, and remember that a plan can be adjusted without being a failure.' },
                    2: { title: 'The independent problem-solver', text: 'You may enjoy autonomy and taking ownership. Check in with others when useful; asking for a second perspective can strengthen rather than reduce your independence.' },
                    3: { title: 'The curious innovator', text: 'You may be energised by ideas, experimentation, and fresh approaches. Pair creativity with small milestones so promising ideas can become achievable results.' }
                };
                const counts = [0,0,0,0];
                selected.forEach((answer) => {
                    counts[answer]++;
                });
                const top = Math.max(...counts);
                const dominant = counts.map((n,i)=>({n,i})).filter(x=>x.n===top).map(x=>themes[x.i]);
                const growthTips = [
                    'Choose one small goal for this week and write down the first action you can take.',
                    'Ask a trusted person for specific feedback on one skill you want to improve.',
                    'At the end of each day, note one thing that went well and one thing you learned.',
                    'Break a challenging task into a 20-minute first step, then review your progress.'
                ];
                const tip = growthTips[selected.reduce((sum,v)=>sum+v,0) % growthTips.length];
                const result = document.getElementById('counselling-result');
                result.innerHTML = `
                    <div class="flex items-center gap-3 mb-5"><div class="w-12 h-12 rounded-xl bg-blue-50 text-brandBlue-600 flex items-center justify-center text-2xl"><i class="fa-solid fa-compass"></i></div><div><p class="text-sm uppercase tracking-wide text-brandBlue-600 font-bold">Your reflection summary</p><h3 class="text-2xl font-bold text-navy-900">A starting point for growth</h3></div></div>
                    <p class="text-gray-600 mb-5">These are possible preferences suggested by your choices, not fixed labels. People respond differently across situations, and every style has strengths.</p>
                    <h4 class="font-bold text-navy-900 mb-3">Themes to explore</h4>
                    <div class="grid gap-3 mb-6">${dominant.map(item=>`<div class="p-4 rounded-xl bg-blue-50 border border-blue-100"><h5 class="font-bold text-navy-900 mb-1">${item.title}</h5><p class="text-sm text-gray-700 leading-relaxed">${item.text}</p></div>`).join('')}</div>
                    <div class="rounded-xl border border-gray-200 p-5 mb-5"><h4 class="font-bold text-navy-900 mb-2"><i class="fa-solid fa-seedling text-green-600 mr-2"></i>Your next small step</h4><p class="text-gray-700">${tip}</p></div>
                    <div class="rounded-xl bg-gray-50 p-5"><h4 class="font-bold text-navy-900 mb-2">Reflection prompts</h4><ul class="list-disc pl-5 space-y-2 text-sm text-gray-700"><li>Which part of this summary feels most like you, and which part does not?</li><li>What is one strength you can use more often at work or in study?</li><li>What specific support would help you make progress?</li></ul></div>
                    <p class="text-xs text-gray-500 mt-5">Your answers are processed in this page in your browser and are not submitted to a server by this feature. For important career, relationship, or emotional concerns, consider speaking with a qualified counsellor.</p>
                    <div class="mt-6 flex flex-wrap gap-3"><button type="button" onclick="window.print()" class="px-5 py-3 rounded-lg bg-navy-900 text-white font-semibold hover:bg-navy-800"><i class="fa-solid fa-print mr-2"></i>Print Summary</button><button type="button" onclick="document.getElementById('counselling-result').classList.add('hidden'); document.getElementById('counselling-form').scrollIntoView({behavior:'smooth'});" class="px-5 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">Review Answers</button></div>`;
                result.classList.remove('hidden');
                result.scrollIntoView({behavior:'smooth', block:'start'});
            });
            counsellingForm.addEventListener('reset', function() {
                const result = document.getElementById('counselling-result');
                if (result) { result.classList.add('hidden'); result.innerHTML = ''; }
            });
        }

        // Navigation Logic (SPA Routing)
        function navigateTo(pageId) {
            const target = document.getElementById(pageId);
            if (!target) return;

            const current = document.querySelector('.page-section.active');
            const loader = document.getElementById('page-loader');
            const loaderMessage = document.getElementById('loader-message');

            if (current && current.id === pageId) {
                if (menu.classList.contains('open')) {
                    menu.classList.remove('open');
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
                return;
            }

            const pageNames = {
                home: 'Home', about: 'About Us', services: 'Services', gallery: 'Gallery',
                jobs: 'Jobs', register: 'Registration', counselling: 'Counselling', contact: 'Contact Us',
                admin: 'Admin Portal'
            };
            loaderMessage.textContent = 'Loading ' + (pageNames[pageId] || 'page') + '...';
            loader.classList.add('is-visible');
            loader.setAttribute('aria-hidden', 'false');

            window.setTimeout(() => {
                document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
                target.classList.add('active');

                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active', 'text-brandBlue-500', 'font-semibold');
                    link.classList.add('text-gray-600');
                    if (link.getAttribute('href') === '#' + pageId) {
                        link.classList.add('active', 'text-brandBlue-500');
                        link.classList.remove('text-gray-600');
                    }
                });

                document.querySelectorAll('.mobile-nav-link').forEach(link => {
                    link.classList.remove('text-brandBlue-500', 'bg-gray-50');
                    link.classList.add('text-gray-700');
                    if (link.getAttribute('href') === '#' + pageId) {
                        link.classList.add('text-brandBlue-500', 'bg-gray-50');
                        link.classList.remove('text-gray-700');
                    }
                });

                if (menu.classList.contains('open')) {
                    menu.classList.remove('open');
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }

                target.querySelectorAll('.animate-slide-up').forEach(el => {
                    el.classList.remove('animate-slide-up');
                    void el.offsetWidth;
                    el.classList.add('animate-slide-up');
                });

                window.scrollTo({ top: 0, behavior: 'auto' });

                if (pageId === 'home') {
                    animateCounters();
                } else if (pageId === 'gallery') {
                    populateGallery();
                } else if (pageId === 'jobs') {
                    renderJobPosters();
                } else if (pageId === 'admin') {
                    // The admin dashboard is shown only after Supabase Auth + allowlist verification.
                }

                history.pushState(null, null, '#' + pageId);

                window.setTimeout(() => {
                    loader.classList.remove('is-visible');
                    loader.setAttribute('aria-hidden', 'true');
                }, 450);
            }, 220);
        }

        // Stats Counter Animation
        let countersAnimated = false;
        function animateCounters() {
            if (countersAnimated) return;
            
            const counters = document.querySelectorAll('.counter');
            const speed = 150;

            counters.forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const inc = target / speed;

                const updateCount = () => {
                    const count = +counter.innerText;
                    if (count < target) {
                        counter.innerText = Math.ceil(count + inc);
                        setTimeout(updateCount, 15);
                    } else {
                        counter.innerText = target;
                    }
                };
                updateCount();
            });
            countersAnimated = true;
        }

        // Gallery Population
        let galleryPopulated = false;
        function populateGallery() {
            if (galleryPopulated) return;
            const grid = document.getElementById('gallery-grid');
            if (!grid) return;

            const images = [
                { src: "gallery-1.jpg", caption: "Corporate Event" },
                { src: "gallery-2.jpg", caption: "Recruitment Drive" },
                { src: "gallery-3.jpg", caption: "Team Building" },
                { src: "gallery-4.jpg", caption: "Job Fair" },
                { src: "gallery-5.jpg", caption: "Workshop Session" },
                { src: "gallery-6.jpg", caption: "HR Summit" },
                { src: "gallery-7.jpg", caption: "Student Training" },
                { src: "gallery-8.jpg", caption: "Corporate Seminar" },
                { src: "gallery-9.jpg", caption: "Campus Recruitment" },
                { src: "gallery-10.jpg", caption: "Award Ceremony" },
                { src: "gallery-11.jpg", caption: "Leadership Training" },
                { src: "gallery-12.jpg", caption: "Career Counselling" },
                { src: "gallery-13.jpg", caption: "Executive Meeting" },
                { src: "gallery-14.jpg", caption: "Faculty Program" },
                { src: "gallery-15.jpg", caption: "Panel Discussion" },
                { src: "gallery-16.jpg", caption: "Graduation Event" }
            ];

            images.forEach(item => {
                const div = document.createElement('div');
                div.className = 'break-inside-avoid relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group bg-white border border-gray-100';
                
                div.innerHTML = `
                    <img src="${item.src}" alt="${item.caption}" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" loading="lazy" onerror="this.src='https://placehold.co/600x400/102a43/ffffff?text=${encodeURIComponent(item.caption)}'">
                    <div class="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                        <span class="text-white font-semibold tracking-wide text-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">${item.caption}</span>
                    </div>
                `;
                grid.appendChild(div);
            });
            galleryPopulated = true;
        }

        function renderJobPosters() {
            const grid = document.getElementById('job-posters-grid');
            if (!grid) return;
            grid.innerHTML = '';

            appStore.posters.forEach(poster => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 group flex flex-col hover:-translate-y-1';
                
                card.innerHTML = `
                    <div class="relative bg-gray-100 flex-grow overflow-hidden">
                        <img src="${escapeHtml(poster.img)}" alt="${escapeHtml(poster.title)}" class="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.src='https://placehold.co/600x800/0066cc/ffffff?text=${encodeURIComponent(poster.title)}'">
                    </div>
                    <div class="p-6 text-center bg-gray-50 border-t border-gray-100">
                        <h3 class="text-lg font-bold text-navy-900 mb-3">${escapeHtml(poster.title)}</h3>
                        <button onclick="navigateTo('register')" class="w-full py-2.5 bg-brandBlue-500 text-white rounded-lg font-semibold hover:bg-brandBlue-600 transition shadow-sm">
                            Apply Now <i class="fa-solid fa-paper-plane ml-1"></i>
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function toggleAddPosterModal() {
            const modal = document.getElementById('add-poster-modal');
            modal.classList.toggle('hidden');
        }

        async function handleAddNewPoster(event) {
            event.preventDefault();
            const title = document.getElementById('poster-title').value.trim();
            const img = document.getElementById('poster-img').value.trim();
            if (!title || !img) return;

            let newId = crypto.randomUUID();
            if (isSupabaseConnected && supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('job_posters')
                    .insert([{ title, img_url: img }])
                    .select();
                if (!error && data?.[0]?.id) {
                    newId = data[0].id;
                }
            }

            appStore.posters.unshift({ id: newId, title, img });
            saveSessionStore();
            renderJobPosters();
            if (appStore.adminAuthenticated) renderAdminTables();

            document.getElementById('add-poster-form').reset();
            toggleAddPosterModal();
            showToast('New Job Poster published!');
        }

        // Handle Form Submissions alert helper
        function showMessage(text, alertId, formSelector) {
            const alertBox = document.getElementById(alertId);
            alertBox.textContent = text;
            alertBox.classList.remove('hidden');
            
            document.querySelector(formSelector).reset();
            
            setTimeout(() => {
                alertBox.classList.add('hidden');
            }, 5000);
        }

        // Initial load
        window.addEventListener('DOMContentLoaded', () => {
            initSupabase();

            const hash = window.location.hash.substring(1);
            if (hash && document.getElementById(hash)) {
                navigateTo(hash);
            } else {
                animateCounters();
            }
            
            renderJobPosters();
            // Admin access is never restored from local state; sign in through Supabase Auth.
        });

        window.addEventListener('popstate', () => {
            const hash = window.location.hash.substring(1) || 'home';
            if (document.getElementById(hash)) {
                navigateTo(hash);
            }
        });
