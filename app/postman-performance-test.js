/**
 * Run a performance test using a Postman collection export.
 * Pass arguments to control simulated user interaction.
 * Lots of room for improvement using Newman's options (https://github.com/postmanlabs/newman)
 * @param file Target Postman collection export file (should be .json)
 * @param users Number of users with which to run collection
 * @param interval Interval with which to run collection
 * @param total Total time to run before exiting
 * @param stagger Stagger users by a random time within @param interval (optional)
 */
const { program, InvalidArgumentError } = require("commander");
const newman = require("newman");

// #region Arguments

// Custom required integer parser for command line arguments
function myParseInt(value, dummyPrevious) {
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
  );

program.parse();

const file = program.opts().file;
const users = program.opts().users;
const interval = program.opts().interval * 1000;
const totalTime = program.opts().total * 1000;
const stagger = program.opts().stagger;

// #endregion

let responseTimes = [];
let executionCount = 0;

console.log(
  `\nInitializing performance test with:
    File: ${file}
    Users: ${users}
    Interval: ${interval / 1000} seconds
    Length: ${totalTime / 1000} seconds
    Stagger: ${stagger}`
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
  runCollection();
  setInterval(runCollection, interval);
}

function stopExecution() {
  console.log(`\nExecution stopped after ${totalTime / 1000} seconds`);
  console.log(
    `Average response time: ${getAverageResponseTime(responseTimes)}ms`
  );
  process.exit(0);
}

function runCollection() {
  executionCount++;
  console.log(`\nRunning collection (count: ${executionCount})`);

  newman.run(
    {
      collection: require(file),
      reporters: "cli",
      insecure: true,
      verbose: false,
      reporter: {
        cli: {
          noSummary: true,
        },
      },
    },
    runCallback
  );
}

function runCallback(error, summary) {
  if (error) {
    throw error;
  }

  responseTimes.push(summary.run.timings.responseAverage);
}

function getAverageResponseTime(responseTimes) {
  const totalResponseTime = responseTimes.reduce((a, b) => a + b);
  return Math.round(totalResponseTime / responseTimes.length);
}
