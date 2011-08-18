#!/bin/bash
cd ..
java -jar tools/rhino.jar -O 9 tools/ometac.js ../ometa-js ../ometa-js/bs-js-compiler.txt ../ometa-js/bs-ometa-compiler.txt ../ometa-js/bs-ometa-js-compiler.txt ../ometa-js/bs-ometa-optimizer.txt ../ometa-js/bs-project-list-parser.txt
read -p "press any key"
