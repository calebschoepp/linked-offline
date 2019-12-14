import PyPDF4
import fitz
import boto3

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