import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
} from "@clack/prompts";

import type { CliOptions } from "../types.js";
import { supportedTargets } from "../lib/agents/agent-constants.js";
import {
  getTargetDefinition,
  type InstallLocation,
  type SupportedTarget,
} from "../lib/agents/agent-targets.js";

export async function resolveInstallOptions(
  options: CliOptions,
): Promise<CliOptions> {
  if (options.yes) {
    return {
      ...options,
      location: options.location ?? "local",
      target: options.target ?? "all",
    };
  }

  const hasNonInteractiveInput = Boolean(
    options.target || options.location || options.printConfig,
  );
  if (hasNonInteractiveInput) {
    return options;
  }

  intro("Specra installer");

  const targetSelection = await multiselect<SupportedTarget>({
    message: "Which agents should follow the Specra workflow in this context?",
    options: supportedTargets.map((target) => {
      const definition = getTargetDefinition(target);
      return {
        value: target,
        label: definition.title,
        hint: definition.description,
      };
    }),
    required: true,
    initialValues: [...supportedTargets],
  });

  if (isCancel(targetSelection)) {
    cancel("Installation cancelled.");
    process.exit(0);
  }

  const location = await select<InstallLocation>({
    message: "Where should Specra install agent guidance?",
    options: [
      {
        value: "local",
        label: "This project",
        hint: "Write instructions in the current repository",
      },
      {
        value: "global",
        label: "All projects",
        hint: "Write user-wide defaults in your home directory",
      },
    ],
    initialValue: "local",
  });

  if (isCancel(location)) {
    cancel("Installation cancelled.");
    process.exit(0);
  }

  const proceed = await confirm({
    message: `Install Specra guidance for ${targetSelection.join(", ")} in ${location} mode?`,
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    cancel("Installation cancelled.");
    process.exit(0);
  }

  outro("Applying Specra guidance...");

  return {
    ...options,
    location,
    target: targetSelection.join(","),
  };
}
