#!/usr/bin/env node

// src/index.ts
import * as core2 from "@arethetypeswrong/core";
import { Option, program } from "commander";
import chalk3 from "chalk";
import { readFile as readFile2 } from "fs/promises";
import { FetchError } from "node-fetch";

// src/render/typed.ts
import * as core from "@arethetypeswrong/core";
import { allResolutionKinds } from "@arethetypeswrong/core/utils";
import Table from "cli-table3";
import chalk2 from "chalk";

// src/problemUtils.ts
var problemFlags = {
  Wildcard: "wildcard",
  NoResolution: "no-resolution",
  UntypedResolution: "untyped-resolution",
  FalseCJS: "false-cjs",
  FalseESM: "false-esm",
  CJSResolvesToESM: "cjs-resolves-to-esm",
  FallbackCondition: "fallback-condition",
  CJSOnlyExportsDefault: "cjs-only-exports-default",
  FalseExportDefault: "false-export-default",
  UnexpectedESMSyntax: "unexpected-esm-syntax",
  UnexpectedCJSSyntax: "unexpected-cjs-syntax"
};
var problemEmoji = {
  Wildcard: "\u2753",
  NoResolution: "\u{1F480}",
  UntypedResolution: "\u{1F6AB}",
  FalseCJS: "\u{1F3AD}",
  FalseESM: "\u{1F47A}",
  CJSResolvesToESM: "\u26A0\uFE0F",
  FallbackCondition: "\u{1F41B}",
  CJSOnlyExportsDefault: "\u{1F928}",
  FalseExportDefault: "\u2757\uFE0F",
  UnexpectedESMSyntax: "\u{1F6AD}",
  UnexpectedCJSSyntax: "\u{1F6B1}"
};
var withEmoji = {
  Wildcard: `${problemEmoji.Wildcard} Unable to check`,
  NoResolution: `${problemEmoji.NoResolution} Failed to resolve`,
  UntypedResolution: `${problemEmoji.UntypedResolution} No types`,
  FalseCJS: `${problemEmoji.FalseCJS} Masquerading as CJS`,
  FalseESM: `${problemEmoji.FalseESM} Masquerading as ESM`,
  CJSResolvesToESM: `${problemEmoji.CJSResolvesToESM} ESM (dynamic import only)`,
  FallbackCondition: `${problemEmoji.FallbackCondition} Used fallback condition`,
  CJSOnlyExportsDefault: `${problemEmoji.CJSOnlyExportsDefault} CJS default export`,
  FalseExportDefault: `${problemEmoji.FalseExportDefault} Incorrect default export`,
  UnexpectedESMSyntax: `${problemEmoji.UnexpectedESMSyntax} Unexpected ESM syntax`,
  UnexpectedCJSSyntax: `${problemEmoji.UnexpectedCJSSyntax} Unexpected CJS syntax`
};
var noEmoji = {
  Wildcard: `Unable to check`,
  NoResolution: `Failed to resolve`,
  UntypedResolution: `No types`,
  FalseCJS: `Masquerading as CJS`,
  FalseESM: `Masquerading as ESM`,
  CJSResolvesToESM: `ESM (dynamic import only)`,
  FallbackCondition: `Used fallback condition`,
  CJSOnlyExportsDefault: `CJS default export`,
  FalseExportDefault: `Incorrect default export`,
  UnexpectedESMSyntax: `Unexpected ESM syntax`,
  UnexpectedCJSSyntax: `Unexpected CJS syntax`
};
var problemShortDescriptions = {
  emoji: withEmoji,
  noEmoji
};
var resolutionKinds = {
  node10: "node10",
  "node16-cjs": "node16 (from CJS)",
  "node16-esm": "node16 (from ESM)",
  bundler: "bundler"
};
var moduleKinds = {
  1: "(CJS)",
  99: "(ESM)",
  "": ""
};

