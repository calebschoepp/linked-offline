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

  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      "Content-type": "application/pdf"
    },
    body: pdfStream.toString("base64")
  };
};
