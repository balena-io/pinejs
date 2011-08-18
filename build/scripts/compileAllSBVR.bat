%~d0
cd %~p0..
java -jar tools/rhino.jar -O 9 tools/ometac.js ../ometa-js pretty ../../js/mylibs/ometa-code/ClientURIParser.ometa ../../js/mylibs/ometa-code/ClientURIUnparser.ometa ../../js/mylibs/ometa-code/Prettify.ometa ../../js/mylibs/ometa-code/SBVR_PreProc.ometa ../../js/mylibs/ometa-code/SBVR2SQL.ometa ../../js/mylibs/ometa-code/SBVRModels.ometa ../../js/mylibs/ometa-code/SBVRParser.ometa ../../js/mylibs/ometa-code/ServerURIParser.ometa
pause