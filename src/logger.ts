import axios from "axios";

type Stack = "backend" | "frontend";
type Level = "debug" | "info" | "warn" | "error" | "fatal";
type Package =
  | "cache" | "controller" | "cron_job" | "handler"
  | "repository" | "route" | "service"
  | "api" | "component" | "hook" | "page" | "state" | "style"
  | "auth" | "config" | "middleware" | "utils";

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";

export async function log(
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<string | null> {
  const timestamp = new Date().toISOString();
  console.log([${timestamp}] [${level.toUpperCase()}] [${pkg}] ${message});

  try {
    const response = await axios.post(
      LOG_API_URL,
      { stack, level, package: pkg, message },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: Bearer ${process.env.LOG_API_TOKEN},
        },
      }
    );
    const logID = response.data?.logID;
    console.log([LOG SENT] logID: ${logID});
    return logID;
  } catch (err) {
    console.error("Failed to send log:", err);
    return null;
  }
}