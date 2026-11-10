# Decentblup's Canvas Glowup

A userscript that gives Canvas a cleaner, faster, rounder look, with keyboard control if you want it. It was built for UBC and works on other schools' Canvas too.

- **Course shortcuts in the sidebar.** Every course is one click away. Pin your favourites to the top.
- **Course tabs in a top bar.** Home, Modules, Assignments and the rest sit in a floating bar, with the course name on the left.
- **Floating, rounded UI.** The sidebar, top bar, side panel, cards, buttons and file previews are all rounded and match each other.
- **Themes.** Choose Auto, Light, Dark, **Comfy** (plum and pink), or make your own with **Custom** colours. Dark mode can darken Canvas itself, so you don't need Dark Reader.
- **Card layouts.** Assignment groups and modules sit side by side. Announcements and other pages get tidy rounded cards. Click anywhere on a row to open it.
- **Smooth motion.** A highlight follows your mouse and keyboard. Switching pages shows a soft zoom-and-blur with a loading animation.
- **Vim keys.** Move with `h j k l`, click anything with `f`, switch courses with `⇧1`–`⇧9`. Every shortcut can be changed.
- **Little fixes.** Compact file pages, no Immersive Reader button, a tidier course home, and the Halyard font from oryzo.ai (or a free lookalike).

Every feature has its own switch, and a master switch turns everything off in one go.

---

## Setup

### 1. Install Tampermonkey

Tampermonkey is a free browser extension that runs userscripts like this one.

