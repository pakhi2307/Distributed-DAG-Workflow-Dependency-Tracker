const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/register');
  
  // Wait for the button with text "Join Organization"
  await page.waitForXPath("//button[contains(text(), 'Join Organization')]");
  
  // Get the button and click it
  const [button] = await page.$x("//button[contains(text(), 'Join Organization')]");
  if (button) {
    console.log("Clicking button...");
    await button.click();
    
    // Wait a bit for React to re-render
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if the form now contains "Invite Code" input
    const [inviteInput] = await page.$x("//label[contains(text(), 'Invite Code')]");
    if (inviteInput) {
      console.log("SUCCESS: Mode switched to JOIN, Invite Code input is visible.");
    } else {
      console.log("FAILURE: Mode did NOT switch to JOIN.");
    }
  } else {
    console.log("FAILURE: Button not found.");
  }
  
  await browser.close();
})();
