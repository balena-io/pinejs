
all: lib

src: $(patsubst %.ometajs,%.ometajs.js,$(wildcard src/*.ometajs))
tests: $(wildcard tests/*.ometajs.js)
	cat $@/bla.ometajs | ometajs2js > $@/bla.ometajs.stdout

tests/%.ometajs: FORCE
	touch $@

%.ometajs.js: %.ometajs
	ometajs2js -i $< -o $@

lib: lib/ometajs.js

lib/ometajs.js: src
	-rm $@
	for i in \
			lib.js \
			ometa-base.js \
			parser.js \
			bs-js-compiler.ometajs.js \
			bs-ometa-compiler.ometajs.js \
			bs-ometa-optimizer.ometajs.js \
			bs-ometa-js-compiler.ometajs.js \
			ometajs.js \
		; do \
			cat $</$$i >> $@ \
		; done

.PHONY: all FORCE
