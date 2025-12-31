import { cronJobs } from "convex/server";

const crons = cronJobs();

// Note: Internal functions for cron jobs would be defined in separate files
// For now, we'll keep this simple and add cron jobs later when needed

export default crons;
