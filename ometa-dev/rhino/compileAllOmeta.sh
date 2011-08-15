#!/bin/bash
java -jar js.jar -O 9 compile.js ../../js/mylibs/ometa-js/bs-js-compiler.txt ../../js/mylibs/ometa-js/bs-ometa-compiler.txt ../../js/mylibs/ometa-js/bs-ometa-js-compiler.txt ../../js/mylibs/ometa-js/bs-ometa-optimizer.txt ../../js/mylibs/ometa-js/bs-project-list-parser.txt
read -p "press any key"
