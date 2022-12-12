## Test environment
Pine is a system that needs a database. 
Therefore the `npm run test:compose` is used to test pinejs with a postgres database spin up from a docker compose file: `docker-compose.npm-test.yml`
This approach guarantees that the node versions are tested by the flowzone test actions on a github pull request.

#### Debug pinejs queries
Specifying the environment variable PINEJS_DEBUG=1 will log debug information of each pine query (This can be a very verbose output.)
