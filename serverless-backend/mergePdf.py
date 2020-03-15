from PyPDF4 import PdfFileReader, PdfFileWriter
import fitz
import boto3

def handler(event, context):
    # Extract links and S3 URI's for PDF's from step function input
    print("Extracting URIs")
    html_pdf_uri = event['htmlPdfUri'] + '.pdf'
    url_pdf_uris = [x + '.pdf' for x in event['urlPdfUris']]
    links = event['links']

    # Prep S3 stuff
    s3_client = boto3.client('s3')
    html_bucket = "html-pdfs"
    url_bucket = "url-pdfs"
    merged_bucket = "merged-pdfs"

    # Download the PDF's from S3 into buffer then into file
    # TODO remove write to file
    print("Downloading HTML PDF")
    html_pdf_obj = s3_client.get_object(Bucket=html_bucket, Key=html_pdf_uri)
    html_pdf_bytes = html_pdf_obj['Body'].read()
    with open("/tmp/html_pdf_file.pdf", 'w+b') as f_obj:
        f_obj.write(html_pdf_bytes)

    print("Downloading URL PDFs")
    url_pdfs = []
    for i, url_pdf_uri in enumerate(url_pdf_uris):
        url_pdf_obj = s3_client.get_object(Bucket=url_bucket, Key=url_pdf_uri)
        url_pdf_bytes = url_pdf_obj['Body'].read()
        url_pdf_filename = f"/tmp/url_pdf_file_{i}.pdf"
        url_pdfs.append(url_pdf_filename)
        with open(url_pdf_filename, 'w+b') as f_obj:
            f_obj.write(url_pdf_bytes)
    
    # Add the PDF's to the merger object
    pdf_writer = PdfFileWriter()

    # Starting with the html pdf
    print("Merging in HTML PDF")
    pdf_reader = PdfFileReader("/tmp/html_pdf_file.pdf")
    height = pdf_reader.getPage(0).mediaBox[3]
    width = pdf_reader.getPage(0).mediaBox[2]
    page_count = pdf_reader.getNumPages()
    for page in range(page_count):
        pdf_writer.addPage(pdf_reader.getPage(page))

    # Now add the url pdfs
    print("Merging in URL PDFs")
    for url_pdf in url_pdfs:
        pdf_reader = PdfFileReader(url_pdf)
        # TODO track some form of "go to this page" information here
        for page in range(pdf_reader.getNumPages()):
            pdf_writer.addPage(pdf_reader.getPage(page))

    pdf_writer.removeLinks()

    # Find root coordinates of where to place links
    print("Finding link coordinates")

    # Add links to the PDF
    print("Linking links")
    for link in links:
        print("Should be adding a link here")

    # Save the PDF to S3
    print("Saving merged pdf to S3")
    with open("/tmp/merged-pdf.pdf", 'wb') as out:
        pdf_writer.write(out)
        print("--about to write to s3")
        s3_client.put_object(Bucket=merged_bucket, Key="1.pdf", Body=out)
        print("--done writing to s3")
    return {
        status: 201,
        message: "created"
    }

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
    yll2 = pg_height - 50
    xur2 = pg_width
    yur2 = pg_height

    # Add parent link
    pdf_writer.addLink(pg_from, pg_to, [xll1, yll1, xur1, yur1], border)

    # Add child back link
    pdf_writer.addLink(pg_to, pg_from, [xll2, yll2, xur2, yur2], border)

"""

Code verifying that I can use the fitz and pypdf libraries

def handler(event, context):
    s3 = boto3.resource('s3')
    pdf = s3.Object('url-pdfs','01bb31b0cb2639e7fe73c1ee5b2a7696.pdf').get()
    pdf_content = pdf['Body'].read()

    doc = fitz.open("pdf", pdf_content)
    page = doc[0]
    coords = page.searchFor('dev')

    if coords:
        response = {
            "statusCode": 200,
            "body": "good"
        }
    else:
        response = {
            "statusCode": 200,
            "body": "good"
        }
    return response
"""