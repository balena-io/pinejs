#!/bin/bash
cd ..
java -jar tools/rhino.jar -O 9 tools/ometac.js ../ometa-js $@
read -p "press any key"
