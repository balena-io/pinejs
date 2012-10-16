Build Instructions
------------------

To build run the following script. Assumes you start in the docs/ folder.

    cd ..

    cd src/common/ometa-compiler/src/
    npm install

    cd ../../../..

    cd src/external/ometa-js
    npm install

    cd ../../..

    cd build

    npm install jake -g
    npm install

    jake all
