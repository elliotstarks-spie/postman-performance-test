# Postman Performance Test

## Dependencies

Requires `Node` (only tested with `v20.14.0`).

## Setup

Run `npm install` from root directory.

## Arguments

`-f` `--file` _String, Required._ Target Postman collection export file.

`-u` `--users` _Integer, Required._ Number of simulated concurrent users.

`-i` `--interval` _Integer, Required._ Time between user requests (in seconds).

`-t` `--total` _Integer, Required._ Total time to run (in seconds).

`-s` `--stagger` _Boolean, Optional (default = false)._ Stagger users by a random amount within the `interval`.

`-r` `--report` _Boolean, Optional (default = false)._ Generate a summary report on completion.

`-d` `--data` _String, Optional._ Data file to use with collection.

Example usage:
`node .\app\postman-performance-test.js --file "..\collections\my-collection.json" --users 10 --interval 20 --total 60 --stagger --report --data ".\data\my-data.json"`
