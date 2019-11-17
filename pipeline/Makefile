# pass in PARENTHTML=filename.html
run: merged-PDF

merged-PDF: children-PDF parent-PDF link-coords
	@python3 merged-PDF.py links.json.tmp

link-coords: parent-PDF
	@python3 link-coords.py links.json.tmp

children-PDF: parent-PDF
	@nodejs children-PDF.js links.json.tmp

parent-PDF:
	@nodejs parent-PDF.js $(PARENTHTML)