.PHONY: all
all: build-ml

.PHONY: test
test: test-ml

.PHONY: test-ml
test-ml: build-ml
	dune runtest

.PHONY: build-ml
build-ml: scripts/annotateMenhirTypes.bs.js src/uAX31.ml src/parserAutomaton.mly
	# This is a horrible hack. We run the BuckleScript build first, since the Menhir configuration is
	# already laid out in bsconfig.json.
	-./node_modules/.bin/bsb -make-world

	# Further horrible hack, to avoid using our local, BuckleScript-friendly copy of MenhirLib
	rm -f src/menhirLib.ml*
	dune build

src/uAX31.ml: pkg/ucd.nounihan.grouped.xml
	dune exec pkg/generate_uchar_ranges.exe $< > $@

pkg/ucd.nounihan.grouped.xml: pkg/ucd.nounihan.grouped.zip
	unzip -nd pkg/ $< ucd.nounihan.grouped.xml

pkg/ucd.nounihan.grouped.zip:
	curl http://www.unicode.org/Public/11.0.0/ucdxml/ucd.nounihan.grouped.zip -o $@

.PHONY: build-doc
build-doc: src/parserAutomaton.mly
	rm -f src/menhirLib.ml*

	dune build @doc
	# FIXME: There's gotta be a better way to clean up the docs ...
	-rm -r "_build/default/_doc/_html/excmd/Excmd__"*
	mkdir -p docs
	@cp -Rv "_build/default/_doc/_html/"*.js docs/
	@cp -Rv "_build/default/_doc/_html/"*.css docs/
	@cp -Rv "_build/default/_doc/_html/excmd" docs/

scripts/annotateMenhirTypes.bs.js:
	# FIXME: I should be able to massage `bsb` into doing this, but ...
	bsc -bs-suffix scripts/annotateMenhirTypes.ml

.PHONY: clean-all
clean-all: clean
	rm -f src/uAX31.ml
	rm -f pkg/ucd.nounihan.grouped.*

.PHONY: clean
clean:
	rm -f src/tokens.*
	rm -f src/menhirLib.ml*
	rm -f src/parserAutomaton.ml src/parserAutomaton.mli
	rm -rf _build/
	rm -rf lib/
	./node_modules/.bin/bsb -clean-world

FORMAT_MANIFEST = $(shell find . \
	-path './_build' -prune -o -path './_opam' -prune -o -path './node_modules' -prune -o \
	-type f \( -name '*.ml' -or -name '*.mli' \) \
	! -name 'uAX31.ml' ! -name 'parserAutomaton.ml' ! -name 'lexer.ml' \
	! -name 'tokens.*' ! -name 'menhirLib.ml' -print)

INDEX_MANIFEST = $(shell git ls-files $(FORMAT_MANIFEST))

.PHONY: format-ml
format-ml:
	@(command -v ocamlformat ocp-indent >/dev/null 2>&1) || ( \
	   echo "Unfortunately, both `ocamlformat` and `ocp-indent` are required to reformat ML." && \
	   echo "Worse, neither of these can be successfully installed on a BuckleScript-" && \
	   echo "compatible version of OCaml. You'll have to install these manually, and globally," && \
	   echo "if you want to auto-reformat ML." && exit 1 \
	)
	ocamlformat --enable-outside-detected-project \
		--ocp-indent-config --ocp-indent-compat --wrap-comments --inplace $(INDEX_MANIFEST)
	ocp-indent --inplace $(INDEX_MANIFEST)