// src/render/verticalTable.ts
import chalk from "chalk";
function verticalTable(table) {
  return table.options.head.slice(1).map((entryPoint, i) => {
    const keyValuePairs = table.reduce((acc, cur) => {
      var _a, _b;
      const key = (_a = cur[0]) == null ? void 0 : _a.toString();
      const value = (_b = cur[i + 1]) == null ? void 0 : _b.toString();
      return acc + `${key}: ${value}
`;
    }, "");
    return `${chalk.bold.blue(entryPoint)}

${keyValuePairs}
***********************************`;
  }).join("\n\n");
}

// src/render/typed.ts
async function typed(analysis, opts) {
  const problems = core.getProblems(analysis).filter((problem) => !opts.ignore || !opts.ignore.includes(problem.kind));
  const subpaths = Object.keys(analysis.entrypointResolutions);
  if (opts.ignore && opts.ignore.length) {
    console.log(
      chalk2.gray(
        ` (ignoring rules: ${opts.ignore.map((rule) => `'${problemFlags[rule]}'`).join(", ")})
`
      )
    );
  }
  if (opts.summary) {
    const summaries = core.summarizeProblems(problems, analysis);
    const defaultSummary = !opts.emoji ? " No problems found." : " No problems found \u{1F31F}";
    const summaryTexts = summaries.map((summary) => {
      return summary.messages.map((message) => {
        if (!opts.emoji)
          return "    " + message.messageText.split(". ").join(".\n    ");
        return ` ${problemEmoji[summary.kind]} ${message.messageText.split(". ").join(".\n    ")}`;
      }).join("\n");
    });
    console.log((summaryTexts.join("\n\n") || defaultSummary) + "\n");
  }
  const entrypoints = subpaths.map((s) => {
    const hasProblems = problems.some((p) => p.entrypoint === s);
    const color = hasProblems ? "redBright" : "greenBright";
    if (s === ".")
      return chalk2.bold[color](`"${analysis.packageName}"`);
    else
      return chalk2.bold[color](`"${analysis.packageName}/${s.substring(2)}"`);
  });
  const table = new Table({
    head: ["", ...entrypoints],
    colWidths: [20, ...entrypoints.map(() => 35)]
  });
  allResolutionKinds.forEach((kind) => {
    let row = [resolutionKinds[kind]];
    row = row.concat(
      subpaths.map((subpath) => {
        var _a;
        const problemsForCell = problems.filter(
          (problem) => problem.entrypoint === subpath && problem.resolutionKind === kind
        );
        const resolution = analysis.entrypointResolutions[subpath][kind].resolution;
        const descriptions = problemShortDescriptions[!opts.emoji ? "noEmoji" : "emoji"];
        if (problemsForCell.length) {
          return problemsForCell.map((problem) => descriptions[problem.kind]).join("\n");
        }
        const jsonResult = !opts.emoji ? "OK (JSON)" : "\u{1F7E2} (JSON)";
        const moduleResult = (!opts.emoji ? "OK " : "\u{1F7E2} ") + moduleKinds[((_a = resolution == null ? void 0 : resolution.moduleKind) == null ? void 0 : _a.detectedKind) || ""];
        return `${(resolution == null ? void 0 : resolution.isJson) ? jsonResult : moduleResult}`;
      })
    );
    table.push(row);
  });
  if (opts.vertical) {
    console.log(verticalTable(table));
  } else {
    console.log(table.toString());
  }
}

// src/render/untyped.ts
function untyped(analysis) {
  console.log("This package does not contain types.\nDetails: ", analysis);
}

