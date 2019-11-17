import json, sys
from PyPDF4 import PdfFileReader, PdfFileWriter

def add_link(pdf_writer, pg_from, pg_to, coords, pg_height, pg_width, draw_border=False):
    if draw_border:
        border = [0, 0, 1]
    else:
        border = None
    xll1 = coords["x0"]
    yll1 = pg_height - coords["y1"]
    xur1 = coords["x1"]
    yur1 = pg_height - coords["y0"]

    xll2 = 0
    yll2 = pg_height - 30
    xur2 = pg_width
    yur2 = pg_height

    # Add parent link
    pdf_writer.addLink(pg_from, pg_to, [xll1, yll1, xur1, yur1], border)

    # Add child back link
    pdf_writer.addLink(pg_to, pg_from, [xll2, yll2, xur2, yur2], border)

def merge_pdfs(link_infos, output):
    pdf_writer = PdfFileWriter()

    # Add parent PDF
    pdf_reader = PdfFileReader("parent.pdf")
    parent_height = pdf_reader.getPage(0).mediaBox[3]
    parent_width = pdf_reader.getPage(0).mediaBox[2]
    page_count = pdf_reader.getNumPages()
    for page in range(pdf_reader.getNumPages()):
        pdf_writer.addPage(pdf_reader.getPage(page))
    
    # Add children PDFs
    bad_children = []
    for link_info in link_infos:
        try:
            pdf_reader = PdfFileReader(link_info["id"])
        except:
            bad_children.append(link_info["id"])
            continue

        link_info["pgTo"] = page_count
        page_count += pdf_reader.getNumPages()
        for page in range(pdf_reader.getNumPages()):
            # Add each page to the writer object
            pdf_writer.addPage(pdf_reader.getPage(page))

    pdf_writer.removeLinks()

    for link_info in link_infos:
        if link_info["id"] in bad_children:
            continue
        add_link(pdf_writer,
            link_info["pgNum"],
            link_info["pgTo"],
            link_info["coords"],
            parent_height,
            parent_width,
            True)

    # Write out the merged PDF
    with open(output, 'wb') as out:
        pdf_writer.write(out)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('{} Is an improper number of command line arguments'.format(len(sys.argv)))
        exit(1)

    print('Merging everything into one PDF')
    with open(sys.argv[1], 'r') as f_obj:
        link_infos = json.load(f_obj)
        merge_pdfs(link_infos, output='merged.pdf')