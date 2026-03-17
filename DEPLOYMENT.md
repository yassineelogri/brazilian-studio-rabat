# Deployment Guide for Brazilian Studio Rabat Website

This website is built with Next.js and is optimized to be hosted for **free** on Vercel.

## 1. Push Code to GitHub
1. Open your terminal or command prompt in the project folder (`brazilian_studio`).
2. Run the following commands to initialize Git and commit your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Brazilian Studio Rabat website"
   ```
3. Go to [GitHub.com](https://github.com/) and log in (or create an account).
4. Create a **New Repository**. You can name it `brazilian-studio-website`. Do not initialize it with a README, .gitignore, or license.
5. Once created, copy the commands under the heading **"…or push an existing repository from the command line"**. It should look something like:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YourUsername/brazilian-studio-website.git
   git push -u origin main
   ```
6. Paste those commands into your terminal and press enter. Your code is now securely on GitHub!

## 2. Deploy for Free on Vercel
1. Go to [Vercel.com](https://vercel.com/) and sign up or log in using your **GitHub account**.
2. Click on the **"Add New..."** button in the dashboard, and select **"Project"**.
3. Under the **"Import Git Repository"** section, find the repository you just created (`brazilian-studio-website`) and click **"Import"**.
4. In the "Configure Project" screen, ensure the **Framework Preset** is set to **Next.js** (Vercel usually autodetects this).
5. Simply click the blue **"Deploy"** button.
6. Wait 1-2 minutes while Vercel builds your site. 
7. Once finished, you will see a success screen with a live URL (e.g., `https://brazilian-studio-website.vercel.app`).

### Optional: Connecting a Custom Domain
If you have a custom domain (like `brazilianstudiorabat.com`):
1. In your Vercel project dashboard, go to **Settings** > **Domains**.
2. Type in your domain name and click **Add**.
3. Follow the Vercel instructions to add the required `A` or `CNAME` records to your domain registrar (e.g., GoDaddy, Namecheap).

Your beautifully animated website is now live!
