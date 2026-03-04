# IG Follower Checker

A privacy-first Instagram follower analysis tool. Upload your Instagram data export to discover:

- **Mutual followers** — people who follow you and you follow back
- **Don't follow back** — people you follow who don't follow you
- **You don't follow** — people who follow you but you don't follow

## Features

- **Follower analysis** — Instantly compare your followers and following lists
- **Account tagging** — Tag accounts as Deactivated, Spam, Bot, Brand, Close Friend, Celebrity, or create your own custom tags
- **Tag filtering** — Filter any list by tag to quickly see all accounts you've marked
- **Auto-save** — Your session (results + tags) automatically saves in your browser
- **Export / Import** — Save your data as a JSON file with a native "Save As" dialog (Chrome/Edge), or load a previous save to pick up where you left off
- **Search** — Filter any list by username
- **Copy list** — One-click copy of all usernames in the current view
- **Direct links** — Open any profile on Instagram with one click

## Privacy

All processing happens **100% in your browser**. No data is sent to any server. The Python backend only serves the HTML page — the actual JSON parsing, analysis, tagging, and saving all run entirely client-side in JavaScript.

## How to Get Your Instagram Data

1. Open Instagram → **Settings & Privacy** → **Accounts Center** → **Your information and permissions**
2. Select **Download your information** → **Download or transfer information**
3. Select your Instagram account, choose **Some of your information**, then check **Followers and Following**
4. Choose **Download to device**, set format to **JSON**, click **Create files**
5. Once ready, download the zip and extract it

You'll find files like `followers_1.json` and `following.json` in the extracted folder.

## Setup & Run

```bash
pip3 install -r requirements.txt
python3 app.py
```

Then open **http://localhost:8080** in your browser.

## File Structure

```
ig-follower-checker/
├── app.py                  # Flask backend (serves the page)
├── requirements.txt        # Python dependencies
├── README.md               # This file
├── static/
│   ├── style.css           # Styles
│   └── app.js              # Application logic
└── templates/
    └── index.html          # Page markup
```

## Notes

- The follower/following counts from the export may differ slightly from what Instagram shows in the app. This is because the export can include deactivated or deleted accounts. You can use the tagging feature to mark these as you find them.
- Save files are portable — export on one device, import on another.
