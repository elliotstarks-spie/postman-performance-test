/**
 * Run a performance test using a Postman collection export.
 * Pass arguments to control simulated user interaction.
 * Lots of room for improvement using Newman's options (https://github.com/postmanlabs/newman)
 * @param file Target Postman collection export file (should be .json)
 * @param users Number of users with which to run collection
 * @param interval Interval with which to run collection
 * @param total Total time to run before exiting
 * @param stagger Stagger users by a random time within @param interval (optional)
 * @param report Display summaries of each run result (optional)
 * @param data Optional data file to use with collection
 */

const { program, InvalidArgumentError } = require("commander");
const newman = require("newman");

// #region Arguments

// Custom required integer parser for command line arguments
function myParseInt(value) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError("Not a number.");
  }
  return parsedValue;
}

program
  .requiredOption("-f --file <string>", "Target Postman collection export file")
  .requiredOption("-u, --users <int>", "Number of simulated users", myParseInt)
  .requiredOption(
    "-i, --interval <int>",
    "Time between user requests (in seconds)",
    myParseInt
  )
  .requiredOption(
    "-t --total <int>",
    "Total time to run (in seconds)",
    myParseInt
  )
  .option(
    "-s --stagger",
    "Stagger users by a random amount within the interval",
    false
  )
  .option("-r --report", "Generate a JSON report", false)
  .option("-d --data <string>", "Optional data file to use with collection");

program.parse();

const file = program.opts().file;
const users = program.opts().users;
const interval = program.opts().interval * 1000;
const totalTime = program.opts().total * 1000;
const stagger = program.opts().stagger;
const report = program.opts().report;
const data = program.opts().data;

// Load data file
let requests = [];

if (data) {
  try {
    const requestData = require(data);
    requests = requestData.requests;
  } catch (error) {
    console.error(`Error loading data file: ${error.message}`);
    process.exit(1);
  }
}

// #endregion

let runs = new Map();
let executionCount = 0;

console.log(
  `\nInitializing performance test with:
    File: ${file}
    Users: ${users}
    Interval: ${interval / 1000} seconds
    Length: ${totalTime / 1000} seconds
    Stagger: ${stagger}
    Report: ${report}
    Data: ${data}`
);

// Exit program after specified total time
setTimeout(stopExecution, totalTime);

// Generate users
for (let i = 0; i < users; i++) {
  // If staggerBy set, delay user initialization for random number between 1 and interval
  const staggerBy = stagger ? Math.floor(Math.random() * interval) + 1 : 0;

  setTimeout(() => {
    initializeInterval(i + 1, staggerBy);
  }, staggerBy);
}

// Run the collection and schedule subsequent runs every interval
function initializeInterval(userNumber, staggerBy) {
  console.log(
    `\nInitializing user ${userNumber}, staggered by ${
      staggerBy / 1000
    } seconds`
  );
  runCollection(userNumber);
  setInterval(() => runCollection(userNumber), interval);
}

function stopExecution() {
  console.log(`\nExecution stopped after ${totalTime / 1000} seconds`);

  if (report) {
    displayResults();
  } else {
    process.exit(0);
  }
}

function displayResults() {
  console.log(`\n---------------------------------`);
  console.log("Results");
  console.log("---------------------------------");

  for (const [name, summaries] of runs.entries()) {
    console.log(`\n${name}`);
    console.log("\nResponse times: ");
    console.log(`  Average: ${getAverageResponseTime(summaries)}ms`);
    console.log(`  Minimum: ${getMinimumResponseTime(summaries)}ms`);
    console.log(`  Maximum: ${getMaximumResponseTime(summaries)}ms`);
    console.log("\nResponse codes: ");
    for (const [code, count] of getResponseCodeCounts(summaries).entries()) {
      if (code === 200) {
        console.log(`  ${code}: ${count} (success)`);
      } else {
        console.error(`  ${code}: ${count} (error)`);
      }
    }
    console.log("---------------------------------");
  }

  process.exit(0);
}

function runCollection(userNumber) {
  executionCount++;
  console.log(`\nRunning collection (count: ${executionCount})`);

  // Set up reporter configuration
  const reporters = ["cli"];

  const reporterConfig = {
    cli: {
      noSummary: true,
    },
  };

  // Code to report to JSON file, but not useful in current state
  // if (report) {
  //   reporters.push("json");
  //   const now = new Date();
  //   const formattedDate = `${now.getMonth() + 1}${now.getDate()}${
  //     now.getFullYear() - 2000
  //   }${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  //   const fileName = `perf-report_${formattedDate}.json`;
  //   const filePath = `./${fileName}`;
  //   console.log(`\nGenerating report at ${filePath}`);

  //   reporterConfig.json = {
  //     export: filePath,
  //   };
  // }

  const envVarConfig = [];
  const collection = require(file);

  // Set up usage of data file to populate body for each request
  if (data && requests.length > 0) {
    collection.item.forEach((item, i) => {
      const request = requests.find((request) => request.name === item.name);
      if (request) {
        const body = request.bodies[(userNumber - 1) % request.bodies.length];
        envVarConfig.push({
          key: `requestBody${i + 1}`,
          value: JSON.stringify(body),
        });

        // Debug request
        // console.log(
        //   `\nRunning user ${userNumber} with ${JSON.stringify(
        //     envVarConfig,
        //     null,
        //     2
        //   )}`
        // );
      }
    });
  }

  newman.run(
    {
      collection: collection,
      envVar: envVarConfig,
      insecure: true,
      verbose: false,
      reporters: reporters,
      reporter: reporterConfig,
    },
    runCallback
  );
}

function runCallback(error, summary) {
  if (error) {
    throw error;
  }

  // Add each request's response summary
  for (const run of summary.run.executions) {
    const runSummary = {
      name: run.item.name,
      responseCode: run.response.code,
      responseTime: run.response.responseTime,
    };

    // Debug response
    // console.log(run.response.text().toString());

    addRunSummary(runSummary);
  }
}

function addRunSummary(runSummary) {
  if (runs.has(runSummary.name)) {
    const currentRunSummary = runs.get(runSummary.name);
    currentRunSummary.push({
      responseCode: runSummary.responseCode,
      responseTime: runSummary.responseTime,
    });
    runs.set(runSummary.name, currentRunSummary);
  } else {
    runs.set(runSummary.name, [
      {
        responseCode: runSummary.responseCode,
        responseTime: runSummary.responseTime,
      },
    ]);
  }
}

function getMinimumResponseTime(runSummaries) {
  return Math.min(...runSummaries.map((run) => run.responseTime));
}

function getMaximumResponseTime(runSummaries) {
  return Math.max(...runSummaries.map((run) => run.responseTime));
}

function getAverageResponseTime(runSummaries) {
  const totalResponseTime = runSummaries.reduce(
    (total, current) => total + current.responseTime,
    0
  );

  return Math.round(totalResponseTime / runSummaries.length);
}

function getResponseCodeCounts(runSummaries) {
  const responseCodeCounts = new Map();

  for (const run of runSummaries) {
    if (responseCodeCounts.has(run.responseCode)) {
      const currentCount = responseCodeCounts.get(run.responseCode);
      responseCodeCounts.set(run.responseCode, currentCount + 1);
    } else {
      responseCodeCounts.set(run.responseCode, 1);
    }
  }

  return responseCodeCounts;
}
