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
      const textarea = document.querySelector("#mobile-composer-prompt");
      textarea.focus();
      textarea.value = input;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));

      await new Promise(resolve => {
        (function poll() {
          if (document.querySelector('[aria-label="Stop generating"]')) {
            resolve();
          }
          else {
            requestAnimationFrame(poll);
          }
        })();
      });
      await new Promise(resolve => {
        (function poll() {
          if (document.querySelector('[aria-label="Stop generating"]')) {
            requestAnimationFrame(poll);
          }
          else {
            resolve();
          }
        })();
      });

      const response = [...document.querySelectorAll('[data-assistant-markdown]')].pop();
      return response?.innerText;
    }, answer);
    console.log(response);
  }
})()
  .catch(err => console.error(err))
  //.finally(() => browser?.close());

