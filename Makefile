# pass in PARENTHTML=filename.html
run: merged-PDF

merged-PDF: compressed-PDF link-coords
	@python3 merged-PDF.py links.json.tmp

compressed-PDF: children-PDF parent-PDF
	@python3 compressed-PDF.py links.json.tmp

link-coords: parent-PDF
	@python3 link-coords.py links.json.tmp

children-PDF: parent-PDF
	@nodejs children-PDF.js links.json.tmp

parent-PDF:
	@nodejs parent-PDF.js $(PARENTHTML)

clean:
	@rm -f *.pdf
	@rm -f links.json.tmp