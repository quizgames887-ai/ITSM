import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Process escalation rules every 5 minutes
crons.interval(
  "processEscalations",
  {
    minutes: 5,
  },
  api.sla.processEscalations
);

export default crons;
