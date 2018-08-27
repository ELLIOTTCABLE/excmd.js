.PHONY: all
all: build

.PHONY: build
build: src/uAX31.ml src/parserAutomaton.ml
	bsb -make-world

src/parserAutomaton.ml: src/parserAutomaton.mly src/tokens.ml
	menhir --log-automaton 1 --log-code 1 --log-grammar 1 --trace --external-tokens Tokens $<

src/tokens.%: src/parserAutomaton.mly
	menhir --only-tokens $< --base src/tokens
	cat src/tokens.tail.ml >> src/tokens.ml
	cat src/tokens.tail.mli >> src/tokens.mli

src/uAX31.ml: pkg/ucd.nounihan.grouped.xml
	dune exec pkg/generate_uchar_ranges.exe $< > $@

pkg/ucd.nounihan.grouped.xml: pkg/ucd.nounihan.grouped.zip
	unzip -nd pkg/ $< ucd.nounihan.grouped.xml

pkg/ucd.nounihan.grouped.zip:
	curl http://www.unicode.org/Public/11.0.0/ucdxml/ucd.nounihan.grouped.zip -o $@


.PHONY: clean
clean:
	rm -f src/tokens.ml*
	rm -f src/parserAutomaton.ml src/parserAutomaton.mli
	rm -f src/uAX31.ml
	rm -f pkg/ucd.nounihan.grouped.*
	rm -f _build/
	bsb -clean-world
