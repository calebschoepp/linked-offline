"use strict";

module.exports.parseEmail = async event => {
  let body;
  if (event.body) {
    body = JSON.parse(event.body);
  } else {
    console.error("No body to parse");
    return {
      statusCode: 400,
      body: "Event had no body"
    };
  }

  if (!body.strippedHTML) {
    return {
      statusCode: 400,
      body: "Body has no strippedHTML"
    };
  }
  const cheerio = require("cheerio");
  const $ = cheerio.load(body.strippedHTML);
  let links = $("a");
  $(links).each(function(i, link) {
    console.log($(link).text() + ":\n  " + $(link).attr("href"));
  });

  return {
    statusCode: 200,
    body: "Well done Caleb"
  };
};

module.exports.urlToPdf = async event => {
  const chromium = require("chrome-aws-lambda");
  const puppeteer = require("puppeteer-core");
  const AWS = require("aws-sdk");
  const S3 = new AWS.S3();

  const bucket = "url-pdfs";
  const OBJECTKEY = "test.pdf";

  const executablePath = event.isOffline
    ? "/home/caleb/linked-offline/test-pipeline/node_modules/puppeteer/.local-chromium/linux-706915/chrome-linux/chrome"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  await page.goto("https://www.render.com", {
    waitUntil: ["networkidle0", "load", "domcontentloaded"]
  });

  const pdfStream = await page.pdf();

  console.log("Stream generated");

  try {
    const S3Reponse = await S3.putObject({
      Body: pdfStream,
      Bucket: bucket,
      ContentType: "application/pdf",
      Key: OBJECTKEY
    }).promise();
    console.log(S3Reponse);
    return {
      statusCode: 200,
      body: "Object successfully posted"
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: "Error in posting object"
    };
  }
};
