
all: lib
	echo all

install:
	echo $@

src: $(patsubst %.ometajs,%.ometajs.js,$(wildcard src/*.ometajs))

%.ometajs.js: %.ometajs
	bin/ometajs2js -i $< -o $@

lib: lib/ometajs.js

lib/ometajs.js: src
	-rm $@
	cat $</lib.js >> $@
	cat $</ometa-base.js >> $@
	cat $</parser.js >> $@
	cat $</bs-js-compiler.ometajs.js >> $@
	cat $</bs-ometa-compiler.ometajs.js >> $@
	cat $</bs-ometa-optimizer.ometajs.js >> $@
	cat $</bs-ometa-js-compiler.ometajs.js >> $@
	cat $</ometajs.js >> $@

.PHONY: all install
