const {exec} = require("child_process");
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const puppeteer = require("puppeteer"); // ^24.20.0
const {setTimeout} = require("node:timers/promises");

const chromePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debuggingPort = 9223;
const userDataDir = "/tmp/puppeteer-profile";

let browser;
(async () => {
  // The below could more generally use: open -a "Google Chrome" --args \
  const cmd = `"${chromePath}" \
    --remote-debugging-port=${debuggingPort} \
    --user-data-dir="${userDataDir}" \
    --no-first-run \
    --no-default-browser-check \
    about:blank`;
  exec(cmd);
  // --headless=new \ doesn't work

  for (let i = 0; i < 100_000; i++) {
    try {
      browser = await puppeteer.connect({
        browserURL: `http://localhost:${debuggingPort}`,
      });
      break;
    } catch {
      await setTimeout(50);
    }
  }

  const page = await browser.newPage();
  await page.goto("https://www.chatgpt.com");

  for (;;) {
    const answer = await new Promise(resolve => rl.question("> ", resolve));
    const response = await page.evaluate(async (input) => {
      [...document.querySelectorAll("a")]
        .find(e => e.textContent.includes("Stay logged out"))?.click();
      document.querySelector("#prompt-textarea p").textContent = input;
      await new Promise(resolve => {
        (function poll() {
          if (!document.querySelector("#composer-submit-button")) {
            requestAnimationFrame(poll);
          }
          else {
            resolve();
          }
        })();
      });
      const submit = document.querySelector("#composer-submit-button");
      submit.click();
      await new Promise(resolve => {
        (function poll() {
          if (submit.isConnected) {
            requestAnimationFrame(poll);
          }
          else {
            resolve();
          }
        })();
      });
      await new Promise(resolve => setTimeout(resolve, 1_000));
      return [...document.querySelectorAll("article")].pop().textContent;
    }, answer);
    console.log(response);
  }
})()
  .catch(err => console.error(err))
  //.finally(() => browser?.close());

