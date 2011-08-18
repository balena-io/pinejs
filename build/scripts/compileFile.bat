%~d0
cd %~p0..
java -jar tools/rhino.jar -O 9 tools/ometac.js ../ometa-js %*
pause