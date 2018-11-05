.PHONY: all
all: build-bs build-ml

.PHONY: build-bs
build-bs: src/uAX31.ml src/parserAutomaton.mly
	./node_modules/.bin/bsb -make-world

.PHONY: build-ml
build-ml: src/uAX31.ml src/parserAutomaton.mly
	# This is a horrible hack. We run the BuckleScript build first, since the Menhir
	# configuration is already laid out in bsconfig.json; but remove the copied AST
	# implementation so Dune can copy-over the one with OCaml-specific annotations.
	./node_modules/.bin/bsb -make-world
	rm -f src/aST.ml
	dune build

src/uAX31.ml: pkg/ucd.nounihan.grouped.xml
	dune exec pkg/generate_uchar_ranges.exe $< > $@

pkg/ucd.nounihan.grouped.xml: pkg/ucd.nounihan.grouped.zip
	unzip -nd pkg/ $< ucd.nounihan.grouped.xml

pkg/ucd.nounihan.grouped.zip:
	curl http://www.unicode.org/Public/11.0.0/ucdxml/ucd.nounihan.grouped.zip -o $@


.PHONY: clean
clean:
	rm -f src/uAX31.ml
	rm -f src/aST.ml
	rm -f src/menhirLib.ml*
	rm -f pkg/ucd.nounihan.grouped.*
	rm -rf _build/
	rm -rf lib/
	./node_modules/.bin/bsb -clean-world
