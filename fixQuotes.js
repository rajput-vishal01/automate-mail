import fs from "fs";

const data = fs.readFileSync("emails.csv", "utf8");

const updated = data
  .split("\n")
  .map(line =>
    line
      .split(",")
      .map(field => `"${field.replace(/^"|"$/g, "")}"`)
      .join(",")
  )
  .join("\n");

fs.writeFileSync("emails.csv", updated);