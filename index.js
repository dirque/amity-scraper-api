const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const app = express();

app.use(cors());
app.use(express.json());

// Add a simple health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Amity Scraper API is running" });
});

app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  
  if (!url) return res.status(400).json({ error: "URL is required" });
  
  console.log(`Attempting to scrape: ${url}`);
  
  try {
    // Log browser launch attempt
    console.log("Launching browser...");
    
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });
    
    console.log("Browser launched successfully");
    
    const page = await browser.newPage();
    console.log(`Navigating to ${url}`);
    
    await page.goto(url, { 
      waitUntil: "networkidle2",
      timeout: 60000 // Increase timeout to 60 seconds
    });
    
    console.log("Page loaded, extracting data");
    
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr"));
      return rows.map((row) => {
        const cols = row.querySelectorAll("td");
        return {
          course: cols[0]?.innerText.trim() || null,
          duration: cols[1]?.innerText.trim() || null,
          eligibility: cols[2]?.innerText.trim() || null
        };
      }).filter(row => row.course);
    });
    
    await browser.close();
    console.log(`Scraping complete. Extracted ${data.length} items`);
    
    res.json({ success: true, data });
  } catch (err) {
    console.error("Scraping error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Scraper server running on port ${PORT}`);
});