// src/readConfig.ts
import { readFile } from "fs/promises";
async function readConfig(program2, alternate = ".attw.json") {
  try {
    const results = await readFile(alternate, "utf8");
    if (!results)
      return;
    const opts = JSON.parse(results);
    for (let key in opts) {
      if (key === "configPath")
        program2.error(`cannot set "configPath" within ${alternate}`, { code: "INVALID_OPTION" });
      const value = opts[key];
      if (key === "ignore") {
        if (!Array.isArray(value))
          program2.error(`error: config option 'ignore' should be an array.`);
        const invalid = value.find((rule) => !Object.values(problemFlags).includes(rule));
        if (invalid)
          program2.error(
            `error: config option 'ignore' argument '${invalid}' is invalid. Allowed choices are ${Object.values(
              problemFlags
            ).join(", ")}.`
          );
      }
      if (Array.isArray(value)) {
        const opt = program2.getOptionValue(key);
        if (Array.isArray(opt)) {
          program2.setOptionValueWithSource(key, [...opt, ...value], "config");
          continue;
        }
      }
      if (key !== "help" && key !== "version")
        program2.setOptionValueWithSource(key, opts[key], "config");
    }
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || !("message" in error)) {
      program2.error("unknown error while reading config file", { code: "UNKNOWN" });
    } else if (error.code !== "ENOENT") {
      program2.error(`error while reading config file:
${error.message}`);
    }
  }
}

// src/index.ts
program.addHelpText("before", "ATTW CLI (v0.0.1)\n").addHelpText("after", "\ncore: v0.0.6, typescript: v5.0.0-dev.20230207").version("v0.0.1").name("attw").description(
  `${chalk3.bold.blue(
    "Are the Types Wrong?"
  )} attempts to analyze npm package contents for issues with their TypeScript types,
particularly ESM-related module resolution issues.`
).argument("<package-name>", "the package to check; by default the name of an NPM package, unless --from-file is set").option("-v, --package-version <version>", "the version of the package to check").option("-r, --raw", "output raw JSON; overrides any rendering options").option("-f, --from-file", "read from a file instead of the npm registry").option("-E, --vertical", "display in a vertical ASCII table (like MySQL's -E option)").option("-s, --strict", "exit if any problems are found (useful for CI)").option("--summary, --no-summary", "whether to print summary information about the different errors").option("--emoji, --no-emoji", "whether to use any emojis").option("--color, --no-color", "whether to use any colors (the FORCE_COLOR env variable is also available)").option("-q, --quiet", "don't print anything to STDOUT (overrides all other options)").option("--config-path <path>", "path to config file (default: ./.attw.json)").addOption(new Option("-i, --ignore <rules...>", "specify rules to ignore").choices(Object.values(problemFlags))).action(async (packageName) => {
  var _a;
  const opts = program.opts();
  await readConfig(program, opts.configPath);
  opts.ignore = (_a = opts.ignore) == null ? void 0 : _a.map(
    (value) => Object.keys(problemFlags).find((key) => problemFlags[key] === value)
  );
  if (opts.quiet) {
    console.log = () => {
    };
  }
  if (!opts.color) {
    process.env.FORCE_COLOR = "0";
  }
  let analysis;
  if (opts.fromFile) {
    try {
      const file = await readFile2(packageName);
      const data = new Uint8Array(file);
      analysis = await core2.checkTgz(data);
    } catch (error) {
      handleError(error, "checking file");
    }
  } else {
    try {
      analysis = await core2.checkPackage(packageName, opts.packageVersion);
    } catch (error) {
      if (error instanceof FetchError) {
        program.error(`error while fetching package:
${error.message}`, { code: error.code });
      }
      handleError(error, "checking package");
    }
  }
  if (opts.raw) {
    const result = { analysis };
    if (analysis.containsTypes) {
      result.problems = core2.groupByKind(core2.getProblems(analysis));
    }
    console.log(JSON.stringify(result));
    if (opts.strict && analysis.containsTypes && !!core2.getProblems(analysis).length)
      process.exit(1);
    return;
  }
  console.log();
  if (analysis.containsTypes) {
    await typed(analysis, opts);
    if (opts.strict && !!core2.getProblems(analysis).length)
      process.exit(1);
  } else {
    untyped(analysis);
  }
}).parse(process.argv);
function handleError(error, title) {
  if (error && typeof error === "object" && "message" in error) {
    program.error(`error while ${title}:
${error.message}`, {
      code: "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN"
    });
  }
  program.error(`unknown error while ${title}`, { code: "UNKNOWN" });
}
