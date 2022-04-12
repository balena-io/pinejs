## Test environment
Pine is a system that needs a database, cache and a log streamer. For testing these dependencies are guaranteed with docker-compose.
Right now postgres, redis and loki are used as dependencies.

## Test scripts
Following tests commands exists:

### Encapsulated
Run a completely encapsulated test inside a docker container on node:16
`npm run test:compose` 

You can specify single test files to run in this test with this syntax:
`npm run test:compose -- **/00*` where `**/00*` represents a test file path that is expanded during the call.
In this case to "test/00-basic.test.ts"

### Fast on development host
To run the test on the developer host the npm packages need to be installed. Starting the test locally with
`npm run test:fast` or `npm run test:fast -- <test/file/path>`

This leaves the docker-composition from docker-compose.test.yml running so that no spin up of the containers is needed.
This test needs the .env file which contains only test environment variables.


> ! Caution ! the `npm run test` or `npm test` scripts are only for the ci steps and don't run the mocha tests.