.PHONY: all
all: build

.PHONY: build
build: src/uAX31.ml src/parserAutomaton.mly
	./node_modules/.bin/bsb -make-world

src/uAX31.ml: pkg/ucd.nounihan.grouped.xml
	dune exec pkg/generate_uchar_ranges.exe $< > $@

pkg/ucd.nounihan.grouped.xml: pkg/ucd.nounihan.grouped.zip
	unzip -nd pkg/ $< ucd.nounihan.grouped.xml

pkg/ucd.nounihan.grouped.zip:
	curl http://www.unicode.org/Public/11.0.0/ucdxml/ucd.nounihan.grouped.zip -o $@


.PHONY: clean
clean:
	rm -f src/uAX31.ml
	rm -f pkg/ucd.nounihan.grouped.*
	rm -rf _build/
	./node_modules/.bin/bsb -clean-world
