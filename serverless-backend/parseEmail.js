"use strict";

const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const aws = require("aws-sdk");

const middy = require("middy");
const {
  urlEncodeBodyParser,
  httpMultipartBodyParser,
  doNotWaitForEmptyEventLoop
} = require("middy/middlewares");

const normalizeContentType = () => {
  // lowercase content-type so it works with busboy
  return {
    before: (handler, next) => {
      if (handler.event.headers["Content-Type"]) {
        handler.event.headers["content-type"] =
          handler.event.headers["Content-Type"];
      }
      next();
    }
  };
};

const parseEmail = async event => {
  // Core business logic for email parsing
  if (!event.body["stripped-html"]) {
    return {
      statusCode: 400,
      body: "Missing stripped-html attribute"
    };
  }
  const html = event.body["stripped-html"];

  const executablePath = event.isOffline
    ? "/home/caleb/linked-offline/test-pipeline/node_modules/puppeteer/.local-chromium/linux-706915/chrome-linux/chrome"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: ["load", "domcontentloaded", "networkidle2"]
  });

  let links = await page.$$eval("a", as =>
    as.map(a => {
      return {
        href: a.href,
        text: a.textContent
      };
    })
  );

  // TODO: add unique name to call to step function
  const params = {
    stateMachineArn: process.env.statemachine_arn,
    input: JSON.stringify({ html, links })
  };

  console.log(JSON.stringify({ html, links }));

  const stepfunctions = new aws.StepFunctions();
  stepfunctions.startExecution(params, function(err, data) {
    if (err) {
      console.log("err while executing step function");
      return {
        statusCode: 500,
        body: "Process has failed to start"
      };
    } else {
      console.log("started execution of step function");
      return {
        statusCode: 200,
        body: "Process has started"
      };
    }
  });
};

const handler = middy(parseEmail);

handler
  .use(normalizeContentType())
  .use(doNotWaitForEmptyEventLoop())
  .use(httpMultipartBodyParser())
  .use(urlEncodeBodyParser());
module.exports = { handler };
