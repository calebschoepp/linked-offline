"use strict";

const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const crypto = require("crypto");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const AWS = require("aws-sdk");
const S3 = new AWS.S3();

module.exports.handler = async event => {
  const bucket = "url-pdfs";

  const url = "https://dev.to";
  const urlHash = crypto
    .createHash("md5")
    .update(url)
    .digest("hex");
  const filename = urlHash + ".pdf";
  const filepath = "/tmp/" + filename;
  const compressedFilepath = filepath + ".comp";

  // Generate PDF stream
  const executablePath = event.isOffline
    ? "/home/caleb/linked-offline/test-pipeline/node_modules/puppeteer/.local-chromium/linux-706915/chrome-linux/chrome"
    : await chromium.executablePath;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: ["networkidle0", "load", "domcontentloaded"]
  });

  const pdfStream = await page.pdf();
  console.log("Stream generated");

  // Write PDF stream to /tmp
  await new Promise(resolve => {
    let writeStream = fs.createWriteStream(filepath);
    writeStream.write(pdfStream);
    writeStream.on("finish", () => {
      console.log("Success writing file");
      resolve();
    });
    writeStream.end();
  });

  // Optimize PDF file with Ghostscript
  console.log(process.env.IS_LOCAL);
  let gsPath = process.env.IS_LOCAL
    ? "/home/caleb/linked-offline/serverless-backend/bin/gs"
    : process.env.LAMBDA_TASK_ROOT + "/bin/gs";
  console.log(gsPath);
  if (process.env.LAMBDA_TASK_ROOT) {
    process.env.PATH = `${process.env.PATH}:${process.env.LAMBDA_TASK_ROOT}/bin`;
  }
  const args = [
    gsPath,
    "-sDEVICE=pdfwrite",
    "-dPDFSETTINGS=/screen",
    "-dCompatibilityLevel=1.4",
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    "-sOutputFile=" + compressedFilepath,
    filepath
  ];
  await exec(args.join(" "));

  // Load PDF file into stream
  const optimizedPdfStream = fs.readFileSync(compressedFilepath);

  // Upload PDF to S3
  console.log("Uploading file to S3");
  try {
    const S3Reponse = await S3.putObject({
      Body: optimizedPdfStream,
      Bucket: bucket,
      ContentType: "application/pdf",
      Key: filename
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
