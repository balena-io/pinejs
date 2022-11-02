## Test environment
Pine is a system that needs a database, cache and a log streamer. For testing these dependencies are guaranteed with docker-compose.
Right now postgres, redis and loki are used as dependencies.

## Test scripts
Following tests commands exists:

### Encapsulated
Run a completely encapsulated test inside a docker container on node:16: `npm run test:compose`.

You can specify single test files to run in this test with the syntax `npm run test:compose -- **/00*`, where `**/00*` represents a test file path that is expanded during the call.
In this case to `test/00-basic.test.ts`.

### Fast on development host
To run the test on the developer host the npm packages need to be installed.
Starting the test locally with `npm run test:fast` or `npm run test:fast -- <test/file/path>`.

This leaves the docker composition from docker-compose.test.yml running so that no spin up of the containers is needed.
This test needs the `.env` file which contains only test environment variables.

> ! Caution ! the `npm run test` or `npm test` scripts are only for the CI steps and don't run the mocha tests.

### Test control
#### Delete Database
Specifying the environment variable `DELETE_DB=true` in combination with `npm run test:fast` will delete the database at every pine init step called via `test/lib/testInit`.

#### Debug Pine.js queries
Specifying the environment variable `DEBUG=true` will log debug information of each pine query (This can be an very extensive output.)
Caution, `DEBUG` is checked for existence so that even a `DEBUG=` or in a docker-compose file `DEBUG: ` will turn on the debugging.
