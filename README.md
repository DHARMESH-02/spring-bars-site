# Vijay Spring Bars & D son's Quartz

Static ecommerce website for a watch spring bars manufacturer.

## Deploy on GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the repository root.
3. Go to **Settings > Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/**.
6. Save. GitHub will publish the site after a short build.

## Make Login, OTP, Orders, And Admin Real

This site uses Supabase for real email OTP, customers, orders, and admin access.

1. Create a Supabase project at https://supabase.com.
2. Open **SQL Editor** in Supabase.
3. Run the SQL from `supabase-setup.sql`.
4. Replace `your-admin-email@example.com` in Supabase table `admin_users` with your real admin email.
5. Open **Project Settings > API**.
6. Copy the Project URL and anon public key.
7. Paste them into `config.js`.
8. In `config.js`, set `ADMIN_EMAILS` to your real admin email.
9. Push the updated files to GitHub.

Customers can then request an email OTP, verify it, place orders, and admin users can view those orders online.
