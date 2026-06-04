import { managedBlockEnd, managedBlockStart } from "./agents/agent-targets.js";

export function upsertManagedBlock(current: string, block: string): string {
  if (
    current.includes(managedBlockStart) &&
    current.includes(managedBlockEnd)
  ) {
    return current.replace(
      new RegExp(
        `${escapeForRegExp(managedBlockStart)}[\\s\\S]*?${escapeForRegExp(managedBlockEnd)}\\n?`,
        "u",
      ),
      `${block.trimEnd()}\n`,
    );
  }

  if (current.trim().length === 0) {
    return block;
  }

  return `${current.trimEnd()}\n\n${block}`;
}

export function removeManagedBlock(current: string): string {
  const next = current.replace(
    new RegExp(
      `\\n?${escapeForRegExp(managedBlockStart)}[\\s\\S]*?${escapeForRegExp(managedBlockEnd)}\\n?`,
      "u",
    ),
    "\n",
  );

  return next.replace(/\n{3,}/gu, "\n\n").trim()
    ? `${next.replace(/\n{3,}/gu, "\n\n").trim()}\n`
    : "";
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
