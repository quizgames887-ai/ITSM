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
To enable real email sending using your Exchange SMTP configuration, configure one of the following email relay services in your Convex dashboard:

**Option 1: Mailgun (Recommended for Exchange SMTP)**
1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add these environment variables:
   - **Name**: `MAILGUN_DOMAIN` - Your Mailgun domain
   - **Name**: `MAILGUN_API_KEY` - Your Mailgun API key

**Option 2: SendGrid**
1. Add to Convex environment variables:
   - **Name**: `SENDGRID_API_KEY` - Your SendGrid API key

**How to get Mailgun credentials:**
1. Sign up for a free account at [mailgun.com](https://www.mailgun.com)
2. Verify your domain (or use sandbox domain for testing)
3. Go to Settings → API Keys
4. Copy your API key and domain
5. Add them to Convex environment variables

**How to get SendGrid credentials:**
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Go to Settings → API Keys
3. Create an API key with "Mail Send" permissions
4. Add to Convex environment variables

**Note**: 
- Configure your SMTP settings (Exchange) in the Email Settings page
- The system will use your SMTP configuration with the relay service (Mailgun/SendGrid) to send emails
- Without a relay service configured, emails will be simulated (logged but not actually sent)
- Check the email logs to see if emails are marked as "Simulated" or "Real"

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
