import PyPDF4
import fitz
import boto3

def handler(event, context):
    # Extract links and S3 URI's for PDF's from step function input
    print("Extracting URIs")
    html_pdf_uri = event['htmlPdfUri'] + '.pdf'
    url_pdf_uris = [x + '.pdf' for x in event['urlPdfUris']]
    links = event['links']

    # Download the PDF's from S3 into buffer
    s3_client = boto3.client('s3')
    html_bucket = "html-pdfs"
    url_bucket = "url-pdfs"

    print("Downloading HTML PDF")
    html_pdf_obj = s3_client.get_object(Bucket=html_bucket, Key=html_pdf_uri)
    html_pdf = html_pdf_obj['Body'].read()

    print("Downloading URL PDFs")
    url_pdfs = []
    for url_pdf_uri in url_pdf_uris:
        url_pdf_obj = s3_client.get_object(Bucket=url_bucket, Key=url_pdf_uri)
        url_pdfs.append(url_pdf_obj['Body'].read())
    
    # Add the PDF's to the merger object
    pdf_writer = PdfFileWriter()

    # Starting with the html pdf
    print("Merging in HTML PDF")
    pdf_reader = PdfFileReader(html_pdf)
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

    # Add links to the PDF
    for link in links:
        add_link(pdf_writer,
                link_info["pgNum"],
                link_info["pgTo"],
                link_info["coords"],
                parent_height,
                parent_width,
                True)

    # Save the PDF to S3
    pass

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