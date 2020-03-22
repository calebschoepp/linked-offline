from PyPDF4 import PdfFileReader, PdfFileWriter
import fitz
import boto3

import hashlib

def handler(event, context):
    # Extract links and S3 URI's for PDF's from step function input
    print("Extracting URIs")
    html_pdf_uri = event['htmlPdfUri'] + '.pdf'
    url_pdf_uris = [x + '.pdf' for x in event['urlPdfUris']]
    links = event['links']

    # Prep S3 buckets and client
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
    for i, url_pdf_uri in enumerate(url_pdf_uris):
        url_pdf_obj = s3_client.get_object(Bucket=url_bucket, Key=url_pdf_uri)
        url_pdf_bytes = url_pdf_obj['Body'].read()
        url_pdf_filename = f"/tmp/url_pdf_file_{i}.pdf"
        add_to_links(links, {
            'url_pdf_filename': url_pdf_filename,
            'url_pdf_uri': url_pdf_uri
        })
        with open(url_pdf_filename, 'w+b') as f_obj:
            f_obj.write(url_pdf_bytes)

    print(links)

    # Find root coordinates of where to place links
    print("Finding link coordinates")
    find_links("/tmp/html_pdf_file.pdf", links)
    
    print(links)

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
    for link in links:
        pdf_reader = PdfFileReader(link['url_pdf_filename'])
        
        link["pg_to"] = page_count
        page_count += pdf_reader.getNumPages()

        for page in range(pdf_reader.getNumPages()):
            pdf_writer.addPage(pdf_reader.getPage(page))

    pdf_writer.removeLinks()

    # Add links to the PDF
    print("Linking links")
    for link in links:
        try:
            add_link(pdf_writer,
                link["pg_num"],
                link["pg_to"],
                link["coords"],
                height,
                width,
                True)
        except:
            print("Failed to add a link for {}".format(link))

    # Save the PDF to file
    print("Saving merged pdf to S3")
    with open("/tmp/merged-pdf.pdf", 'wb') as out:
        pdf_writer.write(out)
    
    # Upload the PDF to S3
    with open("/tmp/merged-pdf.pdf", "rb") as pdf:
        s3_client.put_object(Bucket=merged_bucket, Key="1.pdf", Body=pdf)
    return {
        'status': 201,
        'message': "created"
    }

def add_to_links(links, url_pdf_obj):
    for i, link in enumerate(links):
        print(f"--i:{i} link:{link}")
        if md5_hash(link['href']) == url_pdf_obj['url_pdf_uri']:
            print(links)
            links[i]['url_pdf_uri'] = url_pdf_obj['url_pdf_uri']
            links[i]['url_pdf_filename'] = url_pdf_obj['url_pdf_filename']
            print(links)
            return

def md5_hash(s):
    return hashlib.md5(s.encode()).hexdigest()

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

def find_links(parent_pdf, links):
    doc = fitz.open(parent_pdf)
    
    visited = set()
    for link in links:
        page_num = 0
        for page in doc:
            coords = page.searchFor(link['text'])
            valid_coords = find_valid_coords(visited, coords)
            if not valid_coords:
                page_num += 1
                continue

            link["pg_num"] = page_num
            link["coords"] = {
                    "x0": round(valid_coords.x0),
                    "y0": round(valid_coords.y0),
                    "x1": round(valid_coords.x1),
                    "y1": round(valid_coords.y1)
                }
            break

def find_valid_coords(visited, coords):
    if not coords:
        return None
    for coord in coords:
        if not coord in visited:
            visited.add(coord)
            return coord
    return None
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