const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tr"));
      return rows.map((row) => {
        const cols = row.querySelectorAll("td");
        return {
          course: cols[0]?.innerText.trim() || null,
          duration: cols[1]?.innerText.trim() || null,
          eligibility: cols[2]?.innerText.trim() || null
        };
      }).filter(row => row.course); // remove header/empty rows
    });

    await browser.close();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper server running on port ${PORT}`);
});
