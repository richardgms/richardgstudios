#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

try {
  // Get last commit message
  const lastCommit = execSync("git log -1 --format=%B", { encoding: "utf-8" }).trim();

  // Parse commit message (Conventional Commits format)
  // Examples: "feat(sidebar): ...", "fix(generate): ...", "chore: ..."
  const match = lastCommit.match(/^([a-z]+)(?:\(([^)]+)\))?: (.+)/i);

  if (!match) {
    console.warn("Could not parse commit message, skipping changelog update");
    process.exit(0);
  }

  const [, type, scope, subject] = match;
  const scopeText = scope ? ` · ${scope}` : "";
  const title = `${type.charAt(0).toUpperCase() + type.slice(1)}${scopeText}`;

  // Get description (everything after the first line)
  const lines = lastCommit.split("\n");
  const description = lines.slice(1).find(line => line.trim() && !line.includes("Co-Authored"));

  // Get version from package.json
  const pkg = require("../package.json");

  // Create changelog object
  const changelog = {
    version: pkg.version,
    title: `${title} · ${subject}`,
    description: description ? description.trim() : subject,
  };

  // Write to changelog-current.json
  const changelogPath = path.join(__dirname, "..", "changelog-current.json");
  fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));

  console.log(`✓ Changelog updated: v${changelog.version}`);
} catch (error) {
  console.error("Error updating changelog:", error.message);
  process.exit(1);
}
