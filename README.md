# Postman Performance Test

## Dependencies
Requires `Node` (only tested with `v20.14.0`)

## Setup
Run `npm install`

## Arguments
`-f` `--file` *String, Required.* Target Postman collection export file.

`-u` `--users` *Integer, Required.* Number of simulated concurrent users.

`-i` `--interval` *Integer, Required.* Time between user requests (in seconds).

`-t` `--total` *Integer, Required.* Total time to run (in seconds).

`-s` `--stagger` *Boolean, Optional (default = false).* Stagger users by a random amount within the `interval`. 


Example usage:
`node .\app\postman-performance-test.js --file "../collections/staff-tools.test.json" --users 10 --interval 20 --total 60 --stagger`
