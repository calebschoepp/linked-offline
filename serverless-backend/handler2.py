def test(event, context):
    print(event)
    response = {
        "statusCode": 200,
        "body": "it worked"
    }
    return response