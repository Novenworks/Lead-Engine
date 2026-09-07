/**
 * Structured logs on stdout. Render collects stdout, so there is nothing to
 * configure and no logging dependency to keep current.
 */
type Level = "info" | "warn" | "error";

function emit(level: Level, context: Record<string, unknown>, message: string): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "leadengine-worker",
    msg: message,
    ...context,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const log = {
  info: (context: Record<string, unknown>, message: string) => emit("info", context, message),
  warn: (context: Record<string, unknown>, message: string) => emit("warn", context, message),
  error: (context: Record<string, unknown>, message: string) => emit("error", context, message),
};