| Browser | Get it |
|---|---|
| Chrome | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari | [tampermonkey.net](https://www.tampermonkey.net/?browser=safari) (links to the App Store) |

You can also go to [tampermonkey.net](https://www.tampermonkey.net/), which links the right one for your browser.

### 2. Let Tampermonkey run scripts (Chrome and Edge only)

Chrome and Edge now block extensions from running userscripts until you allow it. Skip this step on Firefox or Safari.

1. Right-click the Tampermonkey icon in your toolbar and choose **Manage extension**. You can also open `chrome://extensions` (or `edge://extensions`) and click **Details** under Tampermonkey.
2. Turn on **Allow User Scripts**.
3. On older versions, before Chrome 138, there's no such toggle. Turn on **Developer mode** in the top-right corner of the extensions page instead.

If the script ever seems to "do nothing", this setting is the usual cause.

### 3. Install the script

Click this link:

**➜ [Install Canvas Glowup](https://raw.githubusercontent.com/Decentblup/decentblups-canvas-reskin/main/canvas-glowup.user.js)**

Tampermonkey opens an install page. Click **Install**.

> **Manual install.** Open the Tampermonkey dashboard, click the **+** tab to create a new script, delete the template, and paste in the contents of [`canvas-glowup.user.js`](canvas-glowup.user.js). Then press **Ctrl+S** (or **⌘S** on a Mac) to save.

### 4. Open Canvas

Go to your school's Canvas (e.g. [canvas.ubc.ca](https://canvas.ubc.ca)) and refresh. You should see your courses in the left bar and a ⚙️ **gear** near the bottom of it.

If nothing changes, your school may use its own Canvas address. See [Other schools](#other-schools) below.

### Updates

If you installed from the link in step 3, Tampermonkey checks this repo for new versions automatically. To check now, open the Tampermonkey dashboard and choose **Utilities → Check for userscript updates**. Your settings, theme, pinned courses and custom keys carry over.

> **Upgrading from "Canvas Course Sidebar"?** That was this script's old name. Tampermonkey treats the renamed version as a separate script, so delete the old one in the dashboard so they don't both run. Your settings are kept.

---

## Using it

### The gear menu

Click the ⚙️ gear in the left bar, or press `,` if Vim keys are on.

- **Master switch:** next to the title. It turns everything off and gives you plain Canvas. The gear stays so you can turn it back on.
- **Appearance:**
  - theme
  - dark Canvas pages
  - theme-coloured links and buttons
  - the Halyard font
- **Layout:**
  - course shortcuts
  - top bar tabs
  - compact file pages
  - floating sidebar
  - floating side panel
  - rounded sections
- **Cleanup:**
  - tidy course home
  - hide Immersive Reader
  - turn off Canvas's animations
- **Keyboard:**
  - Vim keys
  - **Customize keys**

Changes save automatically. Some layout changes rebuild the page, so a **Reload to apply** button appears when you change them.

### Themes

| Theme | Looks like |
|---|---|
| Auto | Follows your computer's light/dark setting |
| Light | Soft light grey (a little dimmer than Canvas's bright white) |
| Dark | Charcoal |
| Comfy | Plum `#241015` / `#49292f` / `#5e3640` with pink `#ffc7d4` |
| Custom | Your own **Background**, **Panels**, **Raised**, **Accent** and **Text** colours, picked right in the menu |

With **Dark Canvas pages** on, a dark theme also darkens Canvas's own pages. Photos, videos and embedded tools keep their real colours. The script also tells Dark Reader to leave Canvas alone, so nothing is darkened twice.

### Pinning courses

Hover over a course in the sidebar and click the 📌 pin. Pinned courses go to the top under **Pinned**.

### Keyboard shortcuts (Vim keys)

Press `?` to see the keys for things on screen, and press `?` again for the full list. Keys are ignored while you're typing in a text box. Press `Esc` to leave a text box.

| Keys | What it does |
|---|---|
| `j` / `k` | Next / previous item on the page (rows, cards, headings) |
| `h` / `l` | Item to the left / right (e.g. the next card over) |
| `Enter` | Open the highlighted item |
| `s` / `w` | Half page down / up |
| `ss` / `ww` | Bottom / top of the page |
| `f` / `F` | Link hints: letters appear on everything clickable, so type one to click it (`F` opens in a new tab) |
| `gd` `gh` `gm` `ga` `gr` `gf` | Dashboard, course home, modules, assignments, grades, files |
| `gi` / `gc` | Inbox / Calendar |
| `n` / `N` | Next / previous module item |
| `[` / `]` | Back / forward |
| `r` | Reload |
| `p` | Show / hide the side panel |
| `T` | Switch between light and dark |
| `,` | Settings |
| `yy` | Copy the page link |
| `?` | Key hints (press twice for the full list) |
| `⇧1` – `⇧9` | Jump to course 1–9 in the sidebar |
| Hold `⇧`, tap `H` / `L` | Pick a tab in the top bar, then let go of `⇧` to open it |
| Hold `⇧`, tap `J` / `K` | Pick an item in the sidebar, then let go of `⇧` to open it |
| `Esc` | Cancel / close / leave a text box |

**Change any key** under **Gear → Keyboard → Customize keys**. Click a shortcut, type the new keys, and that's it. The `⇧` switching keys, `Enter` and `Esc` stay fixed.

---

## Other schools

The script works on any Canvas site. Every school runs the same Canvas software, so nothing in it is UBC-specific. Out of the box it runs on:

- `canvas.ubc.ca`
- any `*.instructure.com` address (e.g. `yourschool.instructure.com`), which is what many schools use

If your school uses its own address (like `canvas.yourschool.edu` or `learn.yourschool.ca`), add it in Tampermonkey. This way it survives updates:

1. Open the Tampermonkey dashboard and click **Canvas Glowup**.
2. Go to the script's **Settings** tab.
3. Under **Includes/Excludes**, find **User matches**, click **Add…**, and enter your address with `/*` on the end, e.g. `https://canvas.yourschool.edu/*`.
4. Save and refresh Canvas.

> You *can* instead add a `// @match` line to the script itself, but it's lost whenever a new version installs. The Settings tab keeps it.

Course tiles in the sidebar show course numbers when codes look like `CPSC 221`. Other formats show initials instead. Schools that heavily customize Canvas may look a bit off in places. [Open an issue](https://github.com/Decentblup/decentblups-canvas-reskin/issues) with a screenshot if something breaks.

## Troubleshooting

- **Nothing changes on Canvas.** Check that **Allow User Scripts** (or Developer mode) is on (step 2). Also check that the script is enabled in the Tampermonkey dashboard. If your school's Canvas isn't at `canvas.ubc.ca` or `*.instructure.com`, add its address (see [Other schools](#other-schools)). Then refresh Canvas.
- **Pages look darkened twice or the colours are odd.** Turn off Dark Reader (or any other dark-mode extension) for Canvas and use this script's dark mode instead.
- **Something looks broken on one page.** Open the gear menu and turn features off one at a time to find the culprit, or use the master switch to get plain Canvas back instantly. Then [open an issue](https://github.com/Decentblup/decentblups-canvas-reskin/issues) with a screenshot.
- **The font didn't change.** Halyard Display is a paid Adobe font. If you have Creative Cloud, turn on "Halyard Display" at [fonts.adobe.com](https://fonts.adobe.com) and the script will use it. Otherwise it uses Instrument Sans, a similar free font.

## Uninstall

Open the Tampermonkey dashboard and delete **Canvas Glowup**. Canvas goes back to normal on the next refresh.
