# IG Follower Checker

A privacy-first Instagram follower analysis tool. Upload your Instagram data export to discover:

- **Mutual followers** — people who follow you and you follow back
- **Don't follow back** — people you follow who don't follow you
- **You don't follow** — people who follow you but you don't follow

## Privacy

All processing happens **100% in your browser**. No data is sent to any server. The Python backend only serves the HTML page — the actual JSON parsing and analysis runs entirely client-side in JavaScript.

## How to Get Your Instagram Data

1. Open Instagram → **Settings & Privacy** → **Accounts Center** → **Your information and permissions**
2. Select **Download your information** → **Download or transfer information**
3. Select your Instagram account, choose **Some of your information**, then check **Followers and Following**
4. Choose **Download to device**, set format to **JSON**, click **Create files**
5. Once ready, download the zip and extract it

You'll find files like `followers_1.json` and `following.json` in the extracted folder.

## Setup & Run

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Then open **http://localhost:5000** in your browser.

## File Structure

```
├── app.py              # Flask backend (serves the page)
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── templates/
    └── index.html      # Full frontend (HTML + CSS + JS)
```
