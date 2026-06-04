import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
} from "@clack/prompts";

import type { CliOptions, InitTemplate } from "../types.js";
import { supportedTargets } from "../lib/agents/agent-constants.js";
import {
  getTargetDefinition,
  type SupportedTarget,
} from "../lib/agents/agent-targets.js";

export async function resolveInitOptions(
  options: CliOptions,
  detectedAgents: SupportedTarget[],
): Promise<CliOptions> {
  if (options.yes) {
    return {
      ...options,
      target: options.target,
      template: normalizeTemplateOption(options),
    };
  }

  const hasNonInteractiveInput = Boolean(
    options.target ||
      options.template ||
      options.example ||
      options.installAgents !== undefined,
  );
  if (hasNonInteractiveInput) {
    return {
      ...options,
      template: normalizeTemplateOption(options),
    };
  }

  intro("Specra init");

  const template = await select<InitTemplate>({
    message: "How should Specra scaffold this project?",
    options: [
      {
        value: "clean",
        label: "Clean contract",
        hint: "Generic starter files with minimal assumptions",
      },
      {
        value: "hello-world",
        label: "Hello world example",
        hint: "A tiny runnable example to learn the workflow quickly",
      },
    ],
    initialValue: "clean",
  });

  if (isCancel(template)) {
    cancel("Init cancelled.");
    process.exit(0);
  }

  const installAgents = await confirm({
    message:
      detectedAgents.length > 0
        ? `Install local agent guidance too? Detected: ${detectedAgents.join(", ")}`
        : "Install local agent guidance too?",
    initialValue: detectedAgents.length > 0,
  });

  if (isCancel(installAgents)) {
    cancel("Init cancelled.");
    process.exit(0);
  }

  let targetSelection: SupportedTarget[] = [];
  if (installAgents) {
    const selectedTargets = await multiselect<SupportedTarget>({
      message: "Which agents should follow the Specra workflow in this repo?",
      options: supportedTargets.map((target) => {
        const definition = getTargetDefinition(target);
        return {
          value: target,
          label: definition.title,
          hint: definition.description,
        };
      }),
      required: true,
      initialValues: detectedAgents.length > 0 ? detectedAgents : ["opencode"],
    });

    if (isCancel(selectedTargets)) {
      cancel("Init cancelled.");
      process.exit(0);
    }

    targetSelection = [...selectedTargets];
  }

  const proceed = await confirm({
    message: `Create a ${template} Specra scaffold${targetSelection.length > 0 ? ` and install ${targetSelection.join(", ")}` : ""}?`,
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    cancel("Init cancelled.");
    process.exit(0);
  }

  outro("Preparing your Specra workspace...");

  return {
    ...options,
    installAgents,
    target: targetSelection.join(","),
    template,
  };
}

function normalizeTemplateOption(options: CliOptions): InitTemplate {
  if (options.example) {
    return "hello-world";
  }

  return options.template === "hello-world" ? "hello-world" : "clean";
}
