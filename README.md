# Modern Ticketing System

A full-stack ticketing system built with Next.js, Convex, and OpenAI integration. Features AI-powered triage, categorization, and resolution assistance with a clean document-editor style UI.

## Features

- **Ticket Management**: Create, track, and manage support tickets
- **Real-time Updates**: Automatic UI updates when data changes (powered by Convex)
- **AI-Powered Features**: 
  - Automatic category suggestions
  - Priority recommendations
  - Knowledge base article matching
- **Dashboard & Analytics**: Track KPIs and ticket metrics
- **Comments & Collaboration**: Add comments and collaborate on tickets
- **Clean UI**: Document-editor style design with serif fonts

## Tech Stack

- **Frontend**: Next.js 14+ with React, TypeScript, Tailwind CSS
- **Backend**: Convex (queries, mutations, actions)
- **Database**: Convex real-time database
- **Authentication**: Email/password authentication
- **AI**: OpenAI API integration
- **File Storage**: Convex Storage API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account (free tier available)
- OpenAI API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd teck
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npx convex dev
```
This will:
- Create a Convex account if you don't have one
- Set up a new project
- Generate the deployment URL

4. Create `.env.local` file:
```bash
cp .env.example .env.local
```

5. Add your environment variables to `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
OPENAI_API_KEY=your_openai_api_key
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
teck/
├── convex/              # Convex backend functions
│   ├── schema.ts        # Database schema
│   ├── tickets.ts       # Ticket queries/mutations
│   ├── comments.ts      # Comment queries/mutations
│   ├── ai/              # AI actions
│   └── ...
├── app/                 # Next.js app router
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Dashboard pages
│   └── ...
├── components/          # React components
│   ├── ui/             # Base UI components
│   ├── tickets/        # Ticket components
│   └── ...
└── ...
```

## Usage

### Creating a Ticket

1. Sign up or log in
2. Navigate to "Tickets" → "Create New Ticket"
3. Fill in the ticket details
4. AI will suggest category and priority (if OpenAI key is configured)
5. Submit the ticket

### Managing Tickets

- View all tickets on the Tickets page
- Filter by status, priority, or category
- Click on a ticket to view details and add comments
- Update ticket status as it progresses

### Dashboard

The dashboard provides an overview of:
- Total tickets
- Tickets by status
- Critical tickets
- Recent ticket activity

## AI Features

The system uses OpenAI to provide:
- **Category Suggestions**: Analyzes ticket content to suggest the best category
- **Priority Recommendations**: Determines priority and urgency based on keywords and context
- **Knowledge Base Matching**: Finds relevant articles based on ticket content

To enable AI features, add your OpenAI API key to `.env.local`.

## Development

### Convex Functions

Convex functions are automatically synced when you run `npx convex dev`. The functions are:
- **Queries**: Read data (reactive, auto-updates)
- **Mutations**: Write data
- **Actions**: Call external APIs (like OpenAI)

### Adding New Features

1. **Database Schema**: Update `convex/schema.ts`
2. **Backend Logic**: Add queries/mutations in `convex/`
3. **Frontend**: Create pages in `app/` and components in `components/`

## Deployment

### Deploy Convex Backend

```bash
npx convex deploy
```

### Deploy Next.js Frontend

Deploy to Vercel, Netlify, or your preferred platform:

```bash
npm run build
```

Make sure to set environment variables in your deployment platform.

## Environment Variables

### Frontend (`.env.local`)
- `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL
- `OPENAI_API_KEY`: Your OpenAI API key (optional, for AI features)

### Backend (Convex Dashboard)

To enable email notifications for ticket creation and updates, configure email settings:

#### Email Service Provider (Choose One)

**Option 1: Resend (Recommended - Free tier available)**
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from Resend dashboard
3. Add to Convex Dashboard → Settings → Environment Variables:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_xxxxxxxxxxxxx` (your Resend API key)
4. **Complete Setup Guide**: See [RESEND_SETUP.md](./RESEND_SETUP.md)

**Option 2: SMTP2GO (Works with Exchange SMTP)**
1. Sign up at [smtp2go.com](https://www.smtp2go.com)
2. Create an API key
3. Add to Convex Dashboard → Settings → Environment Variables:
   - **Name**: `SMTP2GO_API_KEY`
   - **Value**: Your SMTP2GO API key

**Option 3: Mailgun**
1. Sign up at [mailgun.com](https://www.mailgun.com)
2. Get your API key and domain
3. Add to Convex Dashboard → Settings → Environment Variables:
   - **Name**: `MAILGUN_API_KEY`
   - **Value**: Your Mailgun API key
   - **Name**: `MAILGUN_DOMAIN`
   - **Value**: Your verified Mailgun domain

**Option 4: Custom SMTP Relay URL**
1. Set up your own SMTP HTTP relay endpoint
2. Add to Convex environment variables:
   - **Name**: `SMTP_RELAY_URL`
   - **Value**: URL of your SMTP relay endpoint

#### Configure Email Settings in Your App

After setting up the email service provider, configure SMTP settings in your application:

1. **Log in as Admin** user
2. **Navigate to Settings → Email Settings**
3. **Configure SMTP Settings**:
   - Email Integration Enabled: ✅ ON
   - SMTP Enabled: ✅ ON
   - SMTP Host: Your SMTP server (e.g., `mail.yourdomain.com`)
   - SMTP Port: `465` (SSL) or `587` (STARTTLS)
   - Use TLS/SSL: ✅ ON
   - SMTP Username: Your email address
   - SMTP Password: Your email password
   - From Email: Sender email address
   - From Name: Display name (optional)

**📖 Complete Configuration Guide**: See [EMAIL_SETTINGS_CONFIGURATION.md](./EMAIL_SETTINGS_CONFIGURATION.md)

**📖 Troubleshooting**: See [EMAIL_TROUBLESHOOTING.md](./EMAIL_TROUBLESHOOTING.md)

#### Important Notes

- **Resend is Recommended**: Free tier includes 3,000 emails/month
- **SMTP Settings Required**: Even with Resend, you need to configure SMTP settings in the app
- **Domain Verification**: For custom domains, verify in Resend dashboard
- **Testing**: Use `onboarding@resend.dev` for testing without domain verification
- **Redeploy**: After adding environment variables, run `npx convex deploy`
- **Email Logs**: Check Email Settings → Email Logs to verify emails are being sent

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